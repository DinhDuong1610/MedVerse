package com.medverse.backend.payload.prescription;

import jakarta.validation.constraints.DecimalMin;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class PrescriptionItemUpdateRequest {

    private String dosage;
    private String frequency;
    private String duration;

    @DecimalMin(value = "0.01", message = "Quantity must be greater than 0")
    private BigDecimal quantity;

    private String instruction;
}