package com.medverse.backend.payload.inventory;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class MedicationCreateRequest {

    @NotBlank(message = "Medication name is required")
    private String name;

    @NotBlank(message = "Code is required")
    private String code;

    private String activeIngredient;
    private String atcCode;

    @NotBlank(message = "Unit is required")
    private String unit;

    private String packingSpecification;
    private String usageInstruction;
    private String contraindication;
}