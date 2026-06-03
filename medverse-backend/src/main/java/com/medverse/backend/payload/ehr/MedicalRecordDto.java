package com.medverse.backend.payload.ehr;

import com.medverse.backend.utils.enumeration.MedicalRecordStatus;
import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.UUID;

@Data
@Builder
public class MedicalRecordDto {
    private UUID id;
    private UUID appointmentId;
    private UUID patientId;
    private String patientEmail;
    private String patientName;
    private UUID doctorId;
    private String doctorEmail;
    private String doctorName;

    private String chiefComplaint;
    private String symptoms;
    private String clinicalNote;
    private String diagnosisText;
    private String treatmentPlan;
    private String followUpNote;
    private MedicalRecordStatus status;

    private List<MedicalRecordDiagnosisDto> diagnoses;
}