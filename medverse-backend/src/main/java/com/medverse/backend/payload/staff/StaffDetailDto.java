package com.medverse.backend.payload.staff;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.medverse.backend.entity.DoctorProfile;
import com.medverse.backend.entity.ReceptionistProfile;
import com.medverse.backend.entity.Specialty;
import com.medverse.backend.entity.User;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class StaffDetailDto {
    private UUID userId;
    private String email;
    private String fullName;
    private Set<String> roles;
    private LocalDateTime createdAt;

    private DoctorInfo doctorProfile;

    private ReceptionistInfo receptionistProfile;

    @Data
    @Builder
    public static class DoctorInfo {
        private UUID profileId;
        private SpecialtyDto specialty;
        private String licenseNumber;
        private String degree;
        private Integer experienceYears;
        private String bio;
    }

    @Data
    @Builder
    public static class ReceptionistInfo {
        private UUID profileId;
        private String employeeId;
    }

    public static StaffDetailDto from(User user, DoctorProfile docProfile, ReceptionistProfile recepProfile) {
        Set<String> roleCodes = user.getUserRoles().stream()
                .map(ur -> ur.getRole().getCode())
                .collect(Collectors.toSet());

        StaffDetailDtoBuilder builder = StaffDetailDto.builder()
                .userId(user.getId())
                .email(user.getEmail())
                .fullName(user.getUserProfile().getFullName())
                .roles(roleCodes)
                .createdAt(user.getCreatedAt());

        if (docProfile != null) {
            builder.doctorProfile(DoctorInfo.builder()
                    .profileId(docProfile.getId())
                    .licenseNumber(docProfile.getLicenseNumber())
                    .degree(docProfile.getDegree())
                    .experienceYears(docProfile.getExperienceYears())
                    .bio(docProfile.getBio())
                    .specialty(mapSpecialty(docProfile.getSpecialty()))
                    .build());
        }

        if (recepProfile != null) {
            builder.receptionistProfile(ReceptionistInfo.builder()
                    .profileId(recepProfile.getId())
                    .employeeId(recepProfile.getEmployeeId())
                    .build());
        }

        return builder.build();
    }

    private static SpecialtyDto mapSpecialty(Specialty specialty) {
        if (specialty == null)
            return null;
        return SpecialtyDto.builder()
                .id(specialty.getId())
                .code(specialty.getCode())
                .name(specialty.getName())
                .build();
    }
}
