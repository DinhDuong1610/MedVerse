package com.medverse.backend.payload.ai;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
@Builder
public class AiCdsCheckRequest {

    @JsonProperty("target_medications")
    private List<Map<String, Object>> targetMedications;

    @JsonProperty("patient_context")
    private Map<String, Object> patientContext;
}