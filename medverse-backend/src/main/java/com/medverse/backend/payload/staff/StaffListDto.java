package com.medverse.backend.payload.staff;

import com.medverse.backend.utils.enumeration.UserStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.Set;
import java.util.UUID;

@Data
@Builder
public class StaffListDto {
    private UUID userId;
    private String email;
    private String fullName;
    private UserStatus status;
    private Set<String> roles;
    private LocalDateTime createdAt;
}
