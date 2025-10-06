package com.medverse.backend.controller.admin;

import com.medverse.backend.payload.AppResponse;
import com.medverse.backend.payload.rbac.PermissionDto;
import com.medverse.backend.payload.rbac.RoleCreateRequest;
import com.medverse.backend.payload.rbac.RoleDto;
import com.medverse.backend.payload.rbac.UpdateRolePermissionsRequest;
import com.medverse.backend.service.RbacService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

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

    @GetMapping("/roles/{roleId}")
    @Operation(summary = "Get a single role by ID", description = "Retrieves detailed information for a specific role, including its assigned permissions.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Role details retrieved successfully"),
            @ApiResponse(responseCode = "403", description = "Forbidden - User does not have RBAC:MANAGE permission", content = @Content),
            @ApiResponse(responseCode = "404", description = "Role not found", content = @Content)
    })
    public ResponseEntity<AppResponse<RoleDto>> getRoleById(@PathVariable UUID roleId) {
        RoleDto role = rbacService.findRoleById(roleId);
        return ResponseEntity.ok(new AppResponse<>("SUCCESS", "Role details retrieved successfully.", role, null));
    }

    @PostMapping("/roles")
    @Operation(summary = "Create a new custom role", description = "Creates a new, non-system role. The role code must be unique and not conflict with default roles (PATIENT, DOCTOR,...).")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Role created successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid input data", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden - User does not have RBAC:MANAGE permission", content = @Content),
            @ApiResponse(responseCode = "409", description = "Role with this code already exists", content = @Content)
    })
    public ResponseEntity<AppResponse<RoleDto>> createRole(@Valid @RequestBody RoleCreateRequest request) {
        RoleDto newRole = rbacService.createRole(request);
        return new ResponseEntity<>(new AppResponse<>("SUCCESS", "Role created successfully.", newRole, null),
                HttpStatus.CREATED);
    }

    @PutMapping("/roles/{roleId}/permissions")
    @Operation(summary = "Update all permissions for a specific role", description = "Assigns a new set of permissions to a role. This is a full replacement; any permissions not included in the request will be revoked.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Role permissions updated successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid input data", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden - User does not have RBAC:MANAGE permission", content = @Content),
            @ApiResponse(responseCode = "404", description = "Role or one of the Permissions not found", content = @Content)
    })
    public ResponseEntity<AppResponse<RoleDto>> updateRolePermissions(
            @PathVariable UUID roleId,
            @Valid @RequestBody UpdateRolePermissionsRequest request) {
        RoleDto updatedRole = rbacService.updateRolePermissions(roleId, request);
        return ResponseEntity
                .ok(new AppResponse<>("SUCCESS", "Role permissions updated successfully.", updatedRole, null));
    }

    @DeleteMapping("/roles/{roleId}")
    @PreAuthorize("hasAuthority('RBAC:MANAGE')")
    @Operation(summary = "Soft delete a custom role", description = "Soft deletes a role by setting its 'deleted_at' timestamp. The role is not permanently removed. System roles and roles currently in use cannot be deleted.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "204", description = "Role soft-deleted successfully"),
            @ApiResponse(responseCode = "403", description = "Forbidden - User does not have RBAC:MANAGE permission", content = @Content),
            @ApiResponse(responseCode = "404", description = "Role not found", content = @Content),
            @ApiResponse(responseCode = "409", description = "Conflict - Cannot delete a system role or a role that is currently in use", content = @Content)
    })
    public ResponseEntity<Void> deleteRole(@PathVariable UUID roleId) {
        rbacService.deleteRole(roleId);
        return ResponseEntity.noContent().build();
    }
}
