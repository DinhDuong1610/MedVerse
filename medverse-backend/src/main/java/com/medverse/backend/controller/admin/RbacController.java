package com.medverse.backend.controller.admin;

import com.medverse.backend.payload.AppResponse;
import com.medverse.backend.payload.rbac.PermissionDto;
import com.medverse.backend.payload.rbac.RoleDto;
import com.medverse.backend.service.RbacService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/v1/admin/rbac")
@RequiredArgsConstructor
@Tag(name = "Admin - RBAC Management", description = "APIs for managing Roles and Permissions")
@SecurityRequirement(name = "bearerAuth")
@PreAuthorize("hasAuthority('RBAC:MANAGE')")
public class RbacController {

    private final RbacService rbacService;

    @GetMapping("/permissions")
    @Operation(summary = "Get all available permissions", description = "Retrieves a list of all granular permissions defined in the system.")
    @ApiResponse(responseCode = "200", description = "Permissions retrieved successfully")
    public ResponseEntity<AppResponse<List<PermissionDto>>> getAllPermissions() {
        List<PermissionDto> permissions = rbacService.findAllPermissions();
        return ResponseEntity
                .ok(new AppResponse<>("SUCCESS", "Permissions retrieved successfully.", permissions, null));
    }

    @GetMapping("/roles")
    @Operation(summary = "Get all roles with their permissions", description = "Retrieves a list of all roles, including the set of permissions assigned to each role.")
    @ApiResponse(responseCode = "200", description = "Roles retrieved successfully")
    public ResponseEntity<AppResponse<List<RoleDto>>> getAllRoles() {
        List<RoleDto> roles = rbacService.findAllRoles();
        return ResponseEntity.ok(new AppResponse<>("SUCCESS", "Roles retrieved successfully.", roles, null));
    }
}
