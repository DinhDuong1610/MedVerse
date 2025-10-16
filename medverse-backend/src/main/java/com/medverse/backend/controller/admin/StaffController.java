package com.medverse.backend.controller.admin;

import com.medverse.backend.payload.AppResponse;
import com.medverse.backend.payload.staff.SpecialtyDto;
import com.medverse.backend.payload.staff.StaffListDto;
import com.medverse.backend.service.StaffService;
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
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/v1/admin")
@RequiredArgsConstructor
@Tag(name = "Admin - Staff Management", description = "APIs for managing staff members (Doctors, Receptionists, etc.)")
@SecurityRequirement(name = "bearerAuth")
public class StaffController {

    private final StaffService staffService;

    @GetMapping("/specialties")
    @PreAuthorize("hasAuthority('STAFF:READ')")
    @Operation(summary = "Get all medical specialties", description = "Retrieves a list of all available medical specialties.")
    public ResponseEntity<AppResponse<List<SpecialtyDto>>> getAllSpecialties() {
        List<SpecialtyDto> specialties = staffService.findAllSpecialties();
        return ResponseEntity
                .ok(new AppResponse<>("SUCCESS", "Specialties retrieved successfully.", specialties, null));
    }

    @GetMapping("/staff")
    @PreAuthorize("hasAuthority('STAFF:READ')")
    @Operation(summary = "Get all staff members", description = "Retrieves a paginated list of all staff members (Admins, Doctors, Receptionists).")
    public ResponseEntity<AppResponse<Page<StaffListDto>>> getAllStaff(
            @ParameterObject @PageableDefault(size = 10, sort = "createdAt") Pageable pageable) {
        Page<StaffListDto> staffPage = staffService.findAllStaff(pageable);
        return ResponseEntity
                .ok(new AppResponse<>("SUCCESS", "Staff members retrieved successfully.", staffPage, null));
    }
}
