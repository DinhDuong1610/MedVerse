package com.medverse.backend.controller.directory;

import com.medverse.backend.payload.AppResponse;
import com.medverse.backend.payload.directory.DoctorDirectoryDto;
import com.medverse.backend.payload.directory.SpecialtyDirectoryDto;
import com.medverse.backend.service.directory.DirectoryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
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
@RequestMapping("/v1/directory")
@RequiredArgsConstructor
@Tag(name = "Directory", description = "Read-only doctor and specialty directory")
@SecurityRequirement(name = "bearerAuth")
public class DirectoryController {

    private final DirectoryService directoryService;

    @GetMapping("/specialties")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "List specialties", description = "Used by patient booking flow.")
    public ResponseEntity<AppResponse<Page<SpecialtyDirectoryDto>>> getSpecialties(
            @ParameterObject @PageableDefault(size = 50, sort = "name") Pageable pageable) {
        Page<SpecialtyDirectoryDto> page = directoryService.getSpecialties(pageable);

        return ResponseEntity.ok(
                new AppResponse<>("SUCCESS", "Specialties retrieved successfully.", page, null));
    }

    @GetMapping("/doctors")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "List doctors", description = "Used by patient booking flow.")
    public ResponseEntity<AppResponse<Page<DoctorDirectoryDto>>> getDoctors(
            @RequestParam(required = false) UUID specialtyId,
            @RequestParam(required = false) String keyword,
            @ParameterObject @PageableDefault(size = 50, sort = "createdAt") Pageable pageable) {
        Page<DoctorDirectoryDto> page = directoryService.getDoctors(specialtyId, keyword, pageable);

        return ResponseEntity.ok(
                new AppResponse<>("SUCCESS", "Doctors retrieved successfully.", page, null));
    }
}