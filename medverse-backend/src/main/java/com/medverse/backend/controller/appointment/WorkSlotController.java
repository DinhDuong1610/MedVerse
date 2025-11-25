package com.medverse.backend.controller.appointment;

import com.medverse.backend.entity.User;
import com.medverse.backend.payload.AppResponse;
import com.medverse.backend.payload.appointment.WorkSlotCreateRequest;
import com.medverse.backend.payload.appointment.WorkSlotDto;
import com.medverse.backend.service.appointment.WorkSlotService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/v1/work-slots")
@RequiredArgsConstructor
@Tag(name = "Scheduling - Work Slots", description = "Manage doctor's availability slots")
@SecurityRequirement(name = "bearerAuth")
public class WorkSlotController {

    private final WorkSlotService workSlotService;

    @PostMapping
    @PreAuthorize("hasAuthority('SCHEDULING:WRITE')")
    @Operation(summary = "Create a work slot", description = "Doctors create their available time slots.")
    public ResponseEntity<AppResponse<WorkSlotDto>> createSlot(
            @AuthenticationPrincipal User currentUser,
            @Valid @RequestBody WorkSlotCreateRequest request) {
        WorkSlotDto slot = workSlotService.createSlot(currentUser.getId(), request);
        return new ResponseEntity<>(
                new AppResponse<>("SUCCESS", "Work slot created successfully.", slot, null),
                HttpStatus.CREATED);
    }

    @GetMapping
    @PreAuthorize("hasAuthority('SCHEDULING:READ')")
    @Operation(summary = "Get slots by doctor and date range", description = "View schedule of a specific doctor.")
    public ResponseEntity<AppResponse<List<WorkSlotDto>>> getSlots(
            @RequestParam UUID doctorId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime to) {

        List<WorkSlotDto> slots = workSlotService.getSlotsByDoctor(doctorId, from, to);
        return ResponseEntity.ok(
                new AppResponse<>("SUCCESS", "Work slots retrieved successfully.", slots, null));
    }

    @GetMapping("/available")
    @Operation(summary = "Get available slots for booking", description = "Public or Patient API to see empty slots.")
    public ResponseEntity<AppResponse<List<WorkSlotDto>>> getAvailableSlots(@RequestParam UUID doctorId) {
        List<WorkSlotDto> slots = workSlotService.getAvailableSlots(doctorId);
        return ResponseEntity.ok(
                new AppResponse<>("SUCCESS", "Available slots retrieved successfully.", slots, null));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('SCHEDULING:WRITE')")
    @Operation(summary = "Delete a work slot", description = "Doctor deletes an empty slot. Cannot delete if booked.")
    public ResponseEntity<AppResponse<Void>> deleteSlot(
            @AuthenticationPrincipal User currentUser,
            @PathVariable UUID id) {

        workSlotService.deleteSlot(id, currentUser.getId());
        return ResponseEntity.noContent().build();
    }
}