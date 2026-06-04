package com.medverse.backend.controller.admin;

import com.medverse.backend.payload.AppResponse;
import com.medverse.backend.payload.admin.AdminPermissionDto;
import com.medverse.backend.payload.admin.AdminRolePermissionDto;
import com.medverse.backend.payload.admin.AdminUpdateRolePermissionsRequest;
import com.medverse.backend.service.admin.AdminAccessControlService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/v1/admin/access-control")
@RequiredArgsConstructor
@Tag(name = "Admin - Access Control", description = "Dynamic role and permission management")
@SecurityRequirement(name = "bearerAuth")
public class AdminAccessControlController {

    private final AdminAccessControlService adminAccessControlService;

    @GetMapping("/roles")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AppResponse<List<AdminRolePermissionDto>>> getRoles() {
        List<AdminRolePermissionDto> roles = adminAccessControlService.getRoles();

        return ResponseEntity.ok(
                new AppResponse<>("SUCCESS", "Roles retrieved.", roles, null));
    }

    @GetMapping("/permissions")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AppResponse<List<AdminPermissionDto>>> getPermissions() {
        List<AdminPermissionDto> permissions = adminAccessControlService.getPermissions();

        return ResponseEntity.ok(
                new AppResponse<>("SUCCESS", "Permissions retrieved.", permissions, null));
    }

    @PutMapping("/roles/{roleId}/permissions")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AppResponse<AdminRolePermissionDto>> updateRolePermissions(
            @PathVariable UUID roleId,
            @Valid @RequestBody AdminUpdateRolePermissionsRequest request) {

        AdminRolePermissionDto updated = adminAccessControlService.updateRolePermissions(roleId, request);

        return ResponseEntity.ok(
                new AppResponse<>("SUCCESS", "Role permissions updated.", updated, null));
    }
}