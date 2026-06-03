package com.medverse.backend.payload.prescription;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class PrescriptionCreateRequest {

    @NotNull(message = "Medical record ID is required")
    private UUID medicalRecordId;

    private String note;
}