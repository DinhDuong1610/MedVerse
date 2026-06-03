package com.medverse.backend.payload.auth;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Response object containing JWT tokens and authenticated user context")
public class AuthResponse {

    @Schema(description = "JWT Access Token (short-lived)")
    private String accessToken;

    @Schema(description = "JWT Refresh Token (long-lived)")
    private String refreshToken;

    @Schema(description = "Authenticated user id")
    private UUID userId;

    @Schema(description = "Authenticated user email")
    private String email;

    @Schema(description = "Authenticated user's full name")
    private String fullName;

    @Schema(description = "Primary role code for quick UI routing")
    private String primaryRole;

    @Schema(description = "Role codes assigned to the user")
    private List<String> roles;

    @Schema(description = "Permission codes resolved from roles")
    private List<String> permissions;
}