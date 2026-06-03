package com.medverse.backend.payload.patient;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class PatientMedicalProfileUpdateRequest {

    @Pattern(regexp = "^(A|B|AB|O)[+-]?$|^$", message = "Blood type must be A, B, AB, O, A+, A-, B+, B-, AB+, AB-, O+, or O-")
    private String bloodType;

    @DecimalMin(value = "20.00", message = "Height must be at least 20 cm")
    @DecimalMax(value = "250.00", message = "Height must be at most 250 cm")
    private BigDecimal heightCm;

    @DecimalMin(value = "1.00", message = "Weight must be at least 1 kg")
    @DecimalMax(value = "300.00", message = "Weight must be at most 300 kg")
    private BigDecimal weightKg;

    private String chronicDiseases;
    private String medicalHistory;
    private String currentMedicationsNote;
}