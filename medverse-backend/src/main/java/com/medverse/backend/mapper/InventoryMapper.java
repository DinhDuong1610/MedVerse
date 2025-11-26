package com.medverse.backend.mapper;

import com.medverse.backend.entity.inventory.Medication;
import com.medverse.backend.payload.inventory.MedicationCreateRequest;
import com.medverse.backend.payload.inventory.MedicationDto;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface InventoryMapper {

    @Mapping(target = "totalStock", ignore = true)
    MedicationDto toDto(Medication entity);

    Medication toEntity(MedicationCreateRequest request);
}