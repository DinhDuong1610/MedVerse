package com.medverse.backend.payload.patient;

import com.medverse.backend.utils.enumeration.AllergySeverity;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class AllergyUpdateRequest {

    @NotBlank(message = "Allergen is required")
    private String allergen;

    private String reaction;

    private AllergySeverity severity = AllergySeverity.UNKNOWN;

    private String note;
}