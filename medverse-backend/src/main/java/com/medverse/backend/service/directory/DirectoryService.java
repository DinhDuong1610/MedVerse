package com.medverse.backend.service.directory;

import com.medverse.backend.entity.DoctorProfile;
import com.medverse.backend.entity.Specialty;
import com.medverse.backend.entity.User;
import com.medverse.backend.entity.UserProfile;
import com.medverse.backend.payload.directory.DoctorDirectoryDto;
import com.medverse.backend.payload.directory.SpecialtyDirectoryDto;
import com.medverse.backend.repository.DoctorProfileRepository;
import com.medverse.backend.repository.SpecialtyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DirectoryService {

    private final SpecialtyRepository specialtyRepository;
    private final DoctorProfileRepository doctorProfileRepository;

    public Page<SpecialtyDirectoryDto> getSpecialties(Pageable pageable) {
        return specialtyRepository.findAll(pageable)
                .map(this::mapSpecialty);
    }

    public Page<DoctorDirectoryDto> getDoctors(UUID specialtyId, String keyword, Pageable pageable) {
        return doctorProfileRepository.searchDirectory(specialtyId, keyword, pageable)
                .map(this::mapDoctor);
    }

    private SpecialtyDirectoryDto mapSpecialty(Specialty specialty) {
        return SpecialtyDirectoryDto.builder()
                .id(specialty.getId())
                .code(specialty.getCode())
                .name(specialty.getName())
                .description(specialty.getDescription())
                .build();
    }

    private DoctorDirectoryDto mapDoctor(DoctorProfile profile) {
        User user = profile.getUser();
        UserProfile userProfile = user.getUserProfile();
        Specialty specialty = profile.getSpecialty();

        return DoctorDirectoryDto.builder()
                .userId(user.getId())
                .doctorProfileId(profile.getId())
                .email(user.getEmail())
                .fullName(userProfile != null ? userProfile.getFullName() : user.getEmail())
                .phoneNumber(userProfile != null ? userProfile.getPhoneNumber() : null)
                .gender(userProfile != null ? userProfile.getGender() : null)
                .specialtyId(specialty != null ? specialty.getId() : null)
                .specialtyCode(specialty != null ? specialty.getCode() : null)
                .specialtyName(specialty != null ? specialty.getName() : null)
                .licenseNumber(profile.getLicenseNumber())
                .degree(profile.getDegree())
                .experienceYears(profile.getExperienceYears())
                .bio(profile.getBio())
                .build();
    }
}