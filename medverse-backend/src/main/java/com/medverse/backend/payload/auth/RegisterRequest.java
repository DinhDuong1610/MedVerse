package com.medverse.backend.payload.auth;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.time.LocalDate;

@Data
@Schema(description = "Request object for full user registration including profile information")
public class RegisterRequest {

    // --- Authentication Info ---
    @Schema(description = "User's email address. Must be unique.", example = "user123@example.com", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotBlank(message = "Email is required")
    @Email(message = "Email format is invalid")
    private String email;

    @Schema(description = "User's password, at least 8 characters long.", example = "SecurePassword123", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotBlank(message = "Password is required")
    @Size(min = 8, message = "Password must be at least 8 characters long")
    private String password;

    // --- Profile Info ---
    @Schema(description = "User's full name.", example = "Dinh Duong", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotBlank(message = "Full name is required")
    @Size(max = 100, message = "Full name must not exceed 100 characters")
    private String fullName;

    @Schema(description = "User's date of birth. Must be in the past.", example = "2005-10-16")
    @Past(message = "Date of birth must be in the past")
    private LocalDate dateOfBirth;

    @Schema(description = "User's gender.", example = "Male")
    private String gender;

    @Schema(description = "User's phone number in Vietnamese format.", example = "0987654321")
    @Pattern(regexp = "^(0|\\+84)[\\d]{9}$", message = "Invalid Vietnamese phone number format")
    private String phoneNumber;

    @Schema(description = "User's address.", example = "Tran Dai Nghia, Ngu Hanh Son, Da Nang, Vietnam")
    private String address;
}