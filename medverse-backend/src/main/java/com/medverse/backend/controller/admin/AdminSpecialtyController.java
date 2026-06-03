package com.medverse.backend.controller.admin;

import com.medverse.backend.payload.AppResponse;
import com.medverse.backend.payload.admin.AdminSpecialtyDto;
import com.medverse.backend.payload.admin.AdminSpecialtyRequest;
import com.medverse.backend.service.admin.AdminSpecialtyService;
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

import java.util.UUID;

@RestController
@RequestMapping("/v1/admin/specialties")
@RequiredArgsConstructor
@Tag(name = "Admin - Specialty Management", description = "Manage medical specialties")
@SecurityRequirement(name = "bearerAuth")
public class AdminSpecialtyController {

    private final AdminSpecialtyService adminSpecialtyService;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AppResponse<Page<AdminSpecialtyDto>>> getSpecialties(
            @ParameterObject @PageableDefault(size = 50, sort = "name") Pageable pageable) {

        Page<AdminSpecialtyDto> result = adminSpecialtyService.getSpecialties(pageable);

        return ResponseEntity.ok(
                new AppResponse<>("SUCCESS", "Specialties retrieved.", result, null));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AppResponse<AdminSpecialtyDto>> getSpecialtyById(@PathVariable UUID id) {
        AdminSpecialtyDto result = adminSpecialtyService.getSpecialtyById(id);

        return ResponseEntity.ok(
                new AppResponse<>("SUCCESS", "Specialty detail retrieved.", result, null));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AppResponse<AdminSpecialtyDto>> createSpecialty(
            @Valid @RequestBody AdminSpecialtyRequest request) {

        AdminSpecialtyDto result = adminSpecialtyService.createSpecialty(request);

        return ResponseEntity.ok(
                new AppResponse<>("SUCCESS", "Specialty created.", result, null));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AppResponse<AdminSpecialtyDto>> updateSpecialty(
            @PathVariable UUID id,
            @Valid @RequestBody AdminSpecialtyRequest request) {

        AdminSpecialtyDto result = adminSpecialtyService.updateSpecialty(id, request);

        return ResponseEntity.ok(
                new AppResponse<>("SUCCESS", "Specialty updated.", result, null));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AppResponse<Void>> deleteSpecialty(@PathVariable UUID id) {
        adminSpecialtyService.deleteSpecialty(id);

        return ResponseEntity.ok(
                new AppResponse<>("SUCCESS", "Specialty deleted.", null, null));
    }
}