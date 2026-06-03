package com.medverse.backend.controller.ai;

import com.medverse.backend.payload.AppResponse;
import com.medverse.backend.payload.ai.*;
import com.medverse.backend.service.ai.AiClientService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/v1/ai")
@RequiredArgsConstructor
@Tag(name = "AI Integration", description = "Proxy APIs from backend to MedVerse AI service")
@SecurityRequirement(name = "bearerAuth")
public class AiController {

    private final AiClientService aiClientService;

    @GetMapping("/health")
    @PreAuthorize("hasAuthority('ADMIN_PANEL:ACCESS') or hasAuthority('EHR:WRITE')")
    @Operation(summary = "Check AI service health")
    public ResponseEntity<AppResponse<AiHealthDto>> health() {
        AiHealthDto health = aiClientService.health();
        return ResponseEntity.ok(new AppResponse<>("SUCCESS", "AI health checked.", health, null));
    }

    @GetMapping("/autocomplete/atc")
    @PreAuthorize("hasAuthority('PRESCRIPTION:WRITE') or hasAuthority('INVENTORY:READ')")
    @Operation(summary = "Autocomplete medication ATC")
    public ResponseEntity<AppResponse<AiAtcAutocompleteResponse>> autocompleteAtc(
            @RequestParam String q,
            @RequestParam(defaultValue = "10") Integer topK) {
        AiAtcAutocompleteResponse result = aiClientService.autocompleteAtc(q, topK);
        return ResponseEntity.ok(new AppResponse<>("SUCCESS", "ATC suggestions retrieved.", result, null));
    }

    @GetMapping("/autocomplete/icd")
    @PreAuthorize("hasAuthority('EHR:WRITE')")
    @Operation(summary = "Autocomplete ICD diagnosis")
    public ResponseEntity<AppResponse<AiIcdAutocompleteResponse>> autocompleteIcd(
            @RequestParam String q,
            @RequestParam(defaultValue = "10") Integer topK) {
        AiIcdAutocompleteResponse result = aiClientService.autocompleteIcd(q, topK);
        return ResponseEntity.ok(new AppResponse<>("SUCCESS", "ICD suggestions retrieved.", result, null));
    }

    @PostMapping("/analyze-text")
    @PreAuthorize("hasAuthority('EHR:WRITE')")
    @Operation(summary = "Analyze clinical text")
    public ResponseEntity<AppResponse<AiAnalyzeTextResponse>> analyzeText(
            @RequestBody AiAnalyzeTextRequest request) {
        AiAnalyzeTextResponse result = aiClientService.analyzeText(request);
        return ResponseEntity.ok(new AppResponse<>("SUCCESS", "Clinical text analyzed.", result, null));
    }
}