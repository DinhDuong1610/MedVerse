package com.medverse.backend.payload.patient;

import com.medverse.backend.utils.enumeration.AllergySeverity;
import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class AllergyDto {
    private UUID id;
    private UUID patientId;
    private String allergen;
    private String reaction;
    private AllergySeverity severity;
    private String note;
}