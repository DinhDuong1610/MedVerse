package com.medverse.backend.payload.ai;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.util.Map;

@Data
public class AiAnalyzeTextRequest {

    @JsonProperty("diagnosis_text_input")
    private String diagnosisTextInput;

    @JsonProperty("medical_history")
    private Map<String, Object> medicalHistory;
}