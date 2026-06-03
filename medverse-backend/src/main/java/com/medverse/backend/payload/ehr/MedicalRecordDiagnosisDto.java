package com.medverse.backend.payload.ehr;

import com.medverse.backend.utils.enumeration.DiagnosisSource;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
public class MedicalRecordDiagnosisDto {
    private UUID id;
    private UUID medicalRecordId;
    private String diagnosisText;
    private String icdCode;
    private String icdDisplay;
    private String codingSystem;
    private DiagnosisSource source;
    private BigDecimal confidence;
    private Boolean acceptedByDoctor;
}