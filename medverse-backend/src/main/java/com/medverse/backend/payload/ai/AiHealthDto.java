package com.medverse.backend.payload.ai;

import lombok.Data;

import java.util.Map;

@Data
public class AiHealthDto {
    private String service;
    private String status;
    private Boolean fallbackEnabled;
    private Map<String, String> modules;
}