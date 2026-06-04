package com.medverse.backend.payload.admin;

import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class AdminPermissionDto {
    private UUID id;
    private String code;
    private String description;
    private String groupName;
}