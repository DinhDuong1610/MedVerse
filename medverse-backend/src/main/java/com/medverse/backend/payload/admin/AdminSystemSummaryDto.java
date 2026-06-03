package com.medverse.backend.payload.admin;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AdminSystemSummaryDto {
    private long userCount;
    private long auditLogCount;
    private long notificationCount;
    private long medicationCount;
    private long appointmentCount;

    private String backendStatus;
    private String databaseStatus;
}