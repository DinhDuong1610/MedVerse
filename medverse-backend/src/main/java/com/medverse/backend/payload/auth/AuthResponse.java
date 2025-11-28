package com.medverse.backend.payload.auth;

import java.util.UUID;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Response object containing JWT access and refresh tokens")
public class AuthResponse {
    @Schema(description = "JWT Access Token (short-lived)")
    private String accessToken;

    @Schema(description = "JWT Refresh Token (long-lived)")
    private String refreshToken;

    private UUID userId;
    private String fullName;
    private String role;
}
