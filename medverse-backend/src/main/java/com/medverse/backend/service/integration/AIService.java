package com.medverse.backend.service.integration;

import com.medverse.backend.payload.ai.AiDiagnosisPayload;
import com.medverse.backend.payload.ai.AiInteractionPayload;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
@RequiredArgsConstructor
@Slf4j
public class AIService {

    private final RestTemplate restTemplate;

    @Value("${ai-service.url}")
    private String aiServiceUrl;

    @Value("${ai-service.endpoint.diagnosis}")
    private String diagnosisEndpoint;

    @Value("${ai-service.endpoint.interaction}")
    private String interactionEndpoint;

    public AiDiagnosisPayload.Response analyzeDiagnosis(AiDiagnosisPayload.Request requestPayload) {
        String url = aiServiceUrl + diagnosisEndpoint;
        log.info("Calling AI Diagnosis Service at: {}", url);

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<AiDiagnosisPayload.Request> entity = new HttpEntity<>(requestPayload, headers);

            return restTemplate.postForObject(url, entity, AiDiagnosisPayload.Response.class);
        } catch (Exception e) {
            log.error("Failed to call AI Diagnosis Service", e);
            return null;
        }
    }

    public AiInteractionPayload.Response checkDrugInteraction(AiInteractionPayload.Request requestPayload) {
        String url = aiServiceUrl + interactionEndpoint;
        log.info("Calling AI Interaction Service at: {}", url);

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<AiInteractionPayload.Request> entity = new HttpEntity<>(requestPayload, headers);

            return restTemplate.postForObject(url, entity, AiInteractionPayload.Response.class);
        } catch (Exception e) {
            log.error("Failed to call AI Interaction Service", e);
            return new AiInteractionPayload.Response();
        }
    }
}