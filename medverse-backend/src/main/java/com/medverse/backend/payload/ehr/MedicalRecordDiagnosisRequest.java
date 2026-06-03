package com.medverse.backend.payload.ehr;

import com.medverse.backend.utils.enumeration.DiagnosisSource;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class MedicalRecordDiagnosisRequest {

    @NotBlank(message = "Diagnosis text is required")
    private String diagnosisText;

    private String icdCode;
    private String icdDisplay;
    private String codingSystem = "ICD-10";
    private DiagnosisSource source = DiagnosisSource.MANUAL;
    private BigDecimal confidence;
    private Boolean acceptedByDoctor = true;
}