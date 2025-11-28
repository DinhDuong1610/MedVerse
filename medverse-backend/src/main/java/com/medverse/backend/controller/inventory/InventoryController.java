package com.medverse.backend.controller.inventory;

import com.medverse.backend.payload.AppResponse;
import com.medverse.backend.payload.inventory.MedicationCreateRequest;
import com.medverse.backend.payload.inventory.MedicationDto;
import com.medverse.backend.payload.inventory.StockImportRequest;
import com.medverse.backend.service.inventory.InventoryService;
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
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/v1/inventory")
@RequiredArgsConstructor
@Tag(name = "Inventory Management", description = "APIs for Medications and Stock Management")
@SecurityRequirement(name = "bearerAuth")
public class InventoryController {

    private final InventoryService inventoryService;

    @PostMapping("/medications")
    @PreAuthorize("hasAuthority('INVENTORY:WRITE')")
    @Operation(summary = "Create a new medication", description = "Define a new medication in the catalog (Master Data).")
    public ResponseEntity<AppResponse<MedicationDto>> createMedication(
            @Valid @RequestBody MedicationCreateRequest request) {

        MedicationDto medication = inventoryService.createMedication(request);
        return new ResponseEntity<>(
                new AppResponse<>("SUCCESS", "Medication created successfully.", medication, null),
                HttpStatus.CREATED);
    }

    @GetMapping("/medications")
    @PreAuthorize("hasAuthority('INVENTORY:READ')")
    @Operation(summary = "List medications", description = "Get list of medications with real-time stock quantity. Supports search by name, code, or active ingredient.")
    public ResponseEntity<AppResponse<Page<MedicationDto>>> getMedications(
            @RequestParam(required = false) String keyword,
            @ParameterObject @PageableDefault(size = 20, sort = "name") Pageable pageable) {

        Page<MedicationDto> page = inventoryService.getMedications(keyword, pageable);
        return ResponseEntity.ok(
                new AppResponse<>("SUCCESS", "Medications retrieved successfully.", page, null));
    }

    @GetMapping("/medications/{id}")
    @PreAuthorize("hasAuthority('INVENTORY:READ')")
    @Operation(summary = "Get medication details", description = "Get details of a specific medication including total stock.")
    public ResponseEntity<AppResponse<MedicationDto>> getMedicationById(@PathVariable UUID id) {

        MedicationDto medication = inventoryService.getMedicationById(id);
        return ResponseEntity.ok(
                new AppResponse<>("SUCCESS", "Medication details retrieved successfully.", medication, null));
    }

    @PostMapping("/import")
    @PreAuthorize("hasAuthority('INVENTORY:WRITE')")
    @Operation(summary = "Import stock (Receipt)", description = "Import a batch of medication into stock. Creates a new batch or updates existing one.")
    public ResponseEntity<AppResponse<Void>> importStock(@Valid @RequestBody StockImportRequest request) {

        inventoryService.importStock(request);
        return ResponseEntity.ok(
                new AppResponse<>("SUCCESS", "Stock imported successfully.", null, null));
    }

    @GetMapping("/medications/atc/{atcCode}")
    @PreAuthorize("hasAuthority('INVENTORY:READ')")
    @Operation(summary = "Get medication by ATC code", description = "Get details of the first medication found with the given ATC code. Useful for AI integration.")
    public ResponseEntity<AppResponse<MedicationDto>> getMedicationByAtcCode(@PathVariable String atcCode) {

        MedicationDto medication = inventoryService.getMedicationByAtcCode(atcCode);
        return ResponseEntity.ok(
                new AppResponse<>("SUCCESS", "Medication details retrieved successfully.", medication, null));
    }

    @GetMapping("/medications/smart-search")
    @PreAuthorize("hasAuthority('INVENTORY:READ')")
    @Operation(summary = "Smart search by ATC and Unit", description = "Find medications matching ATC code and specific dosage/unit from AI.")
    public ResponseEntity<AppResponse<List<MedicationDto>>> smartSearch(
            @RequestParam String atcCode,
            @RequestParam String unitStr) {

        List<MedicationDto> results = inventoryService.findSmartMedications(atcCode, unitStr);
        return ResponseEntity.ok(new AppResponse<>("SUCCESS", "Smart search results.", results, null));
    }
}