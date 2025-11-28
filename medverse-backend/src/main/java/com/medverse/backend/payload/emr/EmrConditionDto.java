package com.medverse.backend.payload.emr;

import com.medverse.backend.utils.enumeration.ConditionType;
import lombok.Data;
import java.time.OffsetDateTime;
import java.util.UUID;

@Data
public class EmrConditionDto {
    private UUID id;
    private String conditionCode;
    private String description;
    private ConditionType conditionType;
    private OffsetDateTime recordedAt;
}