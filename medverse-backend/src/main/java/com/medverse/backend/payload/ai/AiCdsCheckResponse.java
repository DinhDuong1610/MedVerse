package com.medverse.backend.payload.ai;

import lombok.Data;

import java.util.List;

@Data
public class AiCdsCheckResponse {
    private String status;
    private String mode;
    private List<AiCdsAlertDto> alerts;
}