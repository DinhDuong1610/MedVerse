package com.medverse.backend.controller.admin;

import com.medverse.backend.payload.AppResponse;
import com.medverse.backend.payload.admin.AdminSystemSummaryDto;
import com.medverse.backend.service.admin.AdminSystemService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/v1/admin/system")
@RequiredArgsConstructor
@Tag(name = "Admin - System Monitoring", description = "Basic system summary for admin")
@SecurityRequirement(name = "bearerAuth")
public class AdminSystemController {

    private final AdminSystemService adminSystemService;

    @GetMapping("/summary")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AppResponse<AdminSystemSummaryDto>> getSummary() {
        AdminSystemSummaryDto summary = adminSystemService.getSummary();

        return ResponseEntity.ok(
                new AppResponse<>("SUCCESS", "System summary retrieved.", summary, null));
    }
}