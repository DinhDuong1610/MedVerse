package com.medverse.backend.controller.admin;

import com.medverse.backend.payload.AppResponse;
import com.medverse.backend.payload.audit.AuditLogDto;
import com.medverse.backend.payload.audit.AuditLogFilterRequest;
import com.medverse.backend.service.AuditLogService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/admin/audit-logs")
@RequiredArgsConstructor
@Tag(name = "Admin - Audit Log", description = "APIs for viewing system activity logs")
@SecurityRequirement(name = "bearerAuth")
public class AuditLogController {

    private final AuditLogService auditLogService;

    @GetMapping
    @PreAuthorize("hasAuthority('AUDIT:READ')")
    @Operation(summary = "Search and paginate audit logs", description = "Retrieves a paginated list of audit logs. Supports filtering by various criteria.")
    public ResponseEntity<AppResponse<Page<AuditLogDto>>> searchAuditLogs(
            @ParameterObject AuditLogFilterRequest filters,
            @ParameterObject @PageableDefault(size = 10, sort = "occurredAt") Pageable pageable) {

        Page<AuditLogDto> resultPage = auditLogService.searchLogs(filters, pageable);
        return ResponseEntity.ok(new AppResponse<>("SUCCESS", "Audit logs retrieved successfully.", resultPage, null));
    }
}
