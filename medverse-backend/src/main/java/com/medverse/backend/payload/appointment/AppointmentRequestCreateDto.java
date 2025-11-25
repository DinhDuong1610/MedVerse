package com.medverse.backend.payload.appointment;

import com.medverse.backend.utils.enumeration.AppointmentType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;
import java.util.UUID;

@Data
public class AppointmentRequestCreateDto {

    @Schema(description = "ID of the doctor (Optional if choosing by specialty)")
    private UUID doctorId;

    @Schema(description = "ID of the specialty (Required if doctor is not selected)")
    private UUID specialtyId;

    @Schema(description = "Desired date for the appointment", example = "2023-12-01")
    @NotNull(message = "Desired date is required")
    @Future(message = "Desired date must be in the future")
    private LocalDate desiredDate;

    @Schema(description = "Desired time (e.g., 'Morning', '09:00')", example = "Morning")
    private String desiredTime;

    @Schema(description = "Type of appointment: ONLINE or OFFLINE")
    @NotNull(message = "Appointment type is required")
    private AppointmentType type;

    @Schema(description = "Symptoms description")
    private String symptoms;
}