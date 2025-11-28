package com.medverse.backend.service.emr;

import com.medverse.backend.entity.emr.*;
import com.medverse.backend.entity.inventory.Medication;
import com.medverse.backend.mapper.EmrMapper;
import com.medverse.backend.payload.ai.AiInteractionPayload;
import com.medverse.backend.payload.emr.PrescriptionDto;
import com.medverse.backend.payload.emr.PrescriptionItemRequest;
import com.medverse.backend.repository.*;
import com.medverse.backend.service.AuditService;
import com.medverse.backend.service.integration.AIService;
import com.medverse.backend.utils.enumeration.ConditionType;
import com.medverse.backend.utils.enumeration.PrescriptionStatus;
import com.medverse.backend.utils.exception.DuplicateResourceException;
import com.medverse.backend.utils.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PrescriptionService {

    private final PrescriptionRepository prescriptionRepository;
    private final PrescriptionItemRepository prescriptionItemRepository;
    private final EncounterRepository encounterRepository;
    private final MedicationRepository medicationRepository;
    private final MedicationBatchRepository batchRepository;

    private final EmrAllergyRepository allergyRepository;
    private final EmrConditionRepository conditionRepository;

    private final AIService aiService;
    private final EmrMapper emrMapper;
    private final AuditService auditService;

    @Transactional
    public PrescriptionDto getOrCreatePrescription(UUID encounterId) {
        Encounter encounter = encounterRepository.findById(encounterId)
                .orElseThrow(() -> new ResourceNotFoundException("Encounter", "id", encounterId));

        Prescription prescription = prescriptionRepository.findByEncounterId(encounterId)
                .orElseGet(() -> {
                    Prescription newPrescription = Prescription.builder()
                            .encounter(encounter)
                            .patient(encounter.getPatient())
                            .doctor(encounter.getDoctor())
                            .status(PrescriptionStatus.DRAFT)
                            .build();
                    return prescriptionRepository.save(newPrescription);
                });

        return emrMapper.toDto(prescription);
    }

    @Transactional
    public AiInteractionPayload.Response addMedication(UUID encounterId, PrescriptionItemRequest request) {
        Prescription prescription = prescriptionRepository.findByEncounterId(encounterId)
                .orElseThrow(() -> new ResourceNotFoundException("Prescription", "encounterId", encounterId));

        if (prescription.getStatus() != PrescriptionStatus.DRAFT) {
            throw new IllegalStateException("Cannot modify a prescription that is already issued or cancelled.");
        }

        Medication medication = medicationRepository.findById(request.getMedicationId())
                .orElseThrow(() -> new ResourceNotFoundException("Medication", "id", request.getMedicationId()));

        // Check Tồn kho
        // Integer availableStock =
        // batchRepository.sumAvailableQuantity(medication.getId(), LocalDate.now());
        // if (availableStock < request.getDosage()) {
        // throw new IllegalArgumentException("Not enough stock. Available: " +
        // availableStock);
        // }

        boolean exists = prescription.getItems().stream()
                .anyMatch(item -> item.getMedication().getId().equals(medication.getId()));
        if (exists) {
            throw new DuplicateResourceException("Medication", "id",
                    medication.getName() + " is already in the prescription");
        }

        PrescriptionItem item = PrescriptionItem.builder()
                .prescription(prescription)
                .medication(medication)
                .dosage(request.getDosage())
                .unit(request.getUnit())
                .frequency(request.getFrequency())
                .route(request.getRoute())
                .instruction(request.getInstruction())
                .build();

        prescriptionItemRepository.save(item);

        // Refresh prescription items for AI check
        // (Cần flush hoặc fetch lại để có list items mới nhất)
        List<PrescriptionItem> currentItems = prescriptionItemRepository.findByPrescriptionId(prescription.getId());

        // Gọi AI Module 3: Check tương tác thuốc
        return checkDrugInteractions(prescription, currentItems);
    }

    @Transactional
    public void removeMedication(UUID itemId) {
        PrescriptionItem item = prescriptionItemRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("PrescriptionItem", "id", itemId));

        if (item.getPrescription().getStatus() != PrescriptionStatus.DRAFT) {
            throw new IllegalStateException("Cannot modify finalized prescription.");
        }

        prescriptionItemRepository.delete(item);
    }

    private AiInteractionPayload.Response checkDrugInteractions(Prescription prescription,
            List<PrescriptionItem> items) {
        // 1. Build Target Medications (Thuốc đang kê trong đơn này)
        List<AiInteractionPayload.TargetMedication> targetMeds = items.stream()
                .map(i -> AiInteractionPayload.TargetMedication.builder()
                        .atcCode(i.getMedication().getAtcCode())
                        .name(i.getMedication().getName())
                        .dose(i.getDosage() + " " + i.getUnit())
                        .route(i.getRoute())
                        .build())
                .collect(Collectors.toList());

        // 2. Build Patient Context
        // 2.1. Dị ứng
        List<AiInteractionPayload.CodedEntity> allergies = allergyRepository
                .findByPatientId(prescription.getPatient().getId())
                .stream()
                .map(a -> AiInteractionPayload.CodedEntity.builder()
                        .code(a.getStandardizedCode())
                        .system("SNOMED-CT")
                        .text(a.getSubstance())
                        .build())
                .collect(Collectors.toList());

        // 2.2. Bệnh nền & Chẩn đoán hiện tại
        List<EmrCondition> allConditions = new ArrayList<>();
        // Lấy bệnh sử
        allConditions.addAll(conditionRepository.findByPatientIdAndConditionType(
                prescription.getPatient().getId(), ConditionType.PROBLEM_LIST_ITEM));
        // Lấy chẩn đoán đợt này (nếu có)
        allConditions.addAll(conditionRepository.findByEncounterId(prescription.getEncounter().getId()));

        List<AiInteractionPayload.ConditionEntity> conditions = allConditions.stream()
                .map(c -> AiInteractionPayload.ConditionEntity.builder()
                        .code(c.getConditionCode())
                        .system("ICD-11")
                        .type(c.getConditionType() == ConditionType.PROBLEM_LIST_ITEM ? "HISTORY" : "CURRENT")
                        .text(c.getDescription())
                        .build())
                .collect(Collectors.toList());

        // 2.3. Demographics (Lấy sơ bộ từ UserProfile)
        var profile = prescription.getPatient().getUserProfile();
        AiInteractionPayload.Demographics demographics = AiInteractionPayload.Demographics.builder()
                .gender(profile.getGender()) // Cần chuẩn hóa MALE/FEMALE nếu DB lưu khác
                .age(LocalDate.now().getYear() - profile.getDateOfBirth().getYear())
                .build();

        // 3. Gửi Request sang AI
        AiInteractionPayload.Request aiRequest = AiInteractionPayload.Request.builder()
                .targetMedications(targetMeds)
                .patientContext(AiInteractionPayload.PatientContext.builder()
                        .demographics(demographics)
                        .allergies(allergies)
                        .conditions(conditions)
                        .activeMedications(new ArrayList<>())
                        .build())
                .build();

        return aiService.checkDrugInteraction(aiRequest);
    }

    @Transactional
    public PrescriptionDto issuePrescription(UUID encounterId) {
        Prescription prescription = prescriptionRepository.findByEncounterId(encounterId)
                .orElseThrow(() -> new ResourceNotFoundException("Prescription", "encounterId", encounterId));

        if (prescription.getStatus() != PrescriptionStatus.DRAFT) {
            throw new IllegalStateException("Prescription is already issued or cancelled.");
        }

        // Trừ kho (Logic đơn giản: tìm các batch còn hạn và trừ dần)
        // Ở đây tôi gọi hàm trừ kho giả định, bạn cần implement chi tiết trong
        // InventoryService nếu muốn chặt chẽ
        // inventoryService.deductStock(prescription.getItems()); -> Future improvement

        prescription.setStatus(PrescriptionStatus.ISSUED);
        prescription.setIssuedAt(OffsetDateTime.now());
        prescriptionRepository.save(prescription);

        // auditService.record("ISSUE_PRESCRIPTION", "PRESCRIPTION",
        // prescription.getId().toString(), "Prescription issued");

        return emrMapper.toDto(prescription);
    }
}