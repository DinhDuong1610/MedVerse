package com.medverse.backend.controller.patient;

import com.medverse.backend.entity.User;
import com.medverse.backend.payload.AppResponse;
import com.medverse.backend.payload.patient.*;
import com.medverse.backend.service.patient.PatientMedicalService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/v1/patient-medical")
@RequiredArgsConstructor
@Tag(name = "Patient Medical Profile", description = "Manage patient medical profile and allergies")
@SecurityRequirement(name = "bearerAuth")
public class PatientMedicalController {

    private final PatientMedicalService patientMedicalService;

    @GetMapping("/me/profile")
    @PreAuthorize("hasAuthority('PATIENT_MEDICAL_PROFILE:READ_OWN')")
    @Operation(summary = "Get my medical profile")
    public ResponseEntity<AppResponse<PatientMedicalProfileDto>> getMyMedicalProfile(
            @AuthenticationPrincipal User currentUser) {
        PatientMedicalProfileDto dto = patientMedicalService.getMyMedicalProfile(currentUser);
        return ResponseEntity.ok(new AppResponse<>("SUCCESS", "Medical profile retrieved.", dto, null));
    }

    @PutMapping("/me/profile")
    @PreAuthorize("hasAuthority('PATIENT_MEDICAL_PROFILE:WRITE_OWN')")
    @Operation(summary = "Update my medical profile")
    public ResponseEntity<AppResponse<PatientMedicalProfileDto>> updateMyMedicalProfile(
            @AuthenticationPrincipal User currentUser,
            @Valid @RequestBody PatientMedicalProfileUpdateRequest request) {
        PatientMedicalProfileDto dto = patientMedicalService.updateMyMedicalProfile(currentUser, request);
        return ResponseEntity.ok(new AppResponse<>("SUCCESS", "Medical profile updated.", dto, null));
    }

    @GetMapping("/patients/{patientId}/profile")
    @PreAuthorize("hasAuthority('PATIENT_MEDICAL_PROFILE:READ_ANY')")
    @Operation(summary = "Get patient medical profile")
    public ResponseEntity<AppResponse<PatientMedicalProfileDto>> getPatientMedicalProfile(
            @AuthenticationPrincipal User currentUser,
            @PathVariable UUID patientId) {
        PatientMedicalProfileDto dto = patientMedicalService.getPatientMedicalProfile(patientId, currentUser);
        return ResponseEntity.ok(new AppResponse<>("SUCCESS", "Patient medical profile retrieved.", dto, null));
    }

    @PutMapping("/patients/{patientId}/profile")
    @PreAuthorize("hasAuthority('PATIENT_MEDICAL_PROFILE:WRITE_ANY')")
    @Operation(summary = "Update patient medical profile")
    public ResponseEntity<AppResponse<PatientMedicalProfileDto>> updatePatientMedicalProfile(
            @AuthenticationPrincipal User currentUser,
            @PathVariable UUID patientId,
            @Valid @RequestBody PatientMedicalProfileUpdateRequest request) {
        PatientMedicalProfileDto dto = patientMedicalService.updatePatientMedicalProfile(patientId, currentUser,
                request);
        return ResponseEntity.ok(new AppResponse<>("SUCCESS", "Patient medical profile updated.", dto, null));
    }

    @GetMapping("/me/allergies")
    @PreAuthorize("hasAuthority('ALLERGY:READ_OWN')")
    @Operation(summary = "Get my allergies")
    public ResponseEntity<AppResponse<List<AllergyDto>>> getMyAllergies(
            @AuthenticationPrincipal User currentUser) {
        List<AllergyDto> allergies = patientMedicalService.getMyAllergies(currentUser);
        return ResponseEntity.ok(new AppResponse<>("SUCCESS", "Allergies retrieved.", allergies, null));
    }

