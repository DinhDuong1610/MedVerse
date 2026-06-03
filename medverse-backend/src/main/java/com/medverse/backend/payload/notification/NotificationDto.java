package com.medverse.backend.payload.notification;

import com.medverse.backend.utils.enumeration.NotificationType;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class NotificationDto {
    private UUID id;
    private NotificationType type;

    private String title;
    private String message;

    private String entityType;
    private String entityId;

    private boolean read;
    private LocalDateTime readAt;
    private LocalDateTime createdAt;
}