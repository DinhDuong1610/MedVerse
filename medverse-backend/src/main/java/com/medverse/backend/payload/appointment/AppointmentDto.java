package com.medverse.backend.payload.appointment;

import com.medverse.backend.utils.enumeration.AppointmentStatus;
import com.medverse.backend.utils.enumeration.AppointmentType;
import lombok.Data;

import java.time.OffsetDateTime;
import java.util.UUID;

@Data
public class AppointmentDto {
    private UUID id;

    private UUID patientId;
    private String patientName;

    private UUID doctorId;
    private String doctorName;

    private UUID workSlotId;

    private OffsetDateTime startTime;
    private OffsetDateTime endTime;

    private AppointmentStatus status;
    private AppointmentType type;

    private String meetingLink;
    private String diagnosis;
    private String cancellationReason;
}