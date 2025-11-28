package com.medverse.backend.mapper;

import com.medverse.backend.entity.emr.*;
import com.medverse.backend.payload.emr.*;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface EmrMapper {

    EmrConditionDto toDto(EmrCondition entity);

    EmrObservationDto toDto(EmrObservation entity);

    @Mapping(target = "doctorName", source = "doctor.userProfile.fullName")
    @Mapping(target = "patientName", source = "patient.userProfile.fullName")
    @Mapping(target = "encounterId", source = "encounter.id")
    PrescriptionDto toDto(Prescription entity);

    @Mapping(target = "id", source = "id")
    @Mapping(target = "medicationId", source = "medication.id")
    @Mapping(target = "medicationName", source = "medication.name")
    @Mapping(target = "medicationAtcCode", source = "medication.atcCode")
    @Mapping(target = "packingSpecification", source = "medication.packingSpecification")
    PrescriptionDto.PrescriptionItemDto toDto(PrescriptionItem entity);

    @Mapping(target = "patientId", source = "patient.userProfile.id")
    @Mapping(target = "patientName", source = "patient.userProfile.fullName")
    @Mapping(target = "patientDob", source = "patient.userProfile.dateOfBirth")
    @Mapping(target = "patientGender", source = "patient.userProfile.gender")
    @Mapping(target = "patientPhoneNumber", source = "patient.userProfile.phoneNumber")
    @Mapping(target = "patientAddress", source = "patient.userProfile.address")
    @Mapping(target = "doctorName", source = "doctor.userProfile.fullName")
    @Mapping(target = "appointmentId", source = "appointment.id")
    @Mapping(target = "diagnoses", ignore = true)
    @Mapping(target = "observations", ignore = true)
    @Mapping(target = "prescription", ignore = true)
    EncounterDetailDto toDto(Encounter entity);
}