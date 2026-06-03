package com.medverse.backend.payload.admin;

import com.medverse.backend.utils.enumeration.UserStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
public class AdminUserDto {
    private UUID id;
    private String email;
    private UserStatus status;
    private OffsetDateTime lastLoginAt;

    private String fullName;
    private LocalDate dateOfBirth;
    private String gender;
    private String phoneNumber;
    private String address;

    private List<String> roles;
    private List<String> permissions;

    private UUID doctorProfileId;
    private UUID specialtyId;
    private String specialtyName;
    private String licenseNumber;
    private String degree;
    private Integer experienceYears;
    private String bio;
}