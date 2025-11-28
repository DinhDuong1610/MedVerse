package com.medverse.backend.payload.emr;

import lombok.Data;

import java.util.List;

@Data
public class MedicalRecordUpdateDto {
    private String visitReason;

    private String historyOfPresentIllness;
    private String pastMedicalHistory;
    private List<String> allergies;
    private String habits;
    private String familyHistory;

    private VitalSignsDto vitalSigns;

    private String physicalExamGeneral;
    private String physicalExamOrgan;

    private String mainDiagnosis;
    private String secondaryDiagnosis;
    private String prognosis;
    private String subclinicalTests;
    private String treatmentPlan;

    @Data
    public static class VitalSignsDto {
        private String bloodPressure;
        private Double pulse;
        private Double temperature;
        private Double respiratoryRate;
        private Double weight;
        private Double height;
        private Double bmi;
    }
}