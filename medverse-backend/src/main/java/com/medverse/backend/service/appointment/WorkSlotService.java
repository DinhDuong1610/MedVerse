package com.medverse.backend.service.appointment;

import com.medverse.backend.entity.User;
import com.medverse.backend.entity.WorkSlot;
import com.medverse.backend.mapper.AppointmentMapper;
import com.medverse.backend.payload.appointment.WorkSlotCreateRequest;
import com.medverse.backend.payload.appointment.WorkSlotDto;
import com.medverse.backend.repository.UserRepository;
import com.medverse.backend.repository.WorkSlotRepository;
import com.medverse.backend.service.AuditService;
import com.medverse.backend.utils.enumeration.WorkSlotStatus;
import com.medverse.backend.utils.exception.DuplicateResourceException;
import com.medverse.backend.utils.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class WorkSlotService {

        private final WorkSlotRepository workSlotRepository;
        private final UserRepository userRepository;
        private final AppointmentMapper appointmentMapper;
        private final AuditService auditService;

        @Transactional
        public WorkSlotDto createSlot(UUID doctorId, WorkSlotCreateRequest request) {
                log.info("Creating work slot for doctor ID: {}", doctorId);

                User doctor = userRepository.findById(doctorId)
                                .orElseThrow(() -> new ResourceNotFoundException("Doctor", "id", doctorId));

                boolean isOverlapping = workSlotRepository.existsOverlappingSlot(
                                doctorId, request.getStartTime(), request.getEndTime());

                if (isOverlapping) {
                        throw new DuplicateResourceException("WorkSlot", "time_range",
                                        request.getStartTime() + " - " + request.getEndTime());
                }

                WorkSlot workSlot = WorkSlot.builder()
                                .doctor(doctor)
                                .startTime(request.getStartTime())
                                .endTime(request.getEndTime())
                                .status(WorkSlotStatus.AVAILABLE)
                                .isRecurring(false)
                                .build();

                WorkSlot savedSlot = workSlotRepository.save(workSlot);

                auditService.record(
                                "CREATE_WORK_SLOT",
                                "WORK_SLOT",
                                savedSlot.getId().toString(),
                                "Doctor " + doctorId + " created slot from "
                                                + savedSlot.getStartTime() + " to " + savedSlot.getEndTime());

                return appointmentMapper.toDto(savedSlot);
        }

        public List<WorkSlotDto> getSlotsByDoctor(UUID doctorId, OffsetDateTime from, OffsetDateTime to) {
                return workSlotRepository.findByDoctorIdAndStartTimeBetweenOrderByStartTimeAsc(doctorId, from, to)
                                .stream()
                                .map(appointmentMapper::toDto)
                                .collect(Collectors.toList());
        }

        public List<WorkSlotDto> getAvailableSlots(UUID doctorId) {
                return workSlotRepository.findByDoctorIdAndStatusAndStartTimeAfterOrderByStartTimeAsc(
                                doctorId, WorkSlotStatus.AVAILABLE, OffsetDateTime.now())
                                .stream()
                                .map(appointmentMapper::toDto)
                                .collect(Collectors.toList());
        }

        @Transactional
        public void deleteSlot(UUID slotId, UUID doctorId) {
                WorkSlot slot = workSlotRepository.findById(slotId)
                                .orElseThrow(() -> new ResourceNotFoundException("WorkSlot", "id", slotId));

                if (!slot.getDoctor().getId().equals(doctorId)) {
                        throw new IllegalStateException("You are not authorized to delete this slot.");
                }

                if (slot.getStatus() == WorkSlotStatus.BOOKED) {
                        throw new IllegalStateException(
                                        "Cannot delete a slot that is already BOOKED. Cancel the appointment first.");
                }

                workSlotRepository.delete(slot);

                auditService.record(
                                "DELETE_WORK_SLOT",
                                "WORK_SLOT",
                                slotId.toString(),
                                "Doctor " + doctorId + " deleted available work slot");
        }
}