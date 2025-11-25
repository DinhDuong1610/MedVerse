package com.medverse.backend.mapper;

import com.medverse.backend.entity.Appointment;
import com.medverse.backend.entity.AppointmentRequest;
import com.medverse.backend.entity.WorkSlot;
import com.medverse.backend.payload.appointment.AppointmentDto;
import com.medverse.backend.payload.appointment.AppointmentRequestDto;
import com.medverse.backend.payload.appointment.WorkSlotDto;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface AppointmentMapper {

    @Mapping(target = "doctorId", source = "doctor.id")
    @Mapping(target = "doctorName", source = "doctor.userProfile.fullName")
    WorkSlotDto toDto(WorkSlot entity);

    @Mapping(target = "patientId", source = "patient.id")
    @Mapping(target = "patientName", source = "patient.userProfile.fullName")
    @Mapping(target = "doctorId", source = "doctor.id")
    @Mapping(target = "doctorName", source = "doctor.userProfile.fullName")
    @Mapping(target = "specialtyId", source = "specialty.id")
    @Mapping(target = "specialtyName", source = "specialty.name")
    AppointmentRequestDto toDto(AppointmentRequest entity);

    @Mapping(target = "patientId", source = "patient.id")
    @Mapping(target = "patientName", source = "patient.userProfile.fullName")
    @Mapping(target = "doctorId", source = "doctor.id")
    @Mapping(target = "doctorName", source = "doctor.userProfile.fullName")
    @Mapping(target = "workSlotId", source = "workSlot.id")
    AppointmentDto toDto(Appointment entity);
}