package com.medverse.backend.payload.directory;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SpecialtyDirectoryDto {
    private UUID id;
    private String code;
    private String name;
    private String description;
}