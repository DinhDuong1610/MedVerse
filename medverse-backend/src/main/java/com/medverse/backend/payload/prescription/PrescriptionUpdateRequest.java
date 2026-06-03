package com.medverse.backend.payload.prescription;

import lombok.Data;

@Data
public class PrescriptionUpdateRequest {
    private String note;
}