package com.medverse.backend.payload.staff;

import com.medverse.backend.utils.enumeration.UserStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class StaffUpdateRequest {

    @Schema(description = "User's full name.", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotBlank(message = "Full name is required")
    private String fullName;

    @Schema(description = "Account status", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotNull(message = "Status is required")
    private UserStatus status;

    @Schema(description = "Doctor-specific profile details. Should be provided if the user is a doctor.")
    @Valid
    private DoctorProfileRequest doctorProfile;

    @Schema(description = "Receptionist-specific profile details. Should be provided if the user is a receptionist.")
    @Valid
    private ReceptionistProfileRequest receptionistProfile;
}