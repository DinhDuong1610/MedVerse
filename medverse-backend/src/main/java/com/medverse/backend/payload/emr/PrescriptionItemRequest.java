package com.medverse.backend.payload.emr;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class PrescriptionItemRequest {
    @NotNull(message = "Medication is required")
    private UUID medicationId;

    @NotNull(message = "Dosage quantity is required")
    @Min(value = 1, message = "Quantity must be at least 1")
    private Integer dosage;
    private String unit;
    private String frequency;
    private String route;
    private String instruction;
}