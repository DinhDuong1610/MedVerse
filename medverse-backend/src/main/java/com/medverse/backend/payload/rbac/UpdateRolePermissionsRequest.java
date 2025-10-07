package com.medverse.backend.payload.rbac;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.Set;

@Data
@Schema(description = "Request object for updating the permissions of a role")
public class UpdateRolePermissionsRequest {

    @Schema(description = "A set of permission codes to be assigned to the role. This will overwrite all existing permissions.", example = "[\"APPOINTMENT:READ_ANY\", \"APPOINTMENT:WRITE_ANY\"]", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotEmpty(message = "At least one permission code must be provided")
    private Set<String> permissionCodes;
}
