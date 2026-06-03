package com.medverse.backend.controller.admin;

import com.medverse.backend.payload.AppResponse;
import com.medverse.backend.payload.staff.StaffCreateRequest;
import com.medverse.backend.payload.staff.StaffDetailDto;
import com.medverse.backend.payload.staff.StaffListDto;
import com.medverse.backend.payload.staff.StaffUpdateRequest;
import com.medverse.backend.service.StaffService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
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

import java.util.UUID;

@RestController
@RequestMapping("/v1/admin")
@RequiredArgsConstructor
@Tag(name = "Admin - Staff Management", description = "APIs for managing staff members (Doctors, Receptionists, etc.)")
@SecurityRequirement(name = "bearerAuth")
public class StaffController {

        private final StaffService staffService;

        @GetMapping("/staff")
        @PreAuthorize("hasAuthority('STAFF:READ')")
        @Operation(summary = "Get all staff members", description = "Retrieves a paginated list of all staff members (Admins, Doctors, Receptionists).")
        public ResponseEntity<AppResponse<Page<StaffListDto>>> getAllStaff(
                        @ParameterObject @PageableDefault(size = 10, sort = "createdAt") Pageable pageable) {
                Page<StaffListDto> staffPage = staffService.findAllStaff(pageable);
                return ResponseEntity
                                .ok(new AppResponse<>("SUCCESS", "Staff members retrieved successfully.", staffPage,
                                                null));
        }

        @GetMapping("/staff/{userId}")
        @PreAuthorize("hasAuthority('STAFF:READ')")
        @Operation(summary = "Get staff member details", description = "Retrieves detailed information about a single staff member, including their professional profile.")
        public ResponseEntity<AppResponse<StaffDetailDto>> getStaffById(@PathVariable UUID userId) {
                StaffDetailDto staffDetail = staffService.findStaffById(userId);
                return ResponseEntity.ok(new AppResponse<>("SUCCESS", "Staff details retrieved successfully.",
                                staffDetail, null));
        }

        @PostMapping("/staff")
        @PreAuthorize("hasAuthority('STAFF:WRITE')")
        @Operation(summary = "Create a new staff member", description = "Creates a new account and profile for a staff member (e.g., DOCTOR, RECEPTIONIST).")
        @ApiResponses(value = {
                        @ApiResponse(responseCode = "201", description = "Staff member created successfully"),
                        @ApiResponse(responseCode = "400", description = "Invalid input data", content = @Content),
                        @ApiResponse(responseCode = "403", description = "Forbidden - User does not have STAFF:WRITE permission", content = @Content),
                        @ApiResponse(responseCode = "409", description = "Conflict - A user with this email already exists", content = @Content)
        })
        public ResponseEntity<AppResponse<StaffListDto>> createStaff(@Valid @RequestBody StaffCreateRequest request) {
                StaffListDto newStaff = staffService.createStaff(request);
                return new ResponseEntity<>(
                                new AppResponse<>("SUCCESS", "Staff member created successfully.", newStaff, null),
                                HttpStatus.CREATED);
        }

        @PutMapping("/staff/{userId}")
        @PreAuthorize("hasAuthority('STAFF:WRITE')")
        @Operation(summary = "Update a staff member", description = "Updates the general and professional profile of a staff member.")
        public ResponseEntity<AppResponse<StaffDetailDto>> updateStaff(@PathVariable UUID userId,
                        @Valid @RequestBody StaffUpdateRequest request) {
                StaffDetailDto updatedStaff = staffService.updateStaff(userId, request);
                return ResponseEntity.ok(
                                new AppResponse<>("SUCCESS", "Staff member updated successfully.", updatedStaff, null));
        }

        @DeleteMapping("/staff/{userId}")
        @PreAuthorize("hasAuthority('STAFF:WRITE')")
        @Operation(summary = "Deactivate a staff member's account", description = "Sets the staff member's account status to DISABLED. This is a soft delete.")
        @ApiResponses(value = {
                        @ApiResponse(responseCode = "204", description = "Staff member deactivated successfully"),
                        @ApiResponse(responseCode = "403", description = "Forbidden - User does not have STAFF:WRITE permission", content = @Content),
                        @ApiResponse(responseCode = "404", description = "Staff member not found", content = @Content)
        })
        public ResponseEntity<Void> deactivateStaff(@PathVariable UUID userId) {
                staffService.deactivateStaff(userId);
                return ResponseEntity.noContent().build();
        }
}