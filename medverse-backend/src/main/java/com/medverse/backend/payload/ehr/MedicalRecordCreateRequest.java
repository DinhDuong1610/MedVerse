package com.medverse.backend.payload.ehr;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class MedicalRecordCreateRequest {

    @NotNull(message = "Appointment ID is required")
    private UUID appointmentId;

    private String chiefComplaint;
    private String symptoms;
    private String clinicalNote;
    private String diagnosisText;
    private String treatmentPlan;
    private String followUpNote;
}