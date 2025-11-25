package com.medverse.backend.service.appointment;

import com.medverse.backend.entity.Appointment;
import com.medverse.backend.entity.AppointmentRequest;
import com.medverse.backend.entity.WorkSlot;
import com.medverse.backend.mapper.AppointmentMapper;
import com.medverse.backend.payload.appointment.AppointmentDto;
import com.medverse.backend.repository.AppointmentRepository;
import com.medverse.backend.repository.AppointmentRequestRepository;
import com.medverse.backend.repository.WorkSlotRepository;
import com.medverse.backend.service.AuditService;
import com.medverse.backend.utils.enumeration.AppointmentRequestStatus;
import com.medverse.backend.utils.enumeration.AppointmentStatus;
import com.medverse.backend.utils.enumeration.WorkSlotStatus;
import com.medverse.backend.utils.exception.DuplicateResourceException;
import com.medverse.backend.utils.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AppointmentService {

    private final AppointmentRepository appointmentRepository;
    private final AppointmentRequestRepository requestRepository;
    private final WorkSlotRepository workSlotRepository;
    private final AppointmentMapper appointmentMapper;
    private final AuditService auditService;

    public AppointmentDto getAppointmentById(UUID id) {
        Appointment appointment = appointmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Appointment", "id", id));
        return appointmentMapper.toDto(appointment);
    }

    public Page<AppointmentDto> searchAppointments(
            UUID doctorId, UUID patientId, AppointmentStatus status,
            OffsetDateTime from, OffsetDateTime to, Pageable pageable) {

        return appointmentRepository.searchAppointments(doctorId, patientId, status, from, to, pageable)
                .map(appointmentMapper::toDto);
    }

    @Transactional
    public AppointmentDto createAppointmentFromRequest(UUID requestId, UUID workSlotId) {
        log.info("Approving request {} with slot {}", requestId, workSlotId);

        AppointmentRequest request = requestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Request", "id", requestId));

        WorkSlot slot = workSlotRepository.findById(workSlotId)
                .orElseThrow(() -> new ResourceNotFoundException("WorkSlot", "id", workSlotId));

        if (request.getStatus() != AppointmentRequestStatus.PENDING) {
            throw new IllegalStateException("Request is already processed.");
        }
        if (slot.getStatus() != WorkSlotStatus.AVAILABLE) {
            throw new DuplicateResourceException("WorkSlot", "status", "Slot is already booked or blocked.");
        }

        if (request.getDoctor() != null && !request.getDoctor().getId().equals(slot.getDoctor().getId())) {
            throw new IllegalArgumentException("Selected slot does not belong to the requested doctor.");
        }

        boolean isOverlapping = appointmentRepository.existsOverlappingAppointment(
                slot.getDoctor().getId(), slot.getStartTime(), slot.getEndTime());
        if (isOverlapping) {
            throw new DuplicateResourceException("Appointment", "time",
                    "Doctor already has an appointment at this time.");
        }

        request.setStatus(AppointmentRequestStatus.APPROVED);
        request.setDoctor(slot.getDoctor());
        requestRepository.save(request);

        slot.setStatus(WorkSlotStatus.BOOKED);
        workSlotRepository.save(slot);

        Appointment appointment = Appointment.builder()
                .patient(request.getPatient())
                .doctor(slot.getDoctor())
                .request(request)
                .workSlot(slot)
                .startTime(slot.getStartTime())
                .endTime(slot.getEndTime())
                .status(AppointmentStatus.SCHEDULED)
                .type(request.getType())
                .build();

        Appointment savedAppointment = appointmentRepository.save(appointment);

        // auditService.record("APPROVE_APPOINTMENT", "APPOINTMENT",
        // savedAppointment.getId().toString(),
        // "Approved request " + requestId);

        return appointmentMapper.toDto(savedAppointment);
    }

    @Transactional
    public void cancelAppointment(UUID appointmentId, String reason) {
        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Appointment", "id", appointmentId));

        if (appointment.getStatus() == AppointmentStatus.CANCELLED
                || appointment.getStatus() == AppointmentStatus.COMPLETED) {
            throw new IllegalStateException("Cannot cancel an appointment that is already completed or cancelled.");
        }

        appointment.setStatus(AppointmentStatus.CANCELLED);
        appointment.setCancellationReason(reason);
        appointmentRepository.save(appointment);

        if (appointment.getWorkSlot() != null) {
            WorkSlot slot = appointment.getWorkSlot();
            slot.setStatus(WorkSlotStatus.AVAILABLE);
            workSlotRepository.save(slot);
        }

        // auditService.record("CANCEL_APPOINTMENT", "APPOINTMENT",
        // appointmentId.toString(), "Reason: " + reason);
    }

    @Transactional
    public void markNoShow(UUID appointmentId) {
        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Appointment", "id", appointmentId));

        appointment.setStatus(AppointmentStatus.NO_SHOW);
        appointmentRepository.save(appointment);

        // auditService.record("MARK_NO_SHOW", "APPOINTMENT", appointmentId.toString(),
        // "Patient did not show up");
    }

    @Transactional
    public AppointmentDto rescheduleAppointment(UUID appointmentId, UUID newWorkSlotId) {
        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Appointment", "id", appointmentId));

        if (appointment.getStatus() == AppointmentStatus.CANCELLED
                || appointment.getStatus() == AppointmentStatus.COMPLETED) {
            throw new IllegalStateException("Cannot reschedule a finished or cancelled appointment.");
        }

        WorkSlot newSlot = workSlotRepository.findById(newWorkSlotId)
                .orElseThrow(() -> new ResourceNotFoundException("WorkSlot", "id", newWorkSlotId));

        if (newSlot.getStatus() != WorkSlotStatus.AVAILABLE) {
            throw new DuplicateResourceException("WorkSlot", "status", "The new slot is not available.");
        }

        if (appointment.getWorkSlot() != null) {
            WorkSlot oldSlot = appointment.getWorkSlot();
            oldSlot.setStatus(WorkSlotStatus.AVAILABLE);
            workSlotRepository.save(oldSlot);
        }

        newSlot.setStatus(WorkSlotStatus.BOOKED);
        workSlotRepository.save(newSlot);

        appointment.setDoctor(newSlot.getDoctor());
        appointment.setWorkSlot(newSlot);
        appointment.setStartTime(newSlot.getStartTime());
        appointment.setEndTime(newSlot.getEndTime());

        if (appointment.getStatus() == AppointmentStatus.SCHEDULED) {
            appointment.setStatus(AppointmentStatus.CONFIRMED);
        }

        Appointment updatedAppointment = appointmentRepository.save(appointment);

        // auditService.record("RESCHEDULE_APPOINTMENT", "APPOINTMENT",
        // appointmentId.toString(),
        // "Rescheduled to new slot: " + newWorkSlotId);

        return appointmentMapper.toDto(updatedAppointment);
    }
}