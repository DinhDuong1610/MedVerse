package com.medverse.backend.payload.appointment;

import com.medverse.backend.utils.enumeration.WorkSlotStatus;
import lombok.Data;

import java.time.OffsetDateTime;
import java.util.UUID;

@Data
public class WorkSlotDto {
    private UUID id;
    private UUID doctorId;
    private String doctorName;
    private OffsetDateTime startTime;
    private OffsetDateTime endTime;
    private WorkSlotStatus status;
}