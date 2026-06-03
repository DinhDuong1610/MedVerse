package com.medverse.backend.controller.prescription;

import com.medverse.backend.entity.User;
import com.medverse.backend.payload.AppResponse;
import com.medverse.backend.payload.prescription.*;
import com.medverse.backend.service.prescription.PrescriptionService;
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
@RequestMapping("/v1/prescriptions")
@RequiredArgsConstructor
@Tag(name = "Prescription", description = "Manage prescriptions and medication items")
@SecurityRequirement(name = "bearerAuth")
public class PrescriptionController {

    private final PrescriptionService prescriptionService;

    @PostMapping
    @PreAuthorize("hasAuthority('PRESCRIPTION:WRITE')")
    @Operation(summary = "Create prescription draft from medical record")
    public ResponseEntity<AppResponse<PrescriptionDto>> createPrescription(
            @AuthenticationPrincipal User currentUser,
            @Valid @RequestBody PrescriptionCreateRequest request) {

        PrescriptionDto dto = prescriptionService.createPrescription(currentUser, request);
        return new ResponseEntity<>(
                new AppResponse<>("SUCCESS", "Prescription created.", dto, null),
                HttpStatus.CREATED);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('PRESCRIPTION:READ_ANY') or hasAuthority('PRESCRIPTION:READ_OWN')")
    @Operation(summary = "Get prescription detail")
    public ResponseEntity<AppResponse<PrescriptionDto>> getPrescriptionById(
            @AuthenticationPrincipal User currentUser,
            @PathVariable UUID id) {

        PrescriptionDto dto = prescriptionService.getPrescriptionById(currentUser, id);
        return ResponseEntity.ok(new AppResponse<>("SUCCESS", "Prescription retrieved.", dto, null));
    }

    @GetMapping("/by-medical-record/{medicalRecordId}")
    @PreAuthorize("hasAuthority('PRESCRIPTION:READ_ANY') or hasAuthority('PRESCRIPTION:READ_OWN')")
    @Operation(summary = "Get prescription by medical record")
    public ResponseEntity<AppResponse<PrescriptionDto>> getPrescriptionByMedicalRecord(
            @AuthenticationPrincipal User currentUser,
            @PathVariable UUID medicalRecordId) {

        PrescriptionDto dto = prescriptionService.getPrescriptionByMedicalRecord(currentUser, medicalRecordId);
        return ResponseEntity.ok(new AppResponse<>("SUCCESS", "Prescription retrieved.", dto, null));
    }

    @GetMapping("/me")
    @PreAuthorize("hasAuthority('PRESCRIPTION:READ_OWN')")
    @Operation(summary = "Get my prescriptions")
    public ResponseEntity<AppResponse<Page<PrescriptionDto>>> getMyPrescriptions(
            @AuthenticationPrincipal User currentUser,
            @ParameterObject @PageableDefault(size = 10, sort = "createdAt") Pageable pageable) {

        Page<PrescriptionDto> page = prescriptionService.getMyPrescriptions(currentUser, pageable);
        return ResponseEntity.ok(new AppResponse<>("SUCCESS", "My prescriptions retrieved.", page, null));
    }

    @GetMapping("/patient/{patientId}")
    @PreAuthorize("hasAuthority('PRESCRIPTION:READ_ANY')")
    @Operation(summary = "Get patient prescriptions")
    public ResponseEntity<AppResponse<Page<PrescriptionDto>>> getPatientPrescriptions(
            @AuthenticationPrincipal User currentUser,
            @PathVariable UUID patientId,
            @ParameterObject @PageableDefault(size = 10, sort = "createdAt") Pageable pageable) {

        Page<PrescriptionDto> page = prescriptionService.getPatientPrescriptions(currentUser, patientId, pageable);
        return ResponseEntity.ok(new AppResponse<>("SUCCESS", "Patient prescriptions retrieved.", page, null));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('PRESCRIPTION:WRITE')")
    @Operation(summary = "Update prescription draft")
    public ResponseEntity<AppResponse<PrescriptionDto>> updatePrescription(
            @AuthenticationPrincipal User currentUser,
            @PathVariable UUID id,
            @Valid @RequestBody PrescriptionUpdateRequest request) {

        PrescriptionDto dto = prescriptionService.updatePrescription(currentUser, id, request);
        return ResponseEntity.ok(new AppResponse<>("SUCCESS", "Prescription updated.", dto, null));
    }

    @PostMapping("/{id}/items")
    @PreAuthorize("hasAuthority('PRESCRIPTION:WRITE')")
    @Operation(summary = "Add medication item to prescription")
    public ResponseEntity<AppResponse<PrescriptionItemDto>> addItem(
            @AuthenticationPrincipal User currentUser,
            @PathVariable UUID id,
            @Valid @RequestBody PrescriptionItemCreateRequest request) {

        PrescriptionItemDto dto = prescriptionService.addItem(currentUser, id, request);
        return new ResponseEntity<>(
                new AppResponse<>("SUCCESS", "Prescription item added.", dto, null),
                HttpStatus.CREATED);
    }

    @PutMapping("/{id}/items/{itemId}")
    @PreAuthorize("hasAuthority('PRESCRIPTION:WRITE')")
    @Operation(summary = "Update prescription item")
    public ResponseEntity<AppResponse<PrescriptionItemDto>> updateItem(
            @AuthenticationPrincipal User currentUser,
            @PathVariable UUID id,
            @PathVariable UUID itemId,
            @Valid @RequestBody PrescriptionItemUpdateRequest request) {

        PrescriptionItemDto dto = prescriptionService.updateItem(currentUser, id, itemId, request);
        return ResponseEntity.ok(new AppResponse<>("SUCCESS", "Prescription item updated.", dto, null));
    }

    @DeleteMapping("/{id}/items/{itemId}")
    @PreAuthorize("hasAuthority('PRESCRIPTION:WRITE')")
    @Operation(summary = "Delete prescription item")
    public ResponseEntity<Void> deleteItem(
            @AuthenticationPrincipal User currentUser,
            @PathVariable UUID id,
            @PathVariable UUID itemId) {

        prescriptionService.deleteItem(currentUser, id, itemId);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/finalize")
    @PreAuthorize("hasAuthority('PRESCRIPTION:WRITE')")
    @Operation(summary = "Finalize prescription")
    public ResponseEntity<AppResponse<PrescriptionDto>> finalizePrescription(
            @AuthenticationPrincipal User currentUser,
            @PathVariable UUID id) {

        PrescriptionDto dto = prescriptionService.finalizePrescription(currentUser, id);
        return ResponseEntity.ok(new AppResponse<>("SUCCESS", "Prescription finalized.", dto, null));
    }

    @PatchMapping("/{id}/cancel")
    @PreAuthorize("hasAuthority('PRESCRIPTION:WRITE')")
    @Operation(summary = "Cancel draft prescription")
    public ResponseEntity<AppResponse<Void>> cancelPrescription(
            @AuthenticationPrincipal User currentUser,
            @PathVariable UUID id,
            @RequestBody(required = false) String reason) {

        prescriptionService.cancelPrescription(currentUser, id, reason);
        return ResponseEntity.ok(new AppResponse<>("SUCCESS", "Prescription cancelled.", null, null));
    }
}