    @PostMapping("/me/allergies")
    @PreAuthorize("hasAuthority('ALLERGY:WRITE_OWN')")
    @Operation(summary = "Create my allergy")
    public ResponseEntity<AppResponse<AllergyDto>> createMyAllergy(
            @AuthenticationPrincipal User currentUser,
            @Valid @RequestBody AllergyCreateRequest request) {
        AllergyDto allergy = patientMedicalService.createMyAllergy(currentUser, request);
        return new ResponseEntity<>(
                new AppResponse<>("SUCCESS", "Allergy created.", allergy, null),
                HttpStatus.CREATED);
    }

    @PutMapping("/me/allergies/{allergyId}")
    @PreAuthorize("hasAuthority('ALLERGY:WRITE_OWN')")
    @Operation(summary = "Update my allergy")
    public ResponseEntity<AppResponse<AllergyDto>> updateMyAllergy(
            @AuthenticationPrincipal User currentUser,
            @PathVariable UUID allergyId,
            @Valid @RequestBody AllergyUpdateRequest request) {
        AllergyDto allergy = patientMedicalService.updateMyAllergy(currentUser, allergyId, request);
        return ResponseEntity.ok(new AppResponse<>("SUCCESS", "Allergy updated.", allergy, null));
    }

    @DeleteMapping("/me/allergies/{allergyId}")
    @PreAuthorize("hasAuthority('ALLERGY:WRITE_OWN')")
    @Operation(summary = "Delete my allergy")
    public ResponseEntity<Void> deleteMyAllergy(
            @AuthenticationPrincipal User currentUser,
            @PathVariable UUID allergyId) {
        patientMedicalService.deleteMyAllergy(currentUser, allergyId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/patients/{patientId}/allergies")
    @PreAuthorize("hasAuthority('ALLERGY:READ_ANY')")
    @Operation(summary = "Get patient allergies")
    public ResponseEntity<AppResponse<List<AllergyDto>>> getPatientAllergies(
            @AuthenticationPrincipal User currentUser,
            @PathVariable UUID patientId) {
        List<AllergyDto> allergies = patientMedicalService.getPatientAllergies(patientId, currentUser);
        return ResponseEntity.ok(new AppResponse<>("SUCCESS", "Patient allergies retrieved.", allergies, null));
    }

    @PostMapping("/patients/{patientId}/allergies")
    @PreAuthorize("hasAuthority('ALLERGY:WRITE_ANY')")
    @Operation(summary = "Create patient allergy")
    public ResponseEntity<AppResponse<AllergyDto>> createPatientAllergy(
            @AuthenticationPrincipal User currentUser,
            @PathVariable UUID patientId,
            @Valid @RequestBody AllergyCreateRequest request) {
        AllergyDto allergy = patientMedicalService.createPatientAllergy(patientId, currentUser, request);
        return new ResponseEntity<>(
                new AppResponse<>("SUCCESS", "Patient allergy created.", allergy, null),
                HttpStatus.CREATED);
    }

    @PutMapping("/patients/{patientId}/allergies/{allergyId}")
    @PreAuthorize("hasAuthority('ALLERGY:WRITE_ANY')")
    @Operation(summary = "Update patient allergy")
    public ResponseEntity<AppResponse<AllergyDto>> updatePatientAllergy(
            @AuthenticationPrincipal User currentUser,
            @PathVariable UUID patientId,
            @PathVariable UUID allergyId,
            @Valid @RequestBody AllergyUpdateRequest request) {
        AllergyDto allergy = patientMedicalService.updatePatientAllergy(patientId, allergyId, currentUser, request);
        return ResponseEntity.ok(new AppResponse<>("SUCCESS", "Patient allergy updated.", allergy, null));
    }

    @DeleteMapping("/patients/{patientId}/allergies/{allergyId}")
    @PreAuthorize("hasAuthority('ALLERGY:WRITE_ANY')")
    @Operation(summary = "Delete patient allergy")
    public ResponseEntity<Void> deletePatientAllergy(
            @AuthenticationPrincipal User currentUser,
            @PathVariable UUID patientId,
            @PathVariable UUID allergyId) {
        patientMedicalService.deletePatientAllergy(patientId, allergyId, currentUser);
        return ResponseEntity.noContent().build();
    }
}