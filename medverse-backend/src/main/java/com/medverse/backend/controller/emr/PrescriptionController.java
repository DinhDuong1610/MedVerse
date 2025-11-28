package com.medverse.backend.controller.emr;

import com.medverse.backend.payload.AppResponse;
import com.medverse.backend.payload.ai.AiInteractionPayload;
import com.medverse.backend.payload.emr.PrescriptionDto;
import com.medverse.backend.payload.emr.PrescriptionItemRequest;
import com.medverse.backend.service.emr.PrescriptionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/v1")
@RequiredArgsConstructor
@Tag(name = "EMR - Prescription", description = "Manage prescriptions and drug interactions")
@SecurityRequirement(name = "bearerAuth")
public class PrescriptionController {

    private final PrescriptionService prescriptionService;

    @GetMapping("/encounters/{encounterId}/prescription")
    @PreAuthorize("hasAuthority('PRESCRIPTION:READ')")
    @Operation(summary = "Get prescription by encounter", description = "Get the prescription associated with a specific encounter.")
    public ResponseEntity<AppResponse<PrescriptionDto>> getPrescription(@PathVariable UUID encounterId) {

        PrescriptionDto prescription = prescriptionService.getOrCreatePrescription(encounterId);
        return ResponseEntity.ok(new AppResponse<>("SUCCESS", "Prescription retrieved.", prescription, null));
    }

    @PostMapping("/encounters/{encounterId}/prescription/items")
    @PreAuthorize("hasAuthority('PRESCRIPTION:WRITE')")
    @Operation(summary = "Add medication to prescription (AI Check)", description = "Add a drug to the list. Triggers AI Module 3 to check for interactions (DDI).")
    public ResponseEntity<AppResponse<AiInteractionPayload.Response>> addMedication(
            @PathVariable UUID encounterId,
            @Valid @RequestBody PrescriptionItemRequest request) {

        AiInteractionPayload.Response aiAlerts = prescriptionService.addMedication(encounterId, request);

        String message = (aiAlerts.getAlerts() == null || aiAlerts.getAlerts().isEmpty())
                ? "Medication added successfully."
                : "Medication added with warnings.";

        return ResponseEntity.ok(new AppResponse<>("SUCCESS", message, aiAlerts, null));
    }

    @DeleteMapping("/prescription-items/{itemId}")
    @PreAuthorize("hasAuthority('PRESCRIPTION:WRITE')")
    @Operation(summary = "Remove medication", description = "Remove a drug from the prescription draft.")
    public ResponseEntity<AppResponse<Void>> removeMedication(@PathVariable UUID itemId) {

        prescriptionService.removeMedication(itemId);
        return ResponseEntity.ok(new AppResponse<>("SUCCESS", "Medication removed.", null, null));
    }

    @PostMapping("/encounters/{encounterId}/prescription/issue")
    @PreAuthorize("hasAuthority('PRESCRIPTION:WRITE')")
    @Operation(summary = "Issue prescription", description = "Finalize the prescription and deduct inventory stock.")
    public ResponseEntity<AppResponse<PrescriptionDto>> issuePrescription(@PathVariable UUID encounterId) {

        PrescriptionDto prescription = prescriptionService.issuePrescription(encounterId);
        return ResponseEntity.ok(new AppResponse<>("SUCCESS", "Prescription issued successfully.", prescription, null));
    }
}