package com.medverse.backend.payload.patient;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
public class PatientMedicalProfileDto {
    private UUID id;
    private UUID patientId;
    private String patientEmail;
    private String fullName;

    private String bloodType;
    private BigDecimal heightCm;
    private BigDecimal weightKg;
    private String chronicDiseases;
    private String medicalHistory;
    private String currentMedicationsNote;
}