package com.medverse.backend.payload.prescription;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.util.UUID;

@Data
public class PrescriptionItemCreateRequest {

    @NotNull(message = "Medication ID is required")
    private UUID medicationId;

    private String dosage;
    private String frequency;
    private String duration;

    @DecimalMin(value = "0.01", message = "Quantity must be greater than 0")
    private BigDecimal quantity;

    private String instruction;
}