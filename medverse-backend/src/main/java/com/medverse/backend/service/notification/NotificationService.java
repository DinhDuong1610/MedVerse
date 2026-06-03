package com.medverse.backend.service.notification;

import com.medverse.backend.entity.Notification;
import com.medverse.backend.entity.User;
import com.medverse.backend.payload.notification.NotificationDto;
import com.medverse.backend.repository.NotificationRepository;
import com.medverse.backend.repository.UserRepository;
import com.medverse.backend.utils.enumeration.NotificationType;
import com.medverse.backend.utils.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    @Transactional
    public void notify(
            User recipient,
            NotificationType type,
            String title,
            String message,
            String entityType,
            String entityId) {
        if (recipient == null) {
            return;
        }

        Notification notification = Notification.builder()
                .recipient(recipient)
                .type(type)
                .title(title)
                .message(message)
                .entityType(entityType)
                .entityId(entityId)
                .build();

        notificationRepository.save(notification);
    }

    @Transactional
    public void notify(
            UUID recipientId,
            NotificationType type,
            String title,
            String message,
            String entityType,
            String entityId) {
        User recipient = userRepository.findById(recipientId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", recipientId));

        notify(recipient, type, title, message, entityType, entityId);
    }

    public Page<NotificationDto> getMyNotifications(UUID recipientId, Pageable pageable) {
        return notificationRepository
                .findByRecipientIdOrderByCreatedAtDesc(recipientId, pageable)
                .map(this::toDto);
    }

    public long countUnread(UUID recipientId) {
        return notificationRepository.countByRecipientIdAndReadAtIsNull(recipientId);
    }

    @Transactional
    public NotificationDto markAsRead(UUID notificationId, UUID recipientId) {
        Notification notification = notificationRepository
                .findByIdAndRecipientId(notificationId, recipientId)
                .orElseThrow(() -> new ResourceNotFoundException("Notification", "id", notificationId));

        if (notification.getReadAt() == null) {
            notification.setReadAt(LocalDateTime.now());
            notificationRepository.save(notification);
        }

        return toDto(notification);
    }

    @Transactional
    public void markAllAsRead(UUID recipientId) {
        Page<Notification> page = notificationRepository.findByRecipientIdOrderByCreatedAtDesc(
                recipientId,
                Pageable.unpaged());

        LocalDateTime now = LocalDateTime.now();

        page.getContent().stream()
                .filter(notification -> notification.getReadAt() == null)
                .forEach(notification -> notification.setReadAt(now));

        notificationRepository.saveAll(page.getContent());
    }

    private NotificationDto toDto(Notification notification) {
        return NotificationDto.builder()
                .id(notification.getId())
                .type(notification.getType())
                .title(notification.getTitle())
                .message(notification.getMessage())
                .entityType(notification.getEntityType())
                .entityId(notification.getEntityId())
                .read(notification.getReadAt() != null)
                .readAt(notification.getReadAt())
                .createdAt(notification.getCreatedAt())
                .build();
    }
}