package com.medverse.backend.payload.ai;

import lombok.Data;

@Data
public class AiIcdSuggestionDto {
    private String code;
    private String label;
    private Double score;
}