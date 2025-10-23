package com.medverse.backend.payload.staff;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.Data;

import java.util.UUID;

@Data
public class DoctorProfileRequest {
    @Schema(description = "ID of the specialty", example = "uuid-cua-chuyen-khoa-tim-mach")
    private UUID specialtyId;

    @Schema(description = "Doctor's license number", example = "CCHN0012345")
    private String licenseNumber;

    @Schema(description = "Doctor's degree", example = "MD, PhD")
    private String degree;

    @Schema(description = "Years of professional experience", example = "10")
    @PositiveOrZero(message = "Experience years must be a positive number or zero")
    private Integer experienceYears;

    @Schema(description = "A short biography of the doctor")
    private String bio;
}
