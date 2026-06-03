package com.medverse.backend.payload.ai;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import lombok.Data;

import java.util.LinkedHashMap;
import java.util.Map;

@Data
public class AiAnalyzeTextResponse {

    private Map<String, Object> data = new LinkedHashMap<>();

    @JsonAnySetter
    public void put(String key, Object value) {
        data.put(key, value);
    }
}