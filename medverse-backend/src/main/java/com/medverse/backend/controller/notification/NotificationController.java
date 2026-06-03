package com.medverse.backend.controller.notification;

import com.medverse.backend.entity.User;
import com.medverse.backend.payload.AppResponse;
import com.medverse.backend.payload.notification.NotificationDto;
import com.medverse.backend.service.notification.NotificationService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/v1/notifications")
@RequiredArgsConstructor
@Tag(name = "Notifications", description = "User-facing notifications")
@SecurityRequirement(name = "bearerAuth")
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<AppResponse<Page<NotificationDto>>> getMyNotifications(
            @AuthenticationPrincipal User currentUser,
            @ParameterObject @PageableDefault(size = 20, sort = "createdAt") Pageable pageable) {
        Page<NotificationDto> page = notificationService.getMyNotifications(currentUser.getId(), pageable);

        return ResponseEntity.ok(
                new AppResponse<>("SUCCESS", "Notifications retrieved.", page, null));
    }

    @GetMapping("/unread-count")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<AppResponse<Map<String, Long>>> countUnread(
            @AuthenticationPrincipal User currentUser) {
        long count = notificationService.countUnread(currentUser.getId());

        return ResponseEntity.ok(
                new AppResponse<>("SUCCESS", "Unread count retrieved.", Map.of("count", count), null));
    }

    @PatchMapping("/{id}/read")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<AppResponse<NotificationDto>> markAsRead(
            @AuthenticationPrincipal User currentUser,
            @PathVariable UUID id) {
        NotificationDto dto = notificationService.markAsRead(id, currentUser.getId());

        return ResponseEntity.ok(
                new AppResponse<>("SUCCESS", "Notification marked as read.", dto, null));
    }

    @PatchMapping("/read-all")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<AppResponse<Void>> markAllAsRead(
            @AuthenticationPrincipal User currentUser) {
        notificationService.markAllAsRead(currentUser.getId());

        return ResponseEntity.ok(
                new AppResponse<>("SUCCESS", "All notifications marked as read.", null, null));
    }
}