package com.medverse.backend.payload.admin;

import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.UUID;

@Data
@Builder
public class AdminRolePermissionDto {
    private UUID id;
    private String code;
    private String name;
    private String description;
    private int permissionCount;
    private List<AdminPermissionDto> permissions;
}