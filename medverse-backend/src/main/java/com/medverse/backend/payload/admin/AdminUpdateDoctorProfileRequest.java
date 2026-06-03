package com.medverse.backend.payload.admin;

import lombok.Data;

import java.util.UUID;

@Data
public class AdminUpdateDoctorProfileRequest {
    private UUID specialtyId;
    private String licenseNumber;
    private String degree;
    private Integer experienceYears;
    private String bio;
}