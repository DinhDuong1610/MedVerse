package com.medverse.backend.payload.appointment;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.OffsetDateTime;

@Data
public class WorkSlotCreateRequest {

    @Schema(description = "Start time of the slot", example = "2023-11-20T08:00:00+07:00")
    @NotNull(message = "Start time is required")
    @Future(message = "Start time must be in the future")
    private OffsetDateTime startTime;

    @Schema(description = "End time of the slot", example = "2023-11-20T08:30:00+07:00")
    @NotNull(message = "End time is required")
    @Future(message = "End time must be in the future")
    private OffsetDateTime endTime;

    @AssertTrue(message = "End time must be after start time")
    private boolean isEndTimeAfterStartTime() {
        if (startTime == null || endTime == null) {
            return true;
        }
        return endTime.isAfter(startTime);
    }
}