package com.medverse.backend.payload.ai;

import lombok.Data;

import java.util.List;

@Data
public class AiAtcAutocompleteResponse {
    private List<AiAtcSuggestionDto> suggestions;
}