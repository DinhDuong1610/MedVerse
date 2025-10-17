package com.medverse.backend.service;

import com.medverse.backend.entity.AuditLog;
import com.medverse.backend.payload.audit.AuditLogDto;
import com.medverse.backend.payload.audit.AuditLogFilterRequest;
import com.medverse.backend.repository.AuditLogRepository;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;

    public Page<AuditLogDto> searchLogs(AuditLogFilterRequest filters, Pageable pageable) {
        Specification<AuditLog> spec = (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (StringUtils.hasText(filters.getActorEmail())) {
                predicates.add(criteriaBuilder.like(criteriaBuilder.lower(root.get("actorEmail")),
                        "%" + filters.getActorEmail().toLowerCase() + "%"));
            }
            if (StringUtils.hasText(filters.getEntityType())) {
                predicates.add(criteriaBuilder.equal(root.get("entityType"), filters.getEntityType()));
            }
            if (StringUtils.hasText(filters.getEntityId())) {
                predicates.add(criteriaBuilder.equal(root.get("entityId"), filters.getEntityId()));
            }
            if (filters.getStartDate() != null) {
                predicates.add(criteriaBuilder.greaterThanOrEqualTo(root.get("occurredAt"), filters.getStartDate()));
            }
            if (filters.getEndDate() != null) {
                predicates.add(criteriaBuilder.lessThanOrEqualTo(root.get("occurredAt"), filters.getEndDate()));
            }

            return criteriaBuilder.and(predicates.toArray(new Predicate[0]));
        };

        Page<AuditLog> auditLogPage = auditLogRepository.findAll(spec, pageable);

        return auditLogPage.map(this::mapToDto);
    }

    private AuditLogDto mapToDto(AuditLog auditLog) {
        return AuditLogDto.builder()
                .id(auditLog.getId())
                .actorEmail(auditLog.getActorEmail())
                .action(auditLog.getAction())
                .entityType(auditLog.getEntityType())
                .entityId(auditLog.getEntityId())
                .details(auditLog.getDetails())
                .occurredAt(auditLog.getOccurredAt())
                .build();
    }
}
