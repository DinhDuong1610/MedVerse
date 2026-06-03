package com.medverse.backend.service.admin;

import com.medverse.backend.entity.AuditLog;
import com.medverse.backend.payload.admin.AuditLogDto;
import com.medverse.backend.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class AdminAuditService {

    private final AuditLogRepository auditLogRepository;

    public Page<AuditLogDto> searchAuditLogs(
            String action,
            String entityType,
            String actorEmail,
            String result,
            LocalDateTime from,
            LocalDateTime to,
            Pageable pageable) {
        Specification<AuditLog> spec = Specification.where(null);

        if (action != null && !action.isBlank()) {
            spec = spec
                    .and((root, query, cb) -> cb.like(cb.lower(root.get("action")), "%" + action.toLowerCase() + "%"));
        }

        if (entityType != null && !entityType.isBlank()) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("entityType"), entityType));
        }

        if (actorEmail != null && !actorEmail.isBlank()) {
            spec = spec.and((root, query, cb) -> cb.like(cb.lower(root.get("actorEmail")),
                    "%" + actorEmail.toLowerCase() + "%"));
        }

        if (result != null && !result.isBlank()) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("result"), result));
        }

        if (from != null) {
            spec = spec.and((root, query, cb) -> cb.greaterThanOrEqualTo(root.get("occurredAt"), from));
        }

        if (to != null) {
            spec = spec.and((root, query, cb) -> cb.lessThanOrEqualTo(root.get("occurredAt"), to));
        }

        return auditLogRepository.findAll(spec, pageable)
                .map(this::toDto);
    }

    private AuditLogDto toDto(AuditLog log) {
        return AuditLogDto.builder()
                .id(log.getId())
                .actorId(log.getActorId())
                .actorEmail(log.getActorEmail())
                .action(log.getAction())
                .entityType(log.getEntityType())
                .entityId(log.getEntityId())
                .result(log.getResult())
                .details(log.getDetails())
                .occurredAt(log.getOccurredAt())
                .build();
    }
}