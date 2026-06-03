package com.medverse.backend.payload.prescription;

import com.medverse.backend.utils.enumeration.PrescriptionAlertSeverity;
import com.medverse.backend.utils.enumeration.PrescriptionAlertType;
import com.medverse.backend.utils.enumeration.PrescriptionDoctorAction;
import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class PrescriptionSafetyAlertDto {
    private UUID id;
    private UUID prescriptionId;
    private PrescriptionAlertType type;
    private PrescriptionAlertSeverity severity;
    private String title;
    private String message;
    private String recommendation;
    private String aiPayload;
    private PrescriptionDoctorAction doctorAction;
    private String doctorNote;
}