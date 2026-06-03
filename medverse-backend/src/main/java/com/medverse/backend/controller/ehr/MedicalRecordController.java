package com.medverse.backend.controller.ehr;

import com.medverse.backend.entity.User;
import com.medverse.backend.payload.AppResponse;
import com.medverse.backend.payload.ehr.*;
import com.medverse.backend.service.ehr.MedicalRecordService;
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
@RequestMapping("/v1/medical-records")
@RequiredArgsConstructor
@Tag(name = "EHR - Medical Records", description = "Manage electronic health records")
@SecurityRequirement(name = "bearerAuth")
public class MedicalRecordController {

    private final MedicalRecordService medicalRecordService;

    @PostMapping
    @PreAuthorize("hasAuthority('EHR:WRITE')")
    @Operation(summary = "Create medical record from appointment")
    public ResponseEntity<AppResponse<MedicalRecordDto>> createMedicalRecord(
            @AuthenticationPrincipal User currentUser,
            @Valid @RequestBody MedicalRecordCreateRequest request) {

        MedicalRecordDto dto = medicalRecordService.createMedicalRecord(currentUser, request);
        return new ResponseEntity<>(
                new AppResponse<>("SUCCESS", "Medical record created.", dto, null),
                HttpStatus.CREATED);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('EHR:READ_ANY') or hasAuthority('EHR:READ_OWN')")
    @Operation(summary = "Get medical record detail")
    public ResponseEntity<AppResponse<MedicalRecordDto>> getMedicalRecordById(
            @AuthenticationPrincipal User currentUser,
            @PathVariable UUID id) {

        MedicalRecordDto dto = medicalRecordService.getMedicalRecordById(currentUser, id);
        return ResponseEntity.ok(new AppResponse<>("SUCCESS", "Medical record retrieved.", dto, null));
    }

    @GetMapping("/by-appointment/{appointmentId}")
    @PreAuthorize("hasAuthority('EHR:READ_ANY') or hasAuthority('EHR:READ_OWN')")
    @Operation(summary = "Get medical record by appointment")
    public ResponseEntity<AppResponse<MedicalRecordDto>> getMedicalRecordByAppointment(
            @AuthenticationPrincipal User currentUser,
            @PathVariable UUID appointmentId) {

        MedicalRecordDto dto = medicalRecordService.getMedicalRecordByAppointment(currentUser, appointmentId);
        return ResponseEntity.ok(new AppResponse<>("SUCCESS", "Medical record retrieved.", dto, null));
    }

    @GetMapping("/me")
    @PreAuthorize("hasAuthority('EHR:READ_OWN')")
    @Operation(summary = "Get my medical records")
    public ResponseEntity<AppResponse<Page<MedicalRecordDto>>> getMyMedicalRecords(
            @AuthenticationPrincipal User currentUser,
            @ParameterObject @PageableDefault(size = 10, sort = "createdAt") Pageable pageable) {

        Page<MedicalRecordDto> page = medicalRecordService.getMyMedicalRecords(currentUser, pageable);
        return ResponseEntity.ok(new AppResponse<>("SUCCESS", "My medical records retrieved.", page, null));
    }

    @GetMapping("/patient/{patientId}")
    @PreAuthorize("hasAuthority('EHR:READ_ANY')")
    @Operation(summary = "Get patient medical records")
    public ResponseEntity<AppResponse<Page<MedicalRecordDto>>> getPatientMedicalRecords(
            @AuthenticationPrincipal User currentUser,
            @PathVariable UUID patientId,
            @ParameterObject @PageableDefault(size = 10, sort = "createdAt") Pageable pageable) {

        Page<MedicalRecordDto> page = medicalRecordService.getPatientMedicalRecords(currentUser, patientId, pageable);
        return ResponseEntity.ok(new AppResponse<>("SUCCESS", "Patient medical records retrieved.", page, null));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('EHR:WRITE')")
    @Operation(summary = "Update medical record")
    public ResponseEntity<AppResponse<MedicalRecordDto>> updateMedicalRecord(
            @AuthenticationPrincipal User currentUser,
            @PathVariable UUID id,
            @Valid @RequestBody MedicalRecordUpdateRequest request) {

        MedicalRecordDto dto = medicalRecordService.updateMedicalRecord(currentUser, id, request);
        return ResponseEntity.ok(new AppResponse<>("SUCCESS", "Medical record updated.", dto, null));
    }

    @PostMapping("/{id}/diagnoses")
    @PreAuthorize("hasAuthority('EHR:WRITE')")
    @Operation(summary = "Add diagnosis to medical record")
    public ResponseEntity<AppResponse<MedicalRecordDiagnosisDto>> addDiagnosis(
            @AuthenticationPrincipal User currentUser,
            @PathVariable UUID id,
            @Valid @RequestBody MedicalRecordDiagnosisRequest request) {

        MedicalRecordDiagnosisDto dto = medicalRecordService.addDiagnosis(currentUser, id, request);
        return new ResponseEntity<>(
                new AppResponse<>("SUCCESS", "Diagnosis added.", dto, null),
                HttpStatus.CREATED);
    }

    @DeleteMapping("/{id}/diagnoses/{diagnosisId}")
    @PreAuthorize("hasAuthority('EHR:WRITE')")
    @Operation(summary = "Delete diagnosis from medical record")
    public ResponseEntity<Void> deleteDiagnosis(
            @AuthenticationPrincipal User currentUser,
            @PathVariable UUID id,
            @PathVariable UUID diagnosisId) {

        medicalRecordService.deleteDiagnosis(currentUser, id, diagnosisId);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/complete")
    @PreAuthorize("hasAuthority('EHR:WRITE')")
    @Operation(summary = "Complete medical record")
    public ResponseEntity<AppResponse<MedicalRecordDto>> completeMedicalRecord(
            @AuthenticationPrincipal User currentUser,
            @PathVariable UUID id) {

        MedicalRecordDto dto = medicalRecordService.completeMedicalRecord(currentUser, id);
        return ResponseEntity.ok(new AppResponse<>("SUCCESS", "Medical record completed.", dto, null));
    }
}