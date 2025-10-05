package com.medverse.backend.service;

import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.medverse.backend.entity.Permission;
import com.medverse.backend.entity.Role;
import com.medverse.backend.payload.rbac.PermissionDto;
import com.medverse.backend.payload.rbac.RoleDto;
import com.medverse.backend.repository.PermissionRepository;
import com.medverse.backend.repository.RoleRepository;

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
