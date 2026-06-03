package com.medverse.backend.controller.admin;

import com.medverse.backend.payload.AppResponse;
import com.medverse.backend.payload.admin.AdminOperationsSummaryDto;
import com.medverse.backend.service.admin.AdminOperationsService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/v1/admin/operations")
@RequiredArgsConstructor
@Tag(name = "Admin - Operations Dashboard", description = "Operational summary for admin dashboard")
@SecurityRequirement(name = "bearerAuth")
public class AdminOperationsController {

    private final AdminOperationsService adminOperationsService;

    @GetMapping("/summary")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AppResponse<AdminOperationsSummaryDto>> getSummary() {
        AdminOperationsSummaryDto summary = adminOperationsService.getSummary();

        return ResponseEntity.ok(
                new AppResponse<>("SUCCESS", "Operations summary retrieved.", summary, null));
    }
}