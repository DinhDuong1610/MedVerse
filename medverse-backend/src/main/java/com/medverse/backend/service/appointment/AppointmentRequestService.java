package com.medverse.backend.service.appointment;

import com.medverse.backend.entity.AppointmentRequest;
import com.medverse.backend.entity.DoctorProfile;
import com.medverse.backend.entity.Specialty;
import com.medverse.backend.entity.User;
import com.medverse.backend.mapper.AppointmentMapper;
import com.medverse.backend.payload.appointment.AppointmentRequestCreateDto;
import com.medverse.backend.payload.appointment.AppointmentRequestDto;
import com.medverse.backend.repository.AppointmentRequestRepository;
import com.medverse.backend.repository.DoctorProfileRepository;
import com.medverse.backend.repository.SpecialtyRepository;
import com.medverse.backend.repository.UserRepository;
import com.medverse.backend.service.AuditService;
import com.medverse.backend.utils.enumeration.AppointmentRequestStatus;
import com.medverse.backend.utils.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.medverse.backend.service.notification.NotificationService;
import com.medverse.backend.utils.enumeration.NotificationType;

import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AppointmentRequestService {

    private final AppointmentRequestRepository requestRepository;
    private final UserRepository userRepository;
    private final DoctorProfileRepository doctorProfileRepository;
    private final SpecialtyRepository specialtyRepository;
    private final AppointmentMapper appointmentMapper;
    private final AuditService auditService;
    private final NotificationService notificationService;

    @Transactional
    public AppointmentRequestDto createRequest(UUID patientId, AppointmentRequestCreateDto dto) {
        log.info("Creating appointment request for patient ID: {}", patientId);

        User patient = userRepository.findById(patientId)
                .orElseThrow(() -> new ResourceNotFoundException("Patient", "id", patientId));

        User doctor = null;
        DoctorProfile doctorProfile = null;
        if (dto.getDoctorId() != null) {
            doctor = userRepository.findById(dto.getDoctorId())
                    .orElseThrow(() -> new ResourceNotFoundException("Doctor", "id", dto.getDoctorId()));
        }
        if (doctor != null) {
            Optional<DoctorProfile> profileOpt = doctorProfileRepository.findByUser(doctor);
            if (profileOpt.isEmpty()) {
                throw new ResourceNotFoundException("DoctorProfile", "doctorId", doctor.getId());
            }
            doctorProfile = profileOpt.get();
        }

        Specialty specialty = null;
        if (dto.getSpecialtyId() != null) {
            specialty = specialtyRepository.findById(dto.getSpecialtyId())
                    .orElseThrow(() -> new ResourceNotFoundException("Specialty", "id", dto.getSpecialtyId()));
        } else if (doctor != null && doctorProfile != null) {
            specialty = doctorProfile.getSpecialty();
        }

        if (doctor == null && specialty == null) {
            throw new IllegalArgumentException("Must select either a Doctor or a Specialty.");
        }

        AppointmentRequest request = AppointmentRequest.builder()
                .patient(patient)
                .doctor(doctor)
                .specialty(specialty)
                .desiredDate(dto.getDesiredDate())
                .desiredTime(dto.getDesiredTime())
                .type(dto.getType())
                .status(AppointmentRequestStatus.PENDING)
                .symptoms(dto.getSymptoms())
                .build();

        AppointmentRequest savedRequest = requestRepository.save(request);

        auditService.record(
                "CREATE_APPOINTMENT_REQUEST",
                "APPOINTMENT_REQUEST",
                savedRequest.getId().toString(),
                "Patient " + patientId + " requested appointment for date: " + dto.getDesiredDate());

        notificationService.notify(
                patient,
                NotificationType.APPOINTMENT_REQUEST_CREATED,
                "Đã gửi yêu cầu đặt lịch",
                "Yêu cầu đặt lịch ngày " + dto.getDesiredDate() + " đã được gửi và đang chờ lễ tân duyệt.",
                "APPOINTMENT_REQUEST",
                savedRequest.getId().toString());

        return appointmentMapper.toDto(savedRequest);

    }

    public Page<AppointmentRequestDto> getMyRequests(UUID patientId, Pageable pageable) {
        return requestRepository.findByPatientIdOrderByCreatedAtDesc(patientId, pageable)
                .map(appointmentMapper::toDto);
    }

    public Page<AppointmentRequestDto> getRequestsForReceptionist(
            AppointmentRequestStatus status, UUID specialtyId, Pageable pageable) {
        return requestRepository.findRequestsForReceptionist(status, specialtyId, pageable)
                .map(appointmentMapper::toDto);
    }

    @Transactional
    public void cancelRequest(UUID requestId, UUID patientId) {
        AppointmentRequest request = requestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Request", "id", requestId));

        if (!request.getPatient().getId().equals(patientId)) {
            throw new IllegalArgumentException("You are not authorized to cancel this request.");
        }

        if (request.getStatus() != AppointmentRequestStatus.PENDING) {
            throw new IllegalStateException("Cannot cancel request that is processed (Approved/Rejected).");
        }

        request.setStatus(AppointmentRequestStatus.CANCELLED);
        requestRepository.save(request);

        auditService.record(
                "CANCEL_APPOINTMENT_REQUEST",
                "APPOINTMENT_REQUEST",
                requestId.toString(),
                "Patient " + patientId + " cancelled appointment request");

        notificationService.notify(
                request.getPatient(),
                NotificationType.APPOINTMENT_REQUEST_CANCELLED,
                "Đã hủy yêu cầu đặt lịch",
                "Yêu cầu đặt lịch của bạn đã được hủy.",
                "APPOINTMENT_REQUEST",
                request.getId().toString());
    }

    @Transactional
    public AppointmentRequestDto rejectRequest(UUID requestId, String reason) {
        AppointmentRequest request = requestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Request", "id", requestId));

        if (request.getStatus() != AppointmentRequestStatus.PENDING) {
            throw new IllegalStateException("Request is already processed.");
        }

        request.setStatus(AppointmentRequestStatus.REJECTED);
        request.setRejectionReason(reason);
        AppointmentRequest saved = requestRepository.save(request);

        auditService.record(
                "REJECT_APPOINTMENT_REQUEST",
                "APPOINTMENT_REQUEST",
                requestId.toString(),
                "Reason: " + reason);

        notificationService.notify(
                saved.getPatient(),
                NotificationType.APPOINTMENT_REQUEST_REJECTED,
                "Yêu cầu đặt lịch bị từ chối",
                "Lý do: " + reason,
                "APPOINTMENT_REQUEST",
                saved.getId().toString());

        return appointmentMapper.toDto(saved);
    }
}