package com.medverse.backend.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

import java.util.HashSet;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.medverse.backend.entity.Permission;
import com.medverse.backend.entity.Role;
import com.medverse.backend.payload.rbac.RoleCreateRequest;
import com.medverse.backend.payload.rbac.RoleDto;
import com.medverse.backend.payload.rbac.UpdateRolePermissionsRequest;
import com.medverse.backend.repository.PermissionRepository;
import com.medverse.backend.repository.RoleRepository;
import com.medverse.backend.utils.exception.DuplicateResourceException;
import com.medverse.backend.utils.exception.ResourceNotFoundException;

@ExtendWith(MockitoExtension.class)
class RbacServiceTest {
    @Mock
    private RoleRepository roleRepository;

    @Mock
    private PermissionRepository permissionRepository;

    @Mock
    private AuditService auditService;

    private RbacService rbacService;

    @BeforeEach
    void setUp() {
        ObjectMapper realObjectMapper = new ObjectMapper();
        rbacService = new RbacService(roleRepository, permissionRepository, auditService, realObjectMapper);
    }

    @Test
    void createRole_Success() {
        RoleCreateRequest request = new RoleCreateRequest("TEST_ROLE", "Test Role", "A role for testing");

        when(roleRepository.findByCode("TEST_ROLE")).thenReturn(Optional.empty());
        when(roleRepository.save(any(Role.class))).thenAnswer(invocation -> {
            Role roleToSave = invocation.getArgument(0);
            roleToSave.setId(UUID.randomUUID());
            return roleToSave;
        });

        RoleDto resultDto = rbacService.createRole(request);

        assertNotNull(resultDto);
        assertEquals("TEST_ROLE", resultDto.getCode());
        assertEquals("Test Role", resultDto.getName());

        verify(roleRepository, times(1)).findByCode("TEST_ROLE");
        verify(roleRepository, times(1)).save(any(Role.class));
        verify(auditService, times(1)).record(any(), any(), any(), any());
    }

    @Test
    void createRole_FailsWhenCodeIsSystemReserved() {
        RoleCreateRequest request = new RoleCreateRequest("ADMIN", "Fake Admin", "Trying to create a system role");

        assertThrows(DuplicateResourceException.class, () -> {
            rbacService.createRole(request);
        });

        verify(roleRepository, never()).save(any(Role.class));
        verify(auditService, never()).record(any(), any(), any(), any());
    }

    @Test
    void createRole_FailsWhenCodeAlreadyExists() {
        RoleCreateRequest request = new RoleCreateRequest("DUPLICATE_CODE", "Duplicate Role",
                "A role with a taken code");

        when(roleRepository.findByCode("DUPLICATE_CODE")).thenReturn(Optional.of(new Role()));

        assertThrows(DuplicateResourceException.class, () -> {
            rbacService.createRole(request);
        });

        verify(roleRepository, times(1)).findByCode("DUPLICATE_CODE");
        verify(roleRepository, never()).save(any(Role.class));
    }

    @Test
    void deleteRole_Success() {
        UUID testRoleId = UUID.randomUUID();
        Role testRole = new Role(testRoleId, "CUSTOM_ROLE", "Custom Role", "A custom role to be deleted",
                new HashSet<>(), new HashSet<>());

        when(roleRepository.findById(testRoleId)).thenReturn(Optional.of(testRole));
        when(roleRepository.isRoleAssignedToUsers(testRoleId)).thenReturn(false);

        rbacService.deleteRole(testRoleId);

        verify(roleRepository, times(1)).delete(testRole);
        verify(auditService, times(1)).record(eq("DELETE_ROLE"), eq("ROLE"), eq(testRoleId.toString()), any());
    }

    @Test
    void deleteRole_FailsForSystemRole() {
        UUID adminRoleId = UUID.randomUUID();
        Role adminRole = new Role(adminRoleId, "ADMIN", "Admin Role", "", new HashSet<>(), new HashSet<>());

        when(roleRepository.findById(adminRoleId)).thenReturn(Optional.of(adminRole));

        assertThrows(DuplicateResourceException.class, () -> {
            rbacService.deleteRole(adminRoleId);
        });

        verify(roleRepository, never()).delete(any(Role.class));
    }

    @Test
    void deleteRole_FailsWhenRoleIsInUse() {
        UUID testRoleId = UUID.randomUUID();
        Role testRole = new Role(testRoleId, "CUSTOM_ROLE", "Custom Role", "A custom role in use", new HashSet<>(),
                new HashSet<>());

        when(roleRepository.findById(testRoleId)).thenReturn(Optional.of(testRole));
        when(roleRepository.isRoleAssignedToUsers(testRoleId)).thenReturn(true);

        assertThrows(DuplicateResourceException.class, () -> {
            rbacService.deleteRole(testRoleId);
        });

        verify(roleRepository, never()).delete(any(Role.class));
    }

    @Test
    void updateRolePermissions_Success() {
        UUID roleId = UUID.randomUUID();
        Role existingRole = new Role(roleId, "TESTER", "Tester Role", "", new HashSet<>(), new HashSet<>());

        Set<String> requestedCodes = Set.of("BUG:REPORT", "TEST:EXECUTE");
        UpdateRolePermissionsRequest request = new UpdateRolePermissionsRequest(requestedCodes);

        Set<Permission> foundPermissions = requestedCodes.stream()
                .map(code -> new Permission(UUID.randomUUID(), code, "Desc for " + code))
                .collect(Collectors.toSet());

        when(roleRepository.findById(roleId)).thenReturn(Optional.of(existingRole));
        when(permissionRepository.findByCodeIn(requestedCodes)).thenReturn(foundPermissions);
        when(roleRepository.save(any(Role.class))).thenReturn(existingRole);

        RoleDto resultDto = rbacService.updateRolePermissions(roleId, request);

        assertNotNull(resultDto);
        assertEquals(2, resultDto.getPermissions().size());
        assertTrue(resultDto.getPermissions().stream().anyMatch(p -> p.getCode().equals("BUG:REPORT")));

        verify(roleRepository, times(1)).save(existingRole);
        verify(auditService, times(1)).record(any(), any(), any(), any());
    }

    @Test
    void updateRolePermissions_FailsWithInvalidPermissionCode() {
        UUID roleId = UUID.randomUUID();
        Role existingRole = new Role(roleId, "TESTER", "Tester Role", "", new HashSet<>(), new HashSet<>());

        Set<String> requestedCodes = new HashSet<>(Set.of("BUG:REPORT", "INVALID_CODE"));
        UpdateRolePermissionsRequest request = new UpdateRolePermissionsRequest(requestedCodes);

        Set<Permission> foundPermissions = Set.of(new Permission(UUID.randomUUID(), "BUG:REPORT", "Desc"));

        when(roleRepository.findById(roleId)).thenReturn(Optional.of(existingRole));
        when(permissionRepository.findByCodeIn(requestedCodes)).thenReturn(foundPermissions);

        assertThrows(ResourceNotFoundException.class, () -> {
            rbacService.updateRolePermissions(roleId, request);
        });

        verify(roleRepository, never()).save(any(Role.class));
    }
}
