package com.medverse.backend.service.emr;

import com.medverse.backend.entity.Appointment;
import com.medverse.backend.entity.User;
import com.medverse.backend.entity.emr.*;
import com.medverse.backend.mapper.EmrMapper;
import com.medverse.backend.payload.ai.AiDiagnosisPayload;
import com.medverse.backend.payload.emr.*;
import com.medverse.backend.repository.*;
import com.medverse.backend.service.AuditService;
import com.medverse.backend.service.integration.AIService;
import com.medverse.backend.utils.enumeration.*;
import com.medverse.backend.utils.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmrService {

    private final EncounterRepository encounterRepository;
    private final AppointmentRepository appointmentRepository;
    private final EmrConditionRepository conditionRepository;
    private final EmrObservationRepository observationRepository;
    private final EmrAllergyRepository allergyRepository;
    private final PrescriptionRepository prescriptionRepository;
    private final MedicationRepository medicationRepository;

    private final AIService aiService;
    private final EmrMapper emrMapper;
    private final AuditService auditService;

    // --- QUẢN LÝ LƯỢT KHÁM (ENCOUNTER) ---

    @Transactional
    public EncounterDetailDto startEncounter(UUID appointmentId, UUID doctorId) {
        log.info("Starting encounter for appointment: {}", appointmentId);

        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Appointment", "id", appointmentId));

        if (!appointment.getDoctor().getId().equals(doctorId)) {
            throw new IllegalArgumentException("Only the assigned doctor can start this encounter.");
        }

        if (appointment.getStatus() == AppointmentStatus.COMPLETED
                || appointment.getStatus() == AppointmentStatus.CANCELLED) {
            throw new IllegalStateException("Cannot start an encounter for a completed or cancelled appointment.");
        }

        // Kiểm tra xem đã có encounter chưa, nếu chưa thì tạo mới
        Encounter encounter = encounterRepository.findByAppointmentId(appointmentId)
                .orElseGet(() -> {
                    Encounter newEncounter = Encounter.builder()
                            .appointment(appointment)
                            .patient(appointment.getPatient())
                            .doctor(appointment.getDoctor())
                            .status(EncounterStatus.IN_PROGRESS)
                            .startTime(OffsetDateTime.now())
                            .visitReason(appointment.getRequest() != null ? appointment.getRequest().getSymptoms() : "")
                            .build();
                    return encounterRepository.save(newEncounter);
                });

        // auditService.record("START_ENCOUNTER", "ENCOUNTER",
        // encounter.getId().toString(), "Doctor started examination");
        return getEncounterDetail(encounter.getId());
    }

    public EncounterDetailDto getEncounterByAppointmentId(UUID appointmentId) {
        Encounter encounter = encounterRepository.findByAppointmentId(appointmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Encounter", "appointmentId", appointmentId));

        return getEncounterDetail(encounter.getId());
    }

    @Transactional
    public EncounterDetailDto finishEncounter(UUID encounterId) {
        Encounter encounter = encounterRepository.findById(encounterId)
                .orElseThrow(() -> new ResourceNotFoundException("Encounter", "id", encounterId));

        encounter.setStatus(EncounterStatus.FINISHED);
        encounter.setEndTime(OffsetDateTime.now());
        encounterRepository.save(encounter);

        // Cập nhật trạng thái Appointment
        Appointment appointment = encounter.getAppointment();
        if (appointment != null) {
            appointment.setStatus(AppointmentStatus.COMPLETED);
            appointmentRepository.save(appointment);
        }

        // auditService.record("FINISH_ENCOUNTER", "ENCOUNTER",
        // encounter.getId().toString(), "Examination finished");
        return getEncounterDetail(encounterId);
    }

    public EncounterDetailDto getEncounterDetail(UUID encounterId) {
        Encounter encounter = encounterRepository.findById(encounterId)
                .orElseThrow(() -> new ResourceNotFoundException("Encounter", "id", encounterId));

        EncounterDetailDto dto = emrMapper.toDto(encounter);

        // Load related data manually
        List<EmrConditionDto> diagnoses = conditionRepository.findByEncounterId(encounterId).stream()
                .map(emrMapper::toDto).collect(Collectors.toList());
        dto.setDiagnoses(diagnoses);

        List<EmrObservationDto> observations = observationRepository.findByEncounterId(encounterId).stream()
                .map(emrMapper::toDto).collect(Collectors.toList());
        dto.setObservations(observations);

        Optional<Prescription> prescription = prescriptionRepository.findByEncounterId(encounterId);
        prescription.ifPresent(p -> dto.setPrescription(emrMapper.toDto(p)));

        return dto;
    }

    // --- XỬ LÝ BỆNH ÁN & TÍCH HỢP AI (MODULE 2) ---

    /**
     * Lưu toàn bộ thông tin bệnh án từ Form Frontend và gọi AI phân tích
     */
    @Transactional
    public EncounterDetailDto updateMedicalRecord(UUID encounterId, MedicalRecordUpdateDto dto) {
        log.info("Updating medical record for encounter: {}", encounterId);
        Encounter encounter = encounterRepository.findById(encounterId)
                .orElseThrow(() -> new ResourceNotFoundException("Encounter", "id", encounterId));

        // 1. Cập nhật thông tin văn bản vào Encounter (Snapshot dữ liệu thô)
        encounter.setVisitReason(dto.getVisitReason());
        encounter.setHistoryOfPresentIllness(dto.getHistoryOfPresentIllness());
        encounter.setPastMedicalHistory(dto.getPastMedicalHistory());
        encounter.setFamilyHistory(dto.getFamilyHistory());

        // Gộp khám toàn thân và khám cơ quan vào 1 trường note
        String physicalExam = (dto.getPhysicalExamGeneral() != null ? dto.getPhysicalExamGeneral() : "") +
                "\n" +
                (dto.getPhysicalExamOrgan() != null ? dto.getPhysicalExamOrgan() : "");
        encounter.setPhysicalExamNote(physicalExam.trim());

        encounter.setTreatmentPlan(dto.getTreatmentPlan());
        encounter.setPrognosis(dto.getPrognosis());
        encounter.setSubclinicalTestsNote(dto.getSubclinicalTests());

        encounterRepository.save(encounter);
        saveAllergies(encounter, dto.getAllergies());

        // 2. Lưu Dấu hiệu sinh tồn (Vital Signs) vào EmrObservation
        saveVitalSigns(encounter, dto.getVitalSigns());

        // 3. Gọi AI Module 2 để chuẩn hóa chẩn đoán
        // Xử lý allergies từ List<String> thành String để gửi AI
        String allergyStr = "";
        if (dto.getAllergies() != null && !dto.getAllergies().isEmpty()) {
            allergyStr = String.join(", ", dto.getAllergies());
        }

        // Chuẩn bị payload gửi AI
        AiDiagnosisPayload.MedicalHistory aiHistory = AiDiagnosisPayload.MedicalHistory.builder()
                .historyOfPresentIllness(dto.getHistoryOfPresentIllness())
                .pastMedicalHistory(dto.getPastMedicalHistory())
                .allergies(allergyStr)
                .build();

        // Gộp chẩn đoán chính và phụ để AI phân tích
        String diagnosisText = dto.getMainDiagnosis() +
                (dto.getSecondaryDiagnosis() != null ? "; " + dto.getSecondaryDiagnosis() : "");

        AiDiagnosisPayload.Request aiRequest = AiDiagnosisPayload.Request.builder()
                .medicalHistory(aiHistory)
                .diagnosisTextInput(diagnosisText)
                .build();

        // Gọi AI Service
        AiDiagnosisPayload.Response aiResponse = aiService.analyzeDiagnosis(aiRequest);

        // 4. Xử lý kết quả từ AI (Lưu vào EmrCondition)
        // Xóa chẩn đoán cũ của lần khám này để tránh trùng lặp khi update nhiều lần
        List<EmrCondition> oldConditions = conditionRepository.findByEncounterId(encounterId);
        conditionRepository.deleteAll(oldConditions);

        if (aiResponse != null && aiResponse.getFhirBundle() != null) {
            processAiResponseAndSaveConditions(encounter, aiResponse.getFhirBundle());
        } else {
            // Fallback: Nếu AI lỗi hoặc không trả về, lưu text thô
            EmrCondition manualCondition = EmrCondition.builder()
                    .patient(encounter.getPatient())
                    .encounter(encounter)
                    .conditionType(ConditionType.ENCOUNTER_DIAGNOSIS)
                    .description(dto.getMainDiagnosis())
                    .recordedAt(OffsetDateTime.now())
                    .build();
            conditionRepository.save(manualCondition);
        }

        return getEncounterDetail(encounterId);
    }

    private void saveAllergies(Encounter encounter, List<String> allergyCodes) {
        if (allergyCodes == null)
            return;

        // Xóa dị ứng cũ của bệnh nhân (để cập nhật list mới nhất từ FE)
        // Lưu ý: Logic này giả định FE gửi TOÀN BỘ danh sách dị ứng mỗi lần update
        List<EmrAllergy> oldAllergies = allergyRepository.findByPatientId(encounter.getPatient().getId());
        allergyRepository.deleteAll(oldAllergies);

        List<EmrAllergy> newAllergies = new ArrayList<>();
        for (String code : allergyCodes) {
            // Thử tìm tên thuốc theo mã ATC để lưu vào cột substance cho dễ đọc
            // Nếu không tìm thấy thì lưu luôn mã code vào substance
            String substanceName = medicationRepository.findFirstByAtcCode(code)
                    .map(m -> m.getName() + " (" + code + ")") // VD: "Panadol (N02BE01)"
                    .stream().findFirst()
                    .orElse("Unknown Drug (" + code + ")");

            newAllergies.add(EmrAllergy.builder()
                    .patient(encounter.getPatient())
                    .encounter(encounter)
                    .substance(substanceName)
                    .standardizedCode(code) // Lưu mã ATC/ICD vào đây để AI Module 3 dùng
                    .reaction("Reported in history")
                    .severity("MAJOR")
                    .recordedAt(OffsetDateTime.now())
                    .build());
        }
        allergyRepository.saveAll(newAllergies);
    }

    private void saveVitalSigns(Encounter encounter, MedicalRecordUpdateDto.VitalSignsDto vitals) {
        if (vitals == null)
            return;

        List<EmrObservation> oldObs = observationRepository.findByEncounterIdAndObservationType(
                encounter.getId(), ObservationType.VITAL_SIGNS);
        observationRepository.deleteAll(oldObs);

        List<EmrObservation> observations = new ArrayList<>();

        if (vitals.getBloodPressure() != null) {
            observations
                    .add(createObservation(encounter, "Blood Pressure", vitals.getBloodPressure(), "mmHg", "85354-9"));
        }
        if (vitals.getPulse() != null) {
            observations.add(
                    createObservation(encounter, "Heart Rate", BigDecimal.valueOf(vitals.getPulse()), "bpm", "8867-4"));
        }
        if (vitals.getTemperature() != null) {
            observations.add(createObservation(encounter, "Body Temperature",
                    BigDecimal.valueOf(vitals.getTemperature()), "C", "8310-5"));
        }
        if (vitals.getWeight() != null) {
            observations.add(createObservation(encounter, "Body Weight", BigDecimal.valueOf(vitals.getWeight()), "kg",
                    "29463-7"));
        }
        if (vitals.getHeight() != null) {
            observations.add(
                    createObservation(encounter, "Body Height", BigDecimal.valueOf(vitals.getHeight()), "m", "8302-2"));
        }

        observationRepository.saveAll(observations);
    }

    private EmrObservation createObservation(Encounter encounter, String name, Object value, String unit,
            String loincCode) {
        EmrObservation obs = EmrObservation.builder()
                .patient(encounter.getPatient())
                .encounter(encounter)
                .observationType(ObservationType.VITAL_SIGNS)
                .description(name)
                .standardCode(loincCode)
                .valueUnit(unit)
                .issuedAt(OffsetDateTime.now())
                .build();

        if (value instanceof BigDecimal) {
            obs.setValueQuantity((BigDecimal) value);
        } else if (value instanceof String) {
            obs.setValueText((String) value);
        }

        return obs;
    }

    private void processAiResponseAndSaveConditions(Encounter encounter, AiDiagnosisPayload.FhirBundle bundle) {
        if (bundle.getEntry() == null)
            return;

        List<EmrCondition> conditions = new ArrayList<>();

        for (AiDiagnosisPayload.FhirEntry entry : bundle.getEntry()) {
            var resource = entry.getResource();
            if ("Condition".equals(resource.getResourceType())) {
                String code = null;
                String display = null;
                ConditionType type = ConditionType.ENCOUNTER_DIAGNOSIS; // Default

                // Lấy Code & Text (CẬP NHẬT LOGIC LẤY CODE THÔNG MINH HƠN)
                if (resource.getCode() != null) {
                    display = resource.getCode().getText();

                    if (resource.getCode().getCoding() != null) {
                        // 1. Ưu tiên tìm mã ICD-11
                        for (var coding : resource.getCode().getCoding()) {
                            if ("ICD-11".equals(coding.getSystem()) && coding.getCode() != null) {
                                code = coding.getCode();
                                break;
                            }
                        }
                        // 2. Nếu không có ICD-11, lấy mã đầu tiên tìm thấy
                        if (code == null && !resource.getCode().getCoding().isEmpty()) {
                            code = resource.getCode().getCoding().get(0).getCode();
                        }
                    }
                }

                // Phân loại (Category)
                if (resource.getCategory() != null) {
                    for (var cat : resource.getCategory()) {
                        if (cat.getCoding() != null) {
                            for (var coding : cat.getCoding()) {
                                if ("problem-list-item".equalsIgnoreCase(coding.getCode())) {
                                    type = ConditionType.PROBLEM_LIST_ITEM;
                                }
                            }
                        }
                    }
                }

                if (display != null) {
                    conditions.add(EmrCondition.builder()
                            .patient(encounter.getPatient())
                            .encounter(encounter)
                            .conditionCode(code)
                            .description(display)
                            .conditionType(type)
                            .recordedAt(OffsetDateTime.now())
                            .build());
                }
            }
        }
        conditionRepository.saveAll(conditions);
    }
}