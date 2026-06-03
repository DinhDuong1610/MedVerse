package com.medverse.backend.payload.admin;

import com.medverse.backend.utils.enumeration.UserStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class AdminUpdateUserStatusRequest {
    @NotNull
    private UserStatus status;

    private String reason;
}