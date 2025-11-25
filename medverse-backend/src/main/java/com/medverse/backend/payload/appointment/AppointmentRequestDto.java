package com.medverse.backend.payload.appointment;

import com.medverse.backend.utils.enumeration.AppointmentRequestStatus;
import com.medverse.backend.utils.enumeration.AppointmentType;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class AppointmentRequestDto {
    private UUID id;

    private UUID patientId;
    private String patientName;

    private UUID doctorId;
    private String doctorName;

    private UUID specialtyId;
    private String specialtyName;

    private LocalDate desiredDate;
    private String desiredTime;

    private AppointmentType type;
    private AppointmentRequestStatus status;
    private String symptoms;
    private String rejectionReason;

    private LocalDateTime createdAt;
}