package com.medverse.backend.payload.rbac;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
@Schema(description = "Represents a single, granular permission in the system")
public class PermissionDto {
    @Schema(description = "The unique code of the permission", example = "EHR:READ_ANY")
    private String code;

    @Schema(description = "A user-friendly description of what the permission allows", example = "Allows a doctor to view any patient's electronic health records.")
    private String description;
}
