package com.medverse.backend.controller.appointment;

import com.medverse.backend.entity.User;
import com.medverse.backend.payload.AppResponse;
import com.medverse.backend.payload.appointment.AppointmentDto;
import com.medverse.backend.payload.appointment.AppointmentRequestCreateDto;
import com.medverse.backend.payload.appointment.AppointmentRequestDto;
import com.medverse.backend.service.appointment.AppointmentRequestService;
import com.medverse.backend.service.appointment.AppointmentService;
import com.medverse.backend.utils.enumeration.AppointmentRequestStatus;
import io.swagger.v3.oas.annotations.Operation;
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
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/v1/appointment-requests")
@RequiredArgsConstructor
@Tag(name = "Scheduling - Appointment Requests", description = "Handle patient requests and approvals")
@SecurityRequirement(name = "bearerAuth")
public class AppointmentRequestController {

    private final AppointmentRequestService requestService;
    private final AppointmentService appointmentService;

    @PostMapping
    @PreAuthorize("hasAuthority('APPOINTMENT:WRITE_OWN')")
    @Operation(summary = "Create appointment request", description = "Patient submits a request for appointment.")
    public ResponseEntity<AppResponse<AppointmentRequestDto>> createRequest(
            @AuthenticationPrincipal User currentUser,
            @Valid @RequestBody AppointmentRequestCreateDto request) {

        AppointmentRequestDto createdRequest = requestService.createRequest(currentUser.getId(), request);
        return new ResponseEntity<>(
                new AppResponse<>("SUCCESS", "Appointment request submitted.", createdRequest, null),
                HttpStatus.CREATED);
    }

    @GetMapping("/me")
    @PreAuthorize("hasAuthority('APPOINTMENT:READ_OWN')")
    @Operation(summary = "Get my requests", description = "Patient views their own history.")
    public ResponseEntity<AppResponse<Page<AppointmentRequestDto>>> getMyRequests(
            @AuthenticationPrincipal User currentUser,
            @ParameterObject @PageableDefault(size = 10, sort = "createdAt") Pageable pageable) {

        Page<AppointmentRequestDto> requests = requestService.getMyRequests(currentUser.getId(), pageable);
        return ResponseEntity.ok(new AppResponse<>("SUCCESS", "Requests retrieved.", requests, null));
    }

    @GetMapping
    @PreAuthorize("hasAuthority('APPOINTMENT:READ_ANY')")
    @Operation(summary = "Filter requests (Receptionist)", description = "Receptionist filters requests to approve.")
    public ResponseEntity<AppResponse<Page<AppointmentRequestDto>>> getRequests(
            @RequestParam(required = false) AppointmentRequestStatus status,
            @RequestParam(required = false) UUID specialtyId,
            @ParameterObject @PageableDefault(size = 10, sort = "createdAt") Pageable pageable) {

        Page<AppointmentRequestDto> requests = requestService.getRequestsForReceptionist(status, specialtyId, pageable);
        return ResponseEntity.ok(new AppResponse<>("SUCCESS", "Requests retrieved.", requests, null));
    }

    @PatchMapping("/{id}/approve")
    @PreAuthorize("hasAuthority('APPOINTMENT:WRITE_ANY')")
    @Operation(summary = "Approve request", description = "Receptionist approves request and assigns a Work Slot.")
    public ResponseEntity<AppResponse<AppointmentDto>> approveRequest(
            @PathVariable UUID id,
            @RequestParam UUID workSlotId) {

        AppointmentDto appointment = appointmentService.createAppointmentFromRequest(id, workSlotId);
        return ResponseEntity
                .ok(new AppResponse<>("SUCCESS", "Request approved. Appointment created.", appointment, null));
    }

    @PatchMapping("/{id}/reject")
    @PreAuthorize("hasAuthority('APPOINTMENT:WRITE_ANY')")
    @Operation(summary = "Reject request", description = "Receptionist rejects a request.")
    public ResponseEntity<AppResponse<AppointmentRequestDto>> rejectRequest(
            @PathVariable UUID id,
            @RequestBody String reason) {

        AppointmentRequestDto request = requestService.rejectRequest(id, reason);
        return ResponseEntity.ok(new AppResponse<>("SUCCESS", "Request rejected.", request, null));
    }

    @PatchMapping("/{id}/cancel")
    @PreAuthorize("hasAuthority('APPOINTMENT:WRITE_OWN')")
    @Operation(summary = "Cancel my appointment request", description = "Patient cancels their own pending appointment request.")
    public ResponseEntity<AppResponse<Void>> cancelMyRequest(
            @AuthenticationPrincipal User currentUser,
            @PathVariable UUID id) {

        requestService.cancelRequest(id, currentUser.getId());
        return ResponseEntity.ok(
                new AppResponse<>("SUCCESS", "Appointment request cancelled.", null, null));
    }
}