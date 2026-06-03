package com.medverse.backend.service.prescription;

import com.medverse.backend.entity.MedicalRecord;
import com.medverse.backend.entity.User;
import com.medverse.backend.entity.inventory.Medication;
import com.medverse.backend.entity.prescription.Prescription;
import com.medverse.backend.entity.prescription.PrescriptionItem;
import com.medverse.backend.entity.prescription.PrescriptionSafetyAlert;
import com.medverse.backend.payload.prescription.*;
import com.medverse.backend.repository.*;
import com.medverse.backend.service.AuditService;
import com.medverse.backend.utils.enumeration.MedicalRecordStatus;
import com.medverse.backend.utils.enumeration.PrescriptionStatus;
import com.medverse.backend.utils.exception.DuplicateResourceException;
import com.medverse.backend.utils.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PrescriptionService {

    private final PrescriptionRepository prescriptionRepository;
    private final PrescriptionItemRepository itemRepository;
    private final PrescriptionSafetyAlertRepository alertRepository;
    private final MedicalRecordRepository medicalRecordRepository;
    private final MedicationRepository medicationRepository;
    private final AuditService auditService;

    @Transactional
    public PrescriptionDto createPrescription(User currentUser, PrescriptionCreateRequest request) {
        MedicalRecord medicalRecord = medicalRecordRepository.findById(request.getMedicalRecordId())
                .orElseThrow(() -> new ResourceNotFoundException("MedicalRecord", "id", request.getMedicalRecordId()));

        assertCanWritePrescription(currentUser, medicalRecord);

        if (medicalRecord.getStatus() == MedicalRecordStatus.CANCELLED) {
            throw new IllegalStateException("Cannot create prescription for cancelled medical record.");
        }

        if (prescriptionRepository.existsByMedicalRecordId(medicalRecord.getId())) {
            throw new DuplicateResourceException("Prescription", "medicalRecordId", medicalRecord.getId());
        }

        Prescription prescription = Prescription.builder()
                .medicalRecord(medicalRecord)
                .appointment(medicalRecord.getAppointment())
                .patient(medicalRecord.getPatient())
                .doctor(medicalRecord.getDoctor())
                .status(PrescriptionStatus.DRAFT)
                .note(request.getNote())
                .build();

        Prescription saved = prescriptionRepository.save(prescription);

        auditService.record(
                "CREATE_PRESCRIPTION",
                "PRESCRIPTION",
                saved.getId().toString(),
                "Created prescription for medical record " + medicalRecord.getId());

        return toDto(saved);
    }

    public PrescriptionDto getPrescriptionById(User currentUser, UUID id) {
        Prescription prescription = getPrescription(id);
        assertCanReadPrescription(currentUser, prescription);
        return toDto(prescription);
    }

    public PrescriptionDto getPrescriptionByMedicalRecord(User currentUser, UUID medicalRecordId) {
        Prescription prescription = prescriptionRepository.findByMedicalRecordId(medicalRecordId)
                .orElseThrow(() -> new ResourceNotFoundException("Prescription", "medicalRecordId", medicalRecordId));

        assertCanReadPrescription(currentUser, prescription);
        return toDto(prescription);
    }

    public Page<PrescriptionDto> getMyPrescriptions(User currentUser, Pageable pageable) {
        return prescriptionRepository.findByPatientIdOrderByCreatedAtDesc(currentUser.getId(), pageable)
                .map(this::toDto);
    }

    public Page<PrescriptionDto> getPatientPrescriptions(User currentUser, UUID patientId, Pageable pageable) {
        if (!hasAuthority(currentUser, "PRESCRIPTION:READ_ANY") && !currentUser.getId().equals(patientId)) {
            throw new IllegalStateException("You are not authorized to view patient prescriptions.");
        }

        return prescriptionRepository.findByPatientIdOrderByCreatedAtDesc(patientId, pageable)
                .map(this::toDto);
    }

    @Transactional
    public PrescriptionDto updatePrescription(User currentUser, UUID id, PrescriptionUpdateRequest request) {
        Prescription prescription = getPrescription(id);
        assertCanWritePrescription(currentUser, prescription);

        assertDraft(prescription);

        prescription.setNote(request.getNote());
        Prescription saved = prescriptionRepository.save(prescription);

        auditService.record(
                "UPDATE_PRESCRIPTION",
                "PRESCRIPTION",
                saved.getId().toString(),
                "Updated prescription note");

        return toDto(saved);
    }

    @Transactional
    public PrescriptionItemDto addItem(User currentUser, UUID prescriptionId, PrescriptionItemCreateRequest request) {
        Prescription prescription = getPrescription(prescriptionId);
        assertCanWritePrescription(currentUser, prescription);
        assertDraft(prescription);

        Medication medication = medicationRepository.findById(request.getMedicationId())
                .orElseThrow(() -> new ResourceNotFoundException("Medication", "id", request.getMedicationId()));

        PrescriptionItem item = PrescriptionItem.builder()
                .prescription(prescription)
                .medication(medication)
                .medicationName(medication.getName())
                .activeIngredient(medication.getActiveIngredient())
                .atcCode(medication.getAtcCode())
                .unit(medication.getUnit())
                .dosage(request.getDosage())
                .frequency(request.getFrequency())
                .duration(request.getDuration())
                .quantity(request.getQuantity())
                .instruction(request.getInstruction())
                .build();

        PrescriptionItem saved = itemRepository.save(item);

        auditService.record(
                "ADD_PRESCRIPTION_ITEM",
                "PRESCRIPTION_ITEM",
                saved.getId().toString(),
                "Added medication " + medication.getName() + " to prescription " + prescriptionId);

        return toItemDto(saved);
    }

    @Transactional
    public PrescriptionItemDto updateItem(
            User currentUser,
            UUID prescriptionId,
            UUID itemId,
            PrescriptionItemUpdateRequest request) {
        Prescription prescription = getPrescription(prescriptionId);
        assertCanWritePrescription(currentUser, prescription);
        assertDraft(prescription);

        PrescriptionItem item = itemRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("PrescriptionItem", "id", itemId));

        if (!item.getPrescription().getId().equals(prescriptionId)) {
            throw new IllegalArgumentException("Prescription item does not belong to this prescription.");
        }

        item.setDosage(request.getDosage());
        item.setFrequency(request.getFrequency());
        item.setDuration(request.getDuration());
        item.setQuantity(request.getQuantity());
        item.setInstruction(request.getInstruction());

        PrescriptionItem saved = itemRepository.save(item);

        auditService.record(
                "UPDATE_PRESCRIPTION_ITEM",
                "PRESCRIPTION_ITEM",
                saved.getId().toString(),
                "Updated prescription item");

        return toItemDto(saved);
    }

    @Transactional
    public void deleteItem(User currentUser, UUID prescriptionId, UUID itemId) {
        Prescription prescription = getPrescription(prescriptionId);
        assertCanWritePrescription(currentUser, prescription);
        assertDraft(prescription);

        PrescriptionItem item = itemRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("PrescriptionItem", "id", itemId));

        if (!item.getPrescription().getId().equals(prescriptionId)) {
            throw new IllegalArgumentException("Prescription item does not belong to this prescription.");
        }

        itemRepository.delete(item);

        auditService.record(
                "DELETE_PRESCRIPTION_ITEM",
                "PRESCRIPTION_ITEM",
                itemId.toString(),
                "Deleted prescription item from prescription " + prescriptionId);
    }

    @Transactional
    public PrescriptionDto finalizePrescription(User currentUser, UUID prescriptionId) {
        Prescription prescription = getPrescription(prescriptionId);
        assertCanWritePrescription(currentUser, prescription);
        assertDraft(prescription);

        if (itemRepository.findByPrescriptionIdOrderByCreatedAtAsc(prescriptionId).isEmpty()) {
            throw new IllegalStateException("Cannot finalize prescription without medication items.");
        }

        prescription.setStatus(PrescriptionStatus.FINALIZED);
        prescription.setFinalizedAt(OffsetDateTime.now());

        Prescription saved = prescriptionRepository.save(prescription);

        auditService.record(
                "FINALIZE_PRESCRIPTION",
                "PRESCRIPTION",
                saved.getId().toString(),
                "Finalized prescription");

        return toDto(saved);
    }

    @Transactional
    public void cancelPrescription(User currentUser, UUID prescriptionId, String reason) {
        Prescription prescription = getPrescription(prescriptionId);
        assertCanWritePrescription(currentUser, prescription);

        if (prescription.getStatus() == PrescriptionStatus.FINALIZED) {
            throw new IllegalStateException("Cannot cancel a finalized prescription in MVP.");
        }

        prescription.setStatus(PrescriptionStatus.CANCELLED);
        prescriptionRepository.save(prescription);

        auditService.record(
                "CANCEL_PRESCRIPTION",
                "PRESCRIPTION",
                prescriptionId.toString(),
                "Reason: " + reason);
    }

    private Prescription getPrescription(UUID id) {
        return prescriptionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Prescription", "id", id));
    }

    private void assertDraft(Prescription prescription) {
        if (prescription.getStatus() != PrescriptionStatus.DRAFT) {
            throw new IllegalStateException("Only DRAFT prescription can be modified.");
        }
    }

    private void assertCanReadPrescription(User currentUser, Prescription prescription) {
        boolean canReadAny = hasAuthority(currentUser, "PRESCRIPTION:READ_ANY");

        boolean isPatientOwner = prescription.getPatient() != null
                && prescription.getPatient().getId().equals(currentUser.getId());

        boolean isDoctorOwner = prescription.getDoctor() != null
                && prescription.getDoctor().getId().equals(currentUser.getId());

        if (!canReadAny && !isPatientOwner && !isDoctorOwner) {
            throw new IllegalStateException("You are not authorized to view this prescription.");
        }
    }

    private void assertCanWritePrescription(User currentUser, Prescription prescription) {
        if (!hasAuthority(currentUser, "PRESCRIPTION:WRITE")) {
            throw new IllegalStateException("You are not authorized to modify prescriptions.");
        }

        boolean isDoctorOwner = prescription.getDoctor() != null
                && prescription.getDoctor().getId().equals(currentUser.getId());

        boolean canWriteAny = hasAuthority(currentUser, "ADMIN_PANEL:ACCESS");

        if (!isDoctorOwner && !canWriteAny) {
            throw new IllegalStateException("Only assigned doctor or admin can modify this prescription.");
        }
    }

    private void assertCanWritePrescription(User currentUser, MedicalRecord medicalRecord) {
        if (!hasAuthority(currentUser, "PRESCRIPTION:WRITE")) {
            throw new IllegalStateException("You are not authorized to create prescriptions.");
        }

        boolean isDoctorOwner = medicalRecord.getDoctor() != null
                && medicalRecord.getDoctor().getId().equals(currentUser.getId());

        boolean canWriteAny = hasAuthority(currentUser, "ADMIN_PANEL:ACCESS");

        if (!isDoctorOwner && !canWriteAny) {
            throw new IllegalStateException("Only assigned doctor or admin can create prescription.");
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

    private PrescriptionDto toDto(Prescription prescription) {
        User patient = prescription.getPatient();
        User doctor = prescription.getDoctor();

        return PrescriptionDto.builder()
                .id(prescription.getId())
                .medicalRecordId(
                        prescription.getMedicalRecord() != null ? prescription.getMedicalRecord().getId() : null)
                .appointmentId(prescription.getAppointment() != null ? prescription.getAppointment().getId() : null)
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
                .status(prescription.getStatus())
                .note(prescription.getNote())
                .finalizedAt(prescription.getFinalizedAt())
                .items(itemRepository.findByPrescriptionIdOrderByCreatedAtAsc(prescription.getId())
                        .stream()
                        .map(this::toItemDto)
                        .collect(Collectors.toList()))
                .safetyAlerts(alertRepository.findByPrescriptionIdOrderByCreatedAtDesc(prescription.getId())
                        .stream()
                        .map(this::toAlertDto)
                        .collect(Collectors.toList()))
                .build();
    }

    private PrescriptionItemDto toItemDto(PrescriptionItem item) {
        return PrescriptionItemDto.builder()
                .id(item.getId())
                .prescriptionId(item.getPrescription().getId())
                .medicationId(item.getMedication() != null ? item.getMedication().getId() : null)
                .medicationName(item.getMedicationName())
                .activeIngredient(item.getActiveIngredient())
                .atcCode(item.getAtcCode())
                .unit(item.getUnit())
                .dosage(item.getDosage())
                .frequency(item.getFrequency())
                .duration(item.getDuration())
                .quantity(item.getQuantity())
                .instruction(item.getInstruction())
                .build();
    }

    private PrescriptionSafetyAlertDto toAlertDto(PrescriptionSafetyAlert alert) {
        return PrescriptionSafetyAlertDto.builder()
                .id(alert.getId())
                .prescriptionId(alert.getPrescription().getId())
                .type(alert.getType())
                .severity(alert.getSeverity())
                .title(alert.getTitle())
                .message(alert.getMessage())
                .recommendation(alert.getRecommendation())
                .aiPayload(alert.getAiPayload())
                .doctorAction(alert.getDoctorAction())
                .doctorNote(alert.getDoctorNote())
                .build();
    }
}