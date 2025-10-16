package com.medverse.backend.payload.staff;

import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class SpecialtyDto {
    private UUID id;
    private String code;
    private String name;
    private String description;
}
