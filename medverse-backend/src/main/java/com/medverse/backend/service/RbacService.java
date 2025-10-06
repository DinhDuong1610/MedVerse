package com.medverse.backend.service;

import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.medverse.backend.entity.Permission;
import com.medverse.backend.entity.Role;
import com.medverse.backend.payload.rbac.PermissionDto;
import com.medverse.backend.payload.rbac.RoleCreateRequest;
import com.medverse.backend.payload.rbac.RoleDto;
import com.medverse.backend.payload.rbac.UpdateRolePermissionsRequest;
import com.medverse.backend.repository.PermissionRepository;
import com.medverse.backend.repository.RoleRepository;
import com.medverse.backend.utils.enumeration.RoleCode;
import com.medverse.backend.utils.exception.DuplicateResourceException;
import com.medverse.backend.utils.exception.ResourceNotFoundException;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class RbacService {
    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;

    public List<PermissionDto> findAllPermissions() {
        log.info("Fetching all available permissions");
        return permissionRepository.findAll().stream()
                .map(this::mapToPermissionDto)
                .sorted(Comparator.comparing(PermissionDto::getCode))
                .collect(Collectors.toList());
    }

    public List<RoleDto> findAllRoles() {
        log.info("Fetching all roles with their permissions");
        return roleRepository.findAll().stream()
                .map(this::mapToRoleDto)
                .sorted(Comparator.comparing(RoleDto::getCode))
                .collect(Collectors.toList());
    }

    @Transactional
    public RoleDto createRole(RoleCreateRequest request) {
        boolean isSystemRole = Arrays.stream(RoleCode.values())
                .anyMatch(sysRole -> sysRole.name().equals(request.getCode()));
        if (isSystemRole) {
            throw new DuplicateResourceException("Role", "code",
                    request.getCode() + " (This is a system-reserved code)");
        }

        if (roleRepository.findByCode(request.getCode()).isPresent()) {
            throw new DuplicateResourceException("Role", "code", request.getCode());
        }

        Role newRole = new Role();
        newRole.setCode(request.getCode());
        newRole.setName(request.getName());
        newRole.setDescription(request.getDescription());

        Role savedRole = roleRepository.save(newRole);
        log.info("ADMIN ACTION: New role '{}' created with code '{}'", savedRole.getName(), savedRole.getCode());
        return mapToRoleDto(savedRole);
    }

    @Transactional
    public RoleDto updateRolePermissions(UUID roleId, UpdateRolePermissionsRequest request) {
        Role role = roleRepository.findById(roleId)
                .orElseThrow(() -> new ResourceNotFoundException("Role", "id", roleId));

        Set<Permission> foundPermissions = permissionRepository.findByCodeIn(request.getPermissionCodes());

        if (foundPermissions.size() != request.getPermissionCodes().size()) {
            Set<String> foundCodes = foundPermissions.stream().map(Permission::getCode).collect(Collectors.toSet());
            request.getPermissionCodes().removeAll(foundCodes);
            throw new ResourceNotFoundException("Permissions not found with codes", "codes",
                    request.getPermissionCodes().toString());
        }

        role.setPermissions(foundPermissions);
        Role updatedRole = roleRepository.save(role);
        log.info("ADMIN ACTION: Updated permissions for role '{}'. It now has {} permissions.", updatedRole.getName(),
                updatedRole.getPermissions().size());

        return mapToRoleDto(updatedRole);
    }

    public RoleDto findRoleById(UUID roleId) {
        log.info("Fetching details for role ID: {}", roleId);
        Role role = roleRepository.findById(roleId)
                .orElseThrow(() -> new ResourceNotFoundException("Role", "id", roleId));
        return mapToRoleDto(role);
    }

    @Transactional
    public void deleteRole(UUID roleId) {
        Role role = roleRepository.findById(roleId)
                .orElseThrow(() -> new ResourceNotFoundException("Role", "id", roleId));

        boolean isSystemRole = Arrays.stream(RoleCode.values())
                .anyMatch(sysRole -> sysRole.name().equals(role.getCode()));
        if (isSystemRole) {
            throw new DuplicateResourceException("Role", "code", role.getCode() + " (System roles cannot be deleted)");
        }

        if (roleRepository.isRoleAssignedToUsers(roleId)) {
            throw new DuplicateResourceException("Role", "id",
                    roleId + " (Cannot delete a role that is currently assigned to users)");
        }

        roleRepository.delete(role);
        log.warn("ADMIN ACTION: Role '{}' with code '{}' has been soft-deleted.", role.getName(), role.getCode());
    }

    private RoleDto mapToRoleDto(Role role) {
        return RoleDto.builder()
                .id(role.getId())
                .code(role.getCode().toString())
                .name(role.getName())
                .description(role.getDescription())
                .permissions(role.getPermissions().stream()
                        .map(this::mapToPermissionDto)
                        .sorted(Comparator.comparing(PermissionDto::getCode))
                        .collect(Collectors.toSet()))
                .build();
    }

    private PermissionDto mapToPermissionDto(Permission permission) {
        return PermissionDto.builder()
                .code(permission.getCode())
                .description(permission.getDescription())
                .build();
    }
}
