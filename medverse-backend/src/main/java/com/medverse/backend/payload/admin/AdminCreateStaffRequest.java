package com.medverse.backend.payload.admin;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDate;
import java.util.UUID;

@Data
public class AdminCreateStaffRequest {
    @Email
    @NotBlank
    private String email;

    @NotBlank
    @Size(min = 8, max = 100)
    private String password;

    @NotBlank
    private String fullName;

    private LocalDate dateOfBirth;
    private String gender;
    private String phoneNumber;
    private String address;

    @NotBlank
    @Pattern(regexp = "DOCTOR|RECEPTIONIST", message = "roleCode must be DOCTOR or RECEPTIONIST")
    private String roleCode;

    private UUID specialtyId;
    private String licenseNumber;
    private String degree;
    private Integer experienceYears;
    private String bio;
}