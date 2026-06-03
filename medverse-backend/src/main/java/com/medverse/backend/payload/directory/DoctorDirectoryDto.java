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
public class DoctorDirectoryDto {
    private UUID userId;
    private UUID doctorProfileId;

    private String email;
    private String fullName;
    private String phoneNumber;
    private String gender;

    private UUID specialtyId;
    private String specialtyCode;
    private String specialtyName;

    private String licenseNumber;
    private String degree;
    private Integer experienceYears;
    private String bio;
}