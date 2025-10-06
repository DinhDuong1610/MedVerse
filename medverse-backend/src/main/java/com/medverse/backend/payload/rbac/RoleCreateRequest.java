package com.medverse.backend.payload.rbac;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
@Schema(description = "Request object for creating a new role")
public class RoleCreateRequest {

    @Schema(description = "Unique code for the role. Uppercase letters and underscores only.", example = "FINANCE_MANAGER", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotBlank(message = "Role code is required")
    @Size(min = 3, max = 50, message = "Role code must be between 3 and 50 characters")
    @Pattern(regexp = "^[A-Z_]+$", message = "Role code can only contain uppercase letters and underscores")
    private String code;

    @Schema(description = "User-friendly name of the role.", example = "Finance Manager", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotBlank(message = "Role name is required")
    @Size(max = 100, message = "Role name must not exceed 100 characters")
    private String name;

    @Schema(description = "A brief description of the role's purpose.", example = "Manages financial reports and billing.")
    private String description;
}
