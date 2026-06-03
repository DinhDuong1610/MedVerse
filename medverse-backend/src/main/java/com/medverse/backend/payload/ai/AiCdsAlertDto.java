package com.medverse.backend.payload.ai;

import lombok.Data;

@Data
public class AiCdsAlertDto {
    private String type;
    private String severity;
    private String title;
    private String message;
    private String recommendation;
}