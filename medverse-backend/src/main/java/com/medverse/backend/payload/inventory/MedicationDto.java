package com.medverse.backend.payload.inventory;

import lombok.Data;
import java.util.UUID;

@Data
public class MedicationDto {
    private UUID id;
    private String name;
    private String activeIngredient;
    private String code;
    private String atcCode;
    private String unit;
    private String packingSpecification;
    private String usageInstruction;
    private String contraindication;

    private Integer totalStock;
}