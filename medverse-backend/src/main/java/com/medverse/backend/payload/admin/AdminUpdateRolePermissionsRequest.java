package com.medverse.backend.payload.admin;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.LinkedHashSet;
import java.util.Set;

@Data
public class AdminUpdateRolePermissionsRequest {
    @NotNull
    private Set<String> permissionCodes = new LinkedHashSet<>();
}