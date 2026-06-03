package com.medverse.backend.controller.admin;

import com.medverse.backend.payload.AppResponse;
import com.medverse.backend.payload.admin.AdminCreateStaffRequest;
import com.medverse.backend.payload.admin.AdminUserDto;
import com.medverse.backend.service.admin.AdminUserService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import com.medverse.backend.entity.User;
import com.medverse.backend.payload.admin.AdminUpdateUserStatusRequest;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import com.medverse.backend.payload.admin.AdminUpdateDoctorProfileRequest;

import java.util.UUID;

@RestController
@RequestMapping("/v1/admin/users")
@RequiredArgsConstructor
@Tag(name = "Admin - User Management", description = "Manage staff and user accounts")
@SecurityRequirement(name = "bearerAuth")
public class AdminUserController {

    private final AdminUserService adminUserService;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AppResponse<Page<AdminUserDto>>> getUsers(
            @RequestParam(required = false) String roleCode,
            @ParameterObject @PageableDefault(size = 20, sort = "email") Pageable pageable) {

        Page<AdminUserDto> result = adminUserService.getUsers(roleCode, pageable);

        return ResponseEntity.ok(
                new AppResponse<>("SUCCESS", "Users retrieved.", result, null));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AppResponse<AdminUserDto>> getUserById(@PathVariable UUID id) {
        AdminUserDto result = adminUserService.getUserById(id);

        return ResponseEntity.ok(
                new AppResponse<>("SUCCESS", "User detail retrieved.", result, null));
    }

    @PostMapping("/staff")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AppResponse<AdminUserDto>> createStaff(
            @Valid @RequestBody AdminCreateStaffRequest request) {

        AdminUserDto result = adminUserService.createStaff(request);

        return ResponseEntity.ok(
                new AppResponse<>("SUCCESS", "Staff account created.", result, null));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AppResponse<AdminUserDto>> updateUserStatus(
            @AuthenticationPrincipal User currentUser,
            @PathVariable UUID id,
            @Valid @RequestBody AdminUpdateUserStatusRequest request) {

        AdminUserDto result = adminUserService.updateUserStatus(currentUser, id, request);

        return ResponseEntity.ok(
                new AppResponse<>("SUCCESS", "User status updated.", result, null));
    }

    @PutMapping("/{id}/doctor-profile")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AppResponse<AdminUserDto>> updateDoctorProfile(
            @PathVariable UUID id,
            @Valid @RequestBody AdminUpdateDoctorProfileRequest request) {

        AdminUserDto result = adminUserService.updateDoctorProfile(id, request);

        return ResponseEntity.ok(
                new AppResponse<>("SUCCESS", "Doctor profile updated.", result, null));
    }
}