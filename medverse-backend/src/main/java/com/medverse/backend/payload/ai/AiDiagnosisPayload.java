package com.medverse.backend.payload.ai;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.util.List;

public class AiDiagnosisPayload {

    @Data
    @Builder
    public static class Request {
        @JsonProperty("medical_history")
        private MedicalHistory medicalHistory;

        @JsonProperty("diagnosis_text_input")
        private String diagnosisTextInput;
    }

    @Data
    @Builder
    public static class MedicalHistory {
        @JsonProperty("history_of_present_illness")
        private String historyOfPresentIllness;

        @JsonProperty("past_medical_history")
        private String pastMedicalHistory;

        @JsonProperty("allergies")
        private String allergies;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Response {
        @JsonProperty("fhir_bundle")
        private FhirBundle fhirBundle;

        private String status;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FhirBundle {
        private String resourceType;
        private List<FhirEntry> entry;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FhirEntry {
        private FhirResource resource;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FhirResource {
        private String resourceType;
        private List<FhirCategory> category;
        private FhirCode code;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FhirCategory {
        private List<FhirCoding> coding;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FhirCode {
        private List<FhirCoding> coding;
        private String text;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FhirCoding {
        private String code;
        private String display;
        private String system;
    }
}