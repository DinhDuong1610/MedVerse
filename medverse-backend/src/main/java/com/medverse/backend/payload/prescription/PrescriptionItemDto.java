package com.medverse.backend.payload.prescription;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
public class PrescriptionItemDto {
    private UUID id;
    private UUID prescriptionId;
    private UUID medicationId;

    private String medicationName;
    private String activeIngredient;
    private String atcCode;
    private String unit;

    private String dosage;
    private String frequency;
    private String duration;
    private BigDecimal quantity;
    private String instruction;
}