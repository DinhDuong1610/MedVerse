package com.medverse.backend.payload.emr;

import com.medverse.backend.utils.enumeration.EncounterStatus;
import lombok.Data;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Data
public class EncounterDetailDto {
    private UUID id;
    private UUID appointmentId;

    private UUID patientId;
    private String patientName;
    private LocalDate patientDob;
    private String patientGender;
    private String patientPhoneNumber;
    private String patientAddress;

    private String doctorName;

    private EncounterStatus status;
    private OffsetDateTime startTime;
    private OffsetDateTime endTime;
    private String visitReason;

    private List<EmrConditionDto> diagnoses;

    private List<EmrObservationDto> observations;

    private PrescriptionDto prescription;
}