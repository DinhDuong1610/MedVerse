package com.medverse.backend.payload.rbac;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Data;
import java.util.Set;
import java.util.UUID;

@Data
@Builder
@Schema(description = "Represents a role and the set of permissions assigned to it")
public class RoleDto {
    private UUID id;
    private String code;
    private String name;
    private String description;
    private Set<PermissionDto> permissions;
}
