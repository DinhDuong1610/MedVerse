package com.medverse.backend.payload.emr;

import com.medverse.backend.utils.enumeration.ObservationType;
import lombok.Data;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Data
public class EmrObservationDto {
    private UUID id;
    private ObservationType observationType;
    private String standardCode;
    private String description;

    private BigDecimal valueQuantity;
    private String valueUnit;
    private String valueText;

    private OffsetDateTime issuedAt;
}