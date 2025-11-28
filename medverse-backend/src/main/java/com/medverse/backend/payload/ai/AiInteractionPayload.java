package com.medverse.backend.payload.ai;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.util.List;

public class AiInteractionPayload {

    @Data
    @Builder
    public static class Request {
        @JsonProperty("target_medications")
        private List<TargetMedication> targetMedications;

        @JsonProperty("patient_context")
        private PatientContext patientContext;
    }

    @Data
    @Builder
    public static class TargetMedication {
        @JsonProperty("atc_code")
        private String atcCode;
        private String name;
        private String dose;
        private String route;
    }

    @Data
    @Builder
    public static class PatientContext {
        private Demographics demographics;
        private List<CodedEntity> allergies;
        private List<ConditionEntity> conditions;
        @JsonProperty("active_medications")
        private List<CodedEntity> activeMedications;
    }

    @Data
    @Builder
    public static class Demographics {
        private String gender;
        private int age;
        private double weight;
        @JsonProperty("is_pregnant")
        private boolean isPregnant;
        @JsonProperty("is_breastfeeding")
        private boolean isBreastfeeding;
    }

    @Data
    @Builder
    public static class CodedEntity {
        private String code;
        private String system;
        private String text;
    }

    @Data
    @Builder
    public static class ConditionEntity {
        private String code;
        private String system;
        private String type;
        private String text;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Response {
        private List<Alert> alerts;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Alert {
        private String type;
        private String severity;
        private String title;
        private String message;
    }
}
