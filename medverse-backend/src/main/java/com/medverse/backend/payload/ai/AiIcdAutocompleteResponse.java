package com.medverse.backend.payload.ai;

import lombok.Data;

import java.util.List;

@Data
public class AiIcdAutocompleteResponse {
    private List<AiIcdSuggestionDto> results;
}