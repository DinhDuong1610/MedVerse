package com.medverse.backend.controller.appointment;

import com.medverse.backend.entity.User;
import com.medverse.backend.payload.AppResponse;
import com.medverse.backend.payload.appointment.AppointmentDto;
import com.medverse.backend.service.appointment.AppointmentService;
import com.medverse.backend.utils.enumeration.AppointmentStatus;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.UUID;

@RestController
@RequestMapping("/v1/appointments")
@RequiredArgsConstructor
@Tag(name = "Scheduling - Appointments", description = "Manage confirmed appointments")
@SecurityRequirement(name = "bearerAuth")
public class AppointmentController {

    private final AppointmentService appointmentService;

    @GetMapping("/me")
    @PreAuthorize("hasAuthority('APPOINTMENT:READ_OWN')")
    @Operation(summary = "Get my appointments", description = "Patient views their own confirmed appointments.")
    public ResponseEntity<AppResponse<Page<AppointmentDto>>> getMyAppointments(
            @AuthenticationPrincipal User currentUser,
            @ParameterObject @PageableDefault(size = 20, sort = "startTime") Pageable pageable) {

        Page<AppointmentDto> result = appointmentService.getMyAppointments(currentUser, pageable);

        return ResponseEntity.ok(
                new AppResponse<>("SUCCESS", "My appointments retrieved.", result, null));
    }

    @PatchMapping("/{id}/cancel")
    @PreAuthorize("hasAuthority('APPOINTMENT:WRITE_ANY') or hasAuthority('APPOINTMENT:WRITE_OWN')")
    @Operation(summary = "Cancel appointment", description = "Patient or Staff cancels an appointment.")
    public ResponseEntity<AppResponse<Void>> cancelAppointment(
            @AuthenticationPrincipal User currentUser,
            @PathVariable UUID id,
            @RequestBody String reason) {

        appointmentService.cancelAppointment(id, reason, currentUser);

        return ResponseEntity.ok(
                new AppResponse<>("SUCCESS", "Appointment cancelled.", null, null));
    }

    @PostMapping("/{id}/no-show")
    @PreAuthorize("hasAuthority('APPOINTMENT:WRITE_ANY')")
    @Operation(summary = "Mark as No-Show", description = "Staff marks that patient did not come.")
    public ResponseEntity<AppResponse<Void>> markNoShow(@PathVariable UUID id) {

        appointmentService.markNoShow(id);

        return ResponseEntity.ok(
                new AppResponse<>("SUCCESS", "Marked as No-Show.", null, null));
    }

    @GetMapping
    @PreAuthorize("hasAuthority('APPOINTMENT:READ_ANY')")
    @Operation(summary = "Search appointments", description = "Filter appointments by date, doctor, patient, status.")
    public ResponseEntity<AppResponse<Page<AppointmentDto>>> getAppointments(
            @RequestParam(required = false) UUID doctorId,
            @RequestParam(required = false) UUID patientId,
            @RequestParam(required = false) AppointmentStatus status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime to,
            @ParameterObject @PageableDefault(size = 20, sort = "startTime") Pageable pageable) {

        Page<AppointmentDto> result = appointmentService.searchAppointments(
                doctorId,
                patientId,
                status,
                from,
                to,
                pageable);

        return ResponseEntity.ok(
                new AppResponse<>("SUCCESS", "Appointments retrieved.", result, null));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('APPOINTMENT:READ_ANY') or hasAuthority('APPOINTMENT:READ_OWN')")
    @Operation(summary = "Get appointment detail", description = "Get full details of a specific appointment.")
    public ResponseEntity<AppResponse<AppointmentDto>> getAppointmentById(
            @AuthenticationPrincipal User currentUser,
            @PathVariable UUID id) {

        AppointmentDto dto = appointmentService.getAppointmentById(id, currentUser);

        return ResponseEntity.ok(
                new AppResponse<>("SUCCESS", "Appointment detail retrieved.", dto, null));
    }

    @PutMapping("/{id}/reschedule")
    @PreAuthorize("hasAuthority('APPOINTMENT:WRITE_ANY')")
    @Operation(summary = "Reschedule appointment", description = "Move appointment to a new work slot.")
    public ResponseEntity<AppResponse<AppointmentDto>> rescheduleAppointment(
            @PathVariable UUID id,
            @RequestParam UUID newWorkSlotId) {

        AppointmentDto updated = appointmentService.rescheduleAppointment(id, newWorkSlotId);

        return ResponseEntity.ok(
                new AppResponse<>("SUCCESS", "Appointment rescheduled successfully.", updated, null));
    }
}