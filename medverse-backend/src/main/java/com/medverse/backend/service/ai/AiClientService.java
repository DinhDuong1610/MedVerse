package com.medverse.backend.service.ai;

import com.medverse.backend.payload.ai.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;

@Service
@RequiredArgsConstructor
@Slf4j
public class AiClientService {

    private final WebClient aiWebClient;
    private final Duration aiTimeout;

    public AiHealthDto health() {
        try {
            return aiWebClient.get()
                    .uri("/api/v1/health")
                    .retrieve()
                    .bodyToMono(AiHealthDto.class)
                    .timeout(aiTimeout)
                    .block();
        } catch (Exception e) {
            log.warn("AI health check failed: {}", e.getMessage());

            AiHealthDto fallback = new AiHealthDto();
            fallback.setService("medverse-ai");
            fallback.setStatus("DOWN");
            fallback.setFallbackEnabled(false);
            return fallback;
        }
    }

    public AiAtcAutocompleteResponse autocompleteAtc(String q, Integer topK) {
        try {
            return aiWebClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/api/v1/autocomplete/atc")
                            .queryParam("q", q)
                            .queryParam("top_k", topK != null ? topK : 10)
                            .build())
                    .retrieve()
                    .bodyToMono(AiAtcAutocompleteResponse.class)
                    .timeout(aiTimeout)
                    .block();
        } catch (Exception e) {
            log.warn("AI ATC autocomplete failed: {}", e.getMessage());
            AiAtcAutocompleteResponse response = new AiAtcAutocompleteResponse();
            response.setSuggestions(java.util.List.of());
            return response;
        }
    }

    public AiIcdAutocompleteResponse autocompleteIcd(String q, Integer topK) {
        try {
            return aiWebClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/api/v1/autocomplete/icd")
                            .queryParam("q", q)
                            .queryParam("top_k", topK != null ? topK : 10)
                            .build())
                    .retrieve()
                    .bodyToMono(AiIcdAutocompleteResponse.class)
                    .timeout(aiTimeout)
                    .block();
        } catch (Exception e) {
            log.warn("AI ICD autocomplete failed: {}", e.getMessage());
            AiIcdAutocompleteResponse response = new AiIcdAutocompleteResponse();
            response.setResults(java.util.List.of());
            return response;
        }
    }

    public AiAnalyzeTextResponse analyzeText(AiAnalyzeTextRequest request) {
        try {
            return aiWebClient.post()
                    .uri("/api/v1/analyze-text")
                    .bodyValue(request)
                    .retrieve()
                    .bodyToMono(AiAnalyzeTextResponse.class)
                    .timeout(aiTimeout)
                    .block();
        } catch (Exception e) {
            log.warn("AI analyze-text failed: {}", e.getMessage());
            AiAnalyzeTextResponse response = new AiAnalyzeTextResponse();
            response.getData().put("status", "FALLBACK");
            response.getData().put("message", "AI analyze-text unavailable.");
            response.getData().put("entities", java.util.List.of());
            return response;
        }
    }

    public AiCdsCheckResponse checkPrescription(AiCdsCheckRequest request) {
        try {
            return aiWebClient.post()
                    .uri("/api/v1/cds/check-prescription")
                    .bodyValue(request)
                    .retrieve()
                    .bodyToMono(AiCdsCheckResponse.class)
                    .timeout(aiTimeout)
                    .block();
        } catch (Exception e) {
            log.warn("AI CDS check failed: {}", e.getMessage());
            AiCdsCheckResponse response = new AiCdsCheckResponse();
            response.setStatus("FALLBACK");
            response.setMode("BACKEND_FALLBACK");
            response.setAlerts(java.util.List.of());
            return response;
        }
    }
}