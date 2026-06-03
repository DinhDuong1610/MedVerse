package com.medverse.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.medverse.backend.entity.AuditLog;
import com.medverse.backend.entity.User;
import com.medverse.backend.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuditService {

    private final AuditLogRepository auditLogRepository;
    private final ObjectMapper objectMapper;

    public void record(String action, String entityType, String entityId, String details) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            User currentUser = (authentication != null && authentication.getPrincipal() instanceof User)
                    ? (User) authentication.getPrincipal()
                    : null;

            AuditLog logEntry = AuditLog.builder()
                    .action(action)
                    .entityType(entityType)
                    .entityId(entityId)
                    .result("SUCCESS")
                    .details(toJsonDetails(details))
                    .actorId(currentUser != null ? currentUser.getId() : null)
                    .actorEmail(currentUser != null ? currentUser.getEmail() : "SYSTEM")
                    .build();

            auditLogRepository.save(logEntry);
        } catch (Exception e) {
            log.error("Failed to save audit log for action '{}' on entity '{}:{}': {}",
                    action, entityType, entityId, e.getMessage());
        }
    }

    private String toJsonDetails(String details) {
        try {
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("message", details);
            return objectMapper.writeValueAsString(payload);
        } catch (Exception e) {
            return "{\"message\":\"Failed to serialize audit details\"}";
        }
    }
}