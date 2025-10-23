package com.medverse.backend.payload.staff;

import com.medverse.backend.utils.enumeration.RoleCode;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class StaffCreateRequest {

    @Schema(description = "User's email address. Must be unique.", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotBlank(message = "Email is required")
    @Email(message = "Email format is invalid")
    private String email;

    @Schema(description = "User's initial password. Must be at least 8 characters.", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotBlank(message = "Password is required")
    @Size(min = 8, message = "Password must be at least 8 characters long")
    private String password;

    @Schema(description = "User's full name.", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotBlank(message = "Full name is required")
    private String fullName;

    @Schema(description = "The primary role to assign to the staff member.", requiredMode = Schema.RequiredMode.REQUIRED, example = "DOCTOR")
    @NotNull(message = "Role is required")
    private RoleCode role;

    @Schema(description = "Doctor-specific profile details. Required if role is DOCTOR.")
    @Valid
    private DoctorProfileRequest doctorProfile;

    @Schema(description = "Receptionist-specific profile details. Required if role is RECEPTIONIST.")
    @Valid
    private ReceptionistProfileRequest receptionistProfile;
}