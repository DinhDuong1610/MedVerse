package com.medverse.backend.payload.emr;

import com.medverse.backend.utils.enumeration.PrescriptionStatus;
import lombok.Data;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Data
public class PrescriptionDto {
    private UUID id;
    private UUID encounterId;
    private String doctorName;
    private String patientName;
    private String note;
    private PrescriptionStatus status;
    private OffsetDateTime issuedAt;

    private List<PrescriptionItemDto> items;

    @Data
    public static class PrescriptionItemDto {
        private UUID id;
        private UUID medicationId;
        private String medicationName;
        private String medicationAtcCode;
        private String packingSpecification;

        private Integer dosage;
        private String unit;
        private String frequency;
        private String route;
        private String instruction;
    }
}