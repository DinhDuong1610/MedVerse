package com.medverse.backend.payload.ai;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class AiAtcSuggestionDto {
    @JsonProperty("display_text")
    private String displayText;

    @JsonProperty("medication_name")
    private String medicationName;

    private String unit;

    @JsonProperty("atc_code")
    private String atcCode;

    private Double score;
}