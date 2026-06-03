package com.medverse.backend.payload.ehr;

import lombok.Data;

@Data
public class MedicalRecordUpdateRequest {
    private String chiefComplaint;
    private String symptoms;
    private String clinicalNote;
    private String diagnosisText;
    private String treatmentPlan;
    private String followUpNote;
}