package com.medverse.backend.service.ehr;

import com.medverse.backend.entity.*;
import com.medverse.backend.payload.ehr.*;
import com.medverse.backend.repository.AppointmentRepository;
import com.medverse.backend.repository.MedicalRecordDiagnosisRepository;
import com.medverse.backend.repository.MedicalRecordRepository;
import com.medverse.backend.service.AuditService;
import com.medverse.backend.service.notification.NotificationService;
import com.medverse.backend.utils.enumeration.AppointmentStatus;
import com.medverse.backend.utils.enumeration.MedicalRecordStatus;
import com.medverse.backend.utils.enumeration.NotificationType;
import com.medverse.backend.utils.exception.DuplicateResourceException;
import com.medverse.backend.utils.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MedicalRecordService {

    private final MedicalRecordRepository medicalRecordRepository;
    private final MedicalRecordDiagnosisRepository diagnosisRepository;
    private final AppointmentRepository appointmentRepository;
    private final AuditService auditService;
    private final NotificationService notificationService;

    @Transactional
    public MedicalRecordDto createMedicalRecord(User currentUser, MedicalRecordCreateRequest request) {
        Appointment appointment = appointmentRepository.findById(request.getAppointmentId())
                .orElseThrow(() -> new ResourceNotFoundException("Appointment", "id", request.getAppointmentId()));

        if (!hasAuthority(currentUser, "EHR:WRITE")) {
            throw new IllegalStateException("You are not authorized to create medical records.");
        }

        boolean isAppointmentDoctor = appointment.getDoctor() != null
                && appointment.getDoctor().getId().equals(currentUser.getId());

        boolean canWriteAny = hasAuthority(currentUser, "ADMIN_PANEL:ACCESS");

        if (!isAppointmentDoctor && !canWriteAny) {
            throw new IllegalStateException("Only the assigned doctor or admin can create medical record.");
        }

        if (appointment.getStatus() == AppointmentStatus.CANCELLED
                || appointment.getStatus() == AppointmentStatus.NO_SHOW) {
            throw new IllegalStateException("Cannot create medical record for cancelled or no-show appointment.");
        }

        if (medicalRecordRepository.existsByAppointmentId(appointment.getId())) {
            throw new DuplicateResourceException("MedicalRecord", "appointmentId", appointment.getId());
        }

        MedicalRecord medicalRecord = MedicalRecord.builder()
                .appointment(appointment)
                .patient(appointment.getPatient())
                .doctor(appointment.getDoctor())
                .chiefComplaint(request.getChiefComplaint())
                .symptoms(request.getSymptoms())
                .clinicalNote(request.getClinicalNote())
                .diagnosisText(request.getDiagnosisText())
                .treatmentPlan(request.getTreatmentPlan())
                .followUpNote(request.getFollowUpNote())
                .status(MedicalRecordStatus.DRAFT)
                .build();

        MedicalRecord saved = medicalRecordRepository.save(medicalRecord);

        auditService.record(
                "CREATE_MEDICAL_RECORD",
                "MEDICAL_RECORD",
                saved.getId().toString(),
                "Created medical record for appointment " + appointment.getId());

        return toDto(saved);
    }

    public MedicalRecordDto getMedicalRecordById(User currentUser, UUID id) {
        MedicalRecord medicalRecord = getMedicalRecord(id);
        assertCanReadMedicalRecord(currentUser, medicalRecord);
        return toDto(medicalRecord);
    }

    public MedicalRecordDto getMedicalRecordByAppointment(User currentUser, UUID appointmentId) {
        MedicalRecord medicalRecord = medicalRecordRepository.findByAppointmentId(appointmentId)
                .orElseThrow(() -> new ResourceNotFoundException("MedicalRecord", "appointmentId", appointmentId));

        assertCanReadMedicalRecord(currentUser, medicalRecord);
        return toDto(medicalRecord);
    }

    public Page<MedicalRecordDto> getMyMedicalRecords(User currentUser, Pageable pageable) {
        return medicalRecordRepository.findByPatientIdOrderByCreatedAtDesc(currentUser.getId(), pageable)
                .map(this::toDto);
    }

    public Page<MedicalRecordDto> getPatientMedicalRecords(User currentUser, UUID patientId, Pageable pageable) {
        if (!hasAuthority(currentUser, "EHR:READ_ANY") && !currentUser.getId().equals(patientId)) {
            throw new IllegalStateException("You are not authorized to view patient medical records.");
        }

        return medicalRecordRepository.findByPatientIdOrderByCreatedAtDesc(patientId, pageable)
                .map(this::toDto);
    }

    @Transactional
    public MedicalRecordDto updateMedicalRecord(User currentUser, UUID id, MedicalRecordUpdateRequest request) {
        MedicalRecord medicalRecord = getMedicalRecord(id);
        assertCanWriteMedicalRecord(currentUser, medicalRecord);

        if (medicalRecord.getStatus() == MedicalRecordStatus.COMPLETED) {
            throw new IllegalStateException("Cannot update a completed medical record.");
        }

        medicalRecord.setChiefComplaint(request.getChiefComplaint());
        medicalRecord.setSymptoms(request.getSymptoms());
        medicalRecord.setClinicalNote(request.getClinicalNote());
        medicalRecord.setDiagnosisText(request.getDiagnosisText());
        medicalRecord.setTreatmentPlan(request.getTreatmentPlan());
        medicalRecord.setFollowUpNote(request.getFollowUpNote());

        MedicalRecord saved = medicalRecordRepository.save(medicalRecord);

        auditService.record(
                "UPDATE_MEDICAL_RECORD",
                "MEDICAL_RECORD",
                saved.getId().toString(),
                "Updated medical record");

        return toDto(saved);
    }

    @Transactional
    public MedicalRecordDiagnosisDto addDiagnosis(
            User currentUser,
            UUID medicalRecordId,
            MedicalRecordDiagnosisRequest request) {
        MedicalRecord medicalRecord = getMedicalRecord(medicalRecordId);
        assertCanWriteMedicalRecord(currentUser, medicalRecord);

        if (medicalRecord.getStatus() == MedicalRecordStatus.COMPLETED) {
            throw new IllegalStateException("Cannot add diagnosis to completed medical record.");
        }

        MedicalRecordDiagnosis diagnosis = MedicalRecordDiagnosis.builder()
                .medicalRecord(medicalRecord)
                .diagnosisText(request.getDiagnosisText())
                .icdCode(request.getIcdCode())
                .icdDisplay(request.getIcdDisplay())
                .codingSystem(request.getCodingSystem())
                .source(request.getSource())
                .confidence(request.getConfidence())
                .acceptedByDoctor(request.getAcceptedByDoctor() != null ? request.getAcceptedByDoctor() : true)
                .build();

        MedicalRecordDiagnosis saved = diagnosisRepository.save(diagnosis);

        auditService.record(
                "ADD_MEDICAL_RECORD_DIAGNOSIS",
                "MEDICAL_RECORD_DIAGNOSIS",
                saved.getId().toString(),
                "Added diagnosis to medical record " + medicalRecordId);

        return toDiagnosisDto(saved);
    }

    @Transactional
    public void deleteDiagnosis(User currentUser, UUID medicalRecordId, UUID diagnosisId) {
        MedicalRecord medicalRecord = getMedicalRecord(medicalRecordId);
        assertCanWriteMedicalRecord(currentUser, medicalRecord);

        if (medicalRecord.getStatus() == MedicalRecordStatus.COMPLETED) {
            throw new IllegalStateException("Cannot delete diagnosis from completed medical record.");
        }

        MedicalRecordDiagnosis diagnosis = diagnosisRepository.findById(diagnosisId)
                .orElseThrow(() -> new ResourceNotFoundException("MedicalRecordDiagnosis", "id", diagnosisId));

        if (!diagnosis.getMedicalRecord().getId().equals(medicalRecordId)) {
            throw new IllegalArgumentException("Diagnosis does not belong to this medical record.");
        }

        diagnosisRepository.delete(diagnosis);

        auditService.record(
                "DELETE_MEDICAL_RECORD_DIAGNOSIS",
                "MEDICAL_RECORD_DIAGNOSIS",
                diagnosisId.toString(),
                "Deleted diagnosis from medical record " + medicalRecordId);
    }

    @Transactional
    public MedicalRecordDto completeMedicalRecord(User currentUser, UUID id) {
        MedicalRecord medicalRecord = getMedicalRecord(id);
        assertCanWriteMedicalRecord(currentUser, medicalRecord);

        if (medicalRecord.getStatus() == MedicalRecordStatus.COMPLETED) {
            throw new IllegalStateException("Medical record is already completed.");
        }

        medicalRecord.setStatus(MedicalRecordStatus.COMPLETED);

        Appointment appointment = medicalRecord.getAppointment();
        if (appointment != null
                && appointment.getStatus() != AppointmentStatus.CANCELLED
                && appointment.getStatus() != AppointmentStatus.NO_SHOW) {
            appointment.setStatus(AppointmentStatus.COMPLETED);
            appointmentRepository.save(appointment);
        }

        MedicalRecord saved = medicalRecordRepository.save(medicalRecord);

        auditService.record(
                "COMPLETE_MEDICAL_RECORD",
                "MEDICAL_RECORD",
                saved.getId().toString(),
                "Completed medical record and marked appointment completed");

        notificationService.notify(
                saved.getPatient(),
                NotificationType.MEDICAL_RECORD_COMPLETED,
                "Ca khám đã hoàn tất",
                "Bác sĩ đã hoàn tất bệnh án. Bạn có thể xem kết quả khám trong mục Bệnh án.",
                "MEDICAL_RECORD",
                saved.getId().toString());

        return toDto(saved);
    }

    private MedicalRecord getMedicalRecord(UUID id) {
        return medicalRecordRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("MedicalRecord", "id", id));
    }

    private void assertCanReadMedicalRecord(User currentUser, MedicalRecord medicalRecord) {
        boolean canReadAny = hasAuthority(currentUser, "EHR:READ_ANY");

        boolean isPatientOwner = medicalRecord.getPatient() != null
                && medicalRecord.getPatient().getId().equals(currentUser.getId());

        boolean isDoctorOwner = medicalRecord.getDoctor() != null
                && medicalRecord.getDoctor().getId().equals(currentUser.getId());

        if (!canReadAny && !isPatientOwner && !isDoctorOwner) {
            throw new IllegalStateException("You are not authorized to view this medical record.");
        }
    }

    private void assertCanWriteMedicalRecord(User currentUser, MedicalRecord medicalRecord) {
        if (!hasAuthority(currentUser, "EHR:WRITE")) {
            throw new IllegalStateException("You are not authorized to modify medical records.");
        }

        boolean isDoctorOwner = medicalRecord.getDoctor() != null
                && medicalRecord.getDoctor().getId().equals(currentUser.getId());

        boolean canWriteAny = hasAuthority(currentUser, "ADMIN_PANEL:ACCESS");

        if (!isDoctorOwner && !canWriteAny) {
            throw new IllegalStateException("Only assigned doctor or admin can modify this medical record.");
        }
    }

    private boolean hasAuthority(User user, String authority) {
        if (user == null || user.getAuthorities() == null) {
            return false;
        }

        return user.getAuthorities()
                .stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch(authority::equals);
    }

    private MedicalRecordDto toDto(MedicalRecord record) {
        User patient = record.getPatient();
        User doctor = record.getDoctor();

        return MedicalRecordDto.builder()
                .id(record.getId())
                .appointmentId(record.getAppointment() != null ? record.getAppointment().getId() : null)
                .patientId(patient != null ? patient.getId() : null)
                .patientEmail(patient != null ? patient.getEmail() : null)
                .patientName(patient != null && patient.getUserProfile() != null
                        ? patient.getUserProfile().getFullName()
                        : null)
                .doctorId(doctor != null ? doctor.getId() : null)
                .doctorEmail(doctor != null ? doctor.getEmail() : null)
                .doctorName(doctor != null && doctor.getUserProfile() != null
                        ? doctor.getUserProfile().getFullName()
                        : null)
                .chiefComplaint(record.getChiefComplaint())
                .symptoms(record.getSymptoms())
                .clinicalNote(record.getClinicalNote())
                .diagnosisText(record.getDiagnosisText())
                .treatmentPlan(record.getTreatmentPlan())
                .followUpNote(record.getFollowUpNote())
                .status(record.getStatus())
                .diagnoses(diagnosisRepository.findByMedicalRecordIdOrderByCreatedAtDesc(record.getId())
                        .stream()
                        .map(this::toDiagnosisDto)
                        .collect(Collectors.toList()))
                .build();
    }

    private MedicalRecordDiagnosisDto toDiagnosisDto(MedicalRecordDiagnosis diagnosis) {
        return MedicalRecordDiagnosisDto.builder()
                .id(diagnosis.getId())
                .medicalRecordId(diagnosis.getMedicalRecord().getId())
                .diagnosisText(diagnosis.getDiagnosisText())
                .icdCode(diagnosis.getIcdCode())
                .icdDisplay(diagnosis.getIcdDisplay())
                .codingSystem(diagnosis.getCodingSystem())
                .source(diagnosis.getSource())
                .confidence(diagnosis.getConfidence())
                .acceptedByDoctor(diagnosis.getAcceptedByDoctor())
                .build();
    }
}