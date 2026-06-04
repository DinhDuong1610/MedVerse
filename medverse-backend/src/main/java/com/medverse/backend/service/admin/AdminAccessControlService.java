package com.medverse.backend.service.admin;

import com.medverse.backend.entity.Permission;
import com.medverse.backend.entity.Role;
import com.medverse.backend.payload.admin.AdminPermissionDto;
import com.medverse.backend.payload.admin.AdminRolePermissionDto;
import com.medverse.backend.payload.admin.AdminUpdateRolePermissionsRequest;
import com.medverse.backend.repository.PermissionRepository;
import com.medverse.backend.repository.RoleRepository;
import com.medverse.backend.service.AuditService;
import com.medverse.backend.utils.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminAccessControlService {

    private static final String ADMIN_ROLE_CODE = "ADMIN";
    private static final String ADMIN_PANEL_PERMISSION = "ADMIN_PANEL:ACCESS";

    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;
    private final AuditService auditService;

    @Transactional(readOnly = true)
    public List<AdminRolePermissionDto> getRoles() {
        return roleRepository.findAllByOrderByCodeAsc()
                .stream()
                .map(this::toRoleDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<AdminPermissionDto> getPermissions() {
        return permissionRepository.findAllByOrderByCodeAsc()
                .stream()
                .map(this::toPermissionDto)
                .toList();
    }

    @Transactional
    public AdminRolePermissionDto updateRolePermissions(UUID roleId, AdminUpdateRolePermissionsRequest request) {
        Role role = roleRepository.findById(roleId)
                .orElseThrow(() -> new ResourceNotFoundException("Role", "id", roleId));

        Set<String> requestedCodes = normalizePermissionCodes(request.getPermissionCodes());

        if (ADMIN_ROLE_CODE.equals(role.getCode()) && !requestedCodes.contains(ADMIN_PANEL_PERMISSION)) {
            throw new IllegalStateException("ADMIN role must keep ADMIN_PANEL:ACCESS permission.");
        }

        Set<Permission> permissions = requestedCodes.isEmpty()
                ? new HashSet<>()
                : permissionRepository.findByCodeIn(requestedCodes);

        validateAllPermissionsExist(requestedCodes, permissions);

        Set<String> oldCodes = role.getPermissions()
                .stream()
                .map(Permission::getCode)
                .collect(Collectors.toCollection(LinkedHashSet::new));

        role.setPermissions(new HashSet<>(permissions));
        Role saved = roleRepository.save(role);

        auditService.record(
                "ADMIN_UPDATE_ROLE_PERMISSIONS",
                "ROLE",
                saved.getId().toString(),
                "Updated role " + saved.getCode()
                        + " permissions from " + oldCodes
                        + " to " + requestedCodes);

        return toRoleDto(saved);
    }

    private void validateAllPermissionsExist(Set<String> requestedCodes, Set<Permission> permissions) {
        Set<String> foundCodes = permissions.stream()
                .map(Permission::getCode)
                .collect(Collectors.toSet());

        Set<String> missingCodes = requestedCodes.stream()
                .filter(code -> !foundCodes.contains(code))
                .collect(Collectors.toCollection(LinkedHashSet::new));

        if (!missingCodes.isEmpty()) {
            throw new IllegalArgumentException("Permission code(s) not found: " + missingCodes);
        }
    }

    private Set<String> normalizePermissionCodes(Set<String> codes) {
        if (codes == null) {
            return new LinkedHashSet<>();
        }

        return codes.stream()
                .filter(code -> code != null && !code.trim().isBlank())
                .map(code -> code.trim().toUpperCase())
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    private AdminRolePermissionDto toRoleDto(Role role) {
        List<AdminPermissionDto> permissions = role.getPermissions()
                .stream()
                .sorted(Comparator.comparing(Permission::getCode))
                .map(this::toPermissionDto)
                .toList();

        return AdminRolePermissionDto.builder()
                .id(role.getId())
                .code(role.getCode())
                .name(role.getName())
                .description(role.getDescription())
                .permissionCount(permissions.size())
                .permissions(permissions)
                .build();
    }

    private AdminPermissionDto toPermissionDto(Permission permission) {
        return AdminPermissionDto.builder()
                .id(permission.getId())
                .code(permission.getCode())
                .description(permission.getDescription())
                .groupName(resolveGroupName(permission.getCode()))
                .build();
    }

    private String resolveGroupName(String code) {
        if (code == null || code.isBlank()) {
            return "SYSTEM";
        }

        int separatorIndex = code.indexOf(":");

        if (separatorIndex <= 0) {
            return "SYSTEM";
        }

        return code.substring(0, separatorIndex);
    }
}