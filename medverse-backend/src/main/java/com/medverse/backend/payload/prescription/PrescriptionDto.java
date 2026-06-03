package com.medverse.backend.payload.prescription;

import com.medverse.backend.utils.enumeration.PrescriptionStatus;
import lombok.Builder;
import lombok.Data;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
public class PrescriptionDto {
    private UUID id;
    private UUID medicalRecordId;
    private UUID appointmentId;

    private UUID patientId;
    private String patientEmail;
    private String patientName;

    private UUID doctorId;
    private String doctorEmail;
    private String doctorName;

    private PrescriptionStatus status;
    private String note;
    private OffsetDateTime finalizedAt;

    private List<PrescriptionItemDto> items;
    private List<PrescriptionSafetyAlertDto> safetyAlerts;
}