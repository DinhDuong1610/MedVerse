package com.medverse.backend.payload.admin;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class AuditLogDto {
    private UUID id;

    private UUID actorId;
    private String actorEmail;

    private String action;
    private String entityType;
    private String entityId;

    private String result;
    private String details;

    private LocalDateTime occurredAt;
}