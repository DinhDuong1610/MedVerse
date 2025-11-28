package com.medverse.backend.controller.emr;

import com.medverse.backend.entity.User;
import com.medverse.backend.payload.AppResponse;
import com.medverse.backend.payload.emr.EncounterDetailDto;
import com.medverse.backend.payload.emr.MedicalRecordUpdateDto;
import com.medverse.backend.service.emr.EmrService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/v1/encounters")
@RequiredArgsConstructor
@Tag(name = "EMR - Encounter & Medical Record", description = "Manage patient encounters and medical records")
@SecurityRequirement(name = "bearerAuth")
public class EmrController {

    private final EmrService emrService;

    @PostMapping("/start")
    @PreAuthorize("hasAuthority('EHR:WRITE')")
    @Operation(summary = "Start an encounter", description = "Doctor starts examining a patient from an appointment.")
    public ResponseEntity<AppResponse<EncounterDetailDto>> startEncounter(
            @AuthenticationPrincipal User currentUser,
            @RequestParam UUID appointmentId) {

        EncounterDetailDto encounter = emrService.startEncounter(appointmentId, currentUser.getId());
        return ResponseEntity.ok(new AppResponse<>("SUCCESS", "Encounter started.", encounter, null));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('EHR:READ_ANY') or hasAuthority('EHR:READ_OWN')")
    @Operation(summary = "Get encounter detail", description = "Get full details of an encounter (Record, Vitals, Prescription).")
    public ResponseEntity<AppResponse<EncounterDetailDto>> getEncounter(@PathVariable UUID id) {

        EncounterDetailDto encounter = emrService.getEncounterDetail(id);
        return ResponseEntity.ok(new AppResponse<>("SUCCESS", "Encounter details retrieved.", encounter, null));
    }

    @PutMapping("/{id}/record")
    @PreAuthorize("hasAuthority('EHR:WRITE')")
    @Operation(summary = "Update medical record (AI Integrated)", description = "Doctor saves the medical record form. Trigger AI Diagnosis Module.")
    public ResponseEntity<AppResponse<EncounterDetailDto>> updateMedicalRecord(
            @PathVariable UUID id,
            @Valid @RequestBody MedicalRecordUpdateDto request) {

        EncounterDetailDto updatedEncounter = emrService.updateMedicalRecord(id, request);
        return ResponseEntity
                .ok(new AppResponse<>("SUCCESS", "Medical record updated and AI analyzed.", updatedEncounter, null));
    }

    @PostMapping("/{id}/finish")
    @PreAuthorize("hasAuthority('EHR:WRITE')")
    @Operation(summary = "Finish encounter", description = "Close the encounter. Patient status becomes COMPLETED.")
    public ResponseEntity<AppResponse<EncounterDetailDto>> finishEncounter(@PathVariable UUID id) {

        EncounterDetailDto encounter = emrService.finishEncounter(id);
        return ResponseEntity.ok(new AppResponse<>("SUCCESS", "Encounter finished.", encounter, null));
    }

    @GetMapping("/by-appointment/{appointmentId}")
    @PreAuthorize("hasAuthority('EHR:READ_ANY') or hasAuthority('EHR:READ_OWN')")
    @Operation(summary = "Get encounter by appointment ID", description = "Find the medical encounter associated with a specific appointment.")
    public ResponseEntity<AppResponse<EncounterDetailDto>> getEncounterByAppointment(@PathVariable UUID appointmentId) {

        EncounterDetailDto encounter = emrService.getEncounterByAppointmentId(appointmentId);
        return ResponseEntity.ok(new AppResponse<>("SUCCESS", "Encounter retrieved successfully.", encounter, null));
    }
}