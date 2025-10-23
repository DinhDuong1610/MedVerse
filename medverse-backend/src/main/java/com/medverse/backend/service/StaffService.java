package com.medverse.backend.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.medverse.backend.entity.*;
import com.medverse.backend.payload.staff.DoctorProfileRequest;
import com.medverse.backend.payload.staff.ReceptionistProfileRequest;
import com.medverse.backend.payload.staff.SpecialtyDto;
import com.medverse.backend.payload.staff.StaffCreateRequest;
import com.medverse.backend.payload.staff.StaffDetailDto;
import com.medverse.backend.payload.staff.StaffListDto;
import com.medverse.backend.payload.staff.StaffUpdateRequest;
import com.medverse.backend.repository.*;
import com.medverse.backend.utils.enumeration.RoleCode;
import com.medverse.backend.utils.enumeration.UserStatus;
import com.medverse.backend.utils.exception.DuplicateResourceException;
import com.medverse.backend.utils.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
@Slf4j
public class StaffService {

    private final UserRepository userRepository;
    private final SpecialtyRepository specialtyRepository;
    private final RoleRepository roleRepository;
    private final DoctorProfileRepository doctorProfileRepository;
    private final ReceptionistProfileRepository receptionistProfileRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;
    private final ObjectMapper objectMapper;

    public List<SpecialtyDto> findAllSpecialties() {
        log.info("Fetching all specialties");
        return specialtyRepository.findAll().stream()
                .map(this::mapToSpecialtyDto)
                .collect(Collectors.toList());
    }

    public Page<StaffListDto> findAllStaff(Pageable pageable) {
        log.info("Fetching all staff members for page: {}", pageable.getPageNumber());
        List<String> staffRoles = Stream.of(RoleCode.ADMIN, RoleCode.DOCTOR, RoleCode.RECEPTIONIST)
                .map(Enum::name)
                .collect(Collectors.toList());

        Page<User> staffPage = userRepository.findUsersByRoleCodes(staffRoles, pageable);

        return staffPage.map(this::mapToStaffListDto);
    }

    @Transactional(readOnly = true)
    public StaffDetailDto findStaffById(UUID userId) {
        log.info("Fetching details for staff member with ID: {}", userId);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        Optional<DoctorProfile> docProfile = doctorProfileRepository.findByUser(user);
        Optional<ReceptionistProfile> recepProfile = receptionistProfileRepository.findByUser(user);

        return StaffDetailDto.from(user, docProfile.orElse(null), recepProfile.orElse(null));
    }

    @Transactional
    public StaffListDto createStaff(StaffCreateRequest request) {
        log.info("Attempting to create a new staff member with email: {}", request.getEmail());

        validateStaffRequest(request);

        User newUser = new User();
        newUser.setEmail(request.getEmail());
        newUser.setPassword(passwordEncoder.encode(request.getPassword()));
        newUser.setStatus(UserStatus.ACTIVE);

        UserProfile userProfile = new UserProfile();
        userProfile.setFullName(request.getFullName());
        userProfile.setUser(newUser);
        newUser.setUserProfile(userProfile);

        Role assignedRole = roleRepository.findByCode(request.getRole().name())
                .orElseThrow(() -> new ResourceNotFoundException("Role", "code", request.getRole().name()));
        UserRole userRole = new UserRole(newUser, assignedRole);
        newUser.setUserRoles(Set.of(userRole));

        User savedUser = userRepository.save(newUser);

        switch (request.getRole()) {
            case DOCTOR -> {
                DoctorProfile docProfile = new DoctorProfile();
                docProfile.setUser(savedUser);
                if (request.getDoctorProfile().getSpecialtyId() != null) {
                    Specialty specialty = specialtyRepository.findById(request.getDoctorProfile().getSpecialtyId())
                            .orElseThrow(() -> new ResourceNotFoundException("Specialty", "id",
                                    request.getDoctorProfile().getSpecialtyId()));
                    docProfile.setSpecialty(specialty);
                }
                docProfile.setLicenseNumber(request.getDoctorProfile().getLicenseNumber());
                docProfile.setDegree(request.getDoctorProfile().getDegree());
                docProfile.setExperienceYears(request.getDoctorProfile().getExperienceYears());
                docProfile.setBio(request.getDoctorProfile().getBio());
                doctorProfileRepository.save(docProfile);
            }
            case RECEPTIONIST -> {
                ReceptionistProfile recepProfile = new ReceptionistProfile();
                recepProfile.setUser(savedUser);
                recepProfile.setEmployeeId(request.getReceptionistProfile().getEmployeeId());
                receptionistProfileRepository.save(recepProfile);
            }
        }

        log.info("Successfully created new staff member with user ID: {}", savedUser.getId());
        try {
            String detailsJson = objectMapper.writeValueAsString(
                    Map.of("email", savedUser.getEmail(), "role", assignedRole.getCode()));
            auditService.record("CREATE_STAFF", "USER", savedUser.getId().toString(), detailsJson);
        } catch (JsonProcessingException e) {
            log.error("Failed to serialize details for audit log on CREATE_STAFF for user ID: {}", savedUser.getId(),
                    e);
        }

        return mapToStaffListDto(savedUser);
    }

    @Transactional
    public StaffDetailDto updateStaff(UUID userId, StaffUpdateRequest request) {
        log.info("Attempting to update staff member with ID: {}", userId);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        user.getUserProfile().setFullName(request.getFullName());
        user.setStatus(request.getStatus());
        userRepository.save(user);

        if (user.hasRole(RoleCode.DOCTOR) && request.getDoctorProfile() != null) {
            updateDoctorProfile(user, request.getDoctorProfile());
        } else if (user.hasRole(RoleCode.RECEPTIONIST) && request.getReceptionistProfile() != null) {
            updateReceptionistProfile(user, request.getReceptionistProfile());
        }

        log.info("Successfully updated staff member with user ID: {}", userId);
        auditService.record("UPDATE_STAFF", "USER", userId.toString(), toJsonDetails(request));

        return findStaffById(userId);
    }

    private void updateDoctorProfile(User user, DoctorProfileRequest profileRequest) {
        DoctorProfile doctorProfile = doctorProfileRepository.findByUser(user)
                .orElseGet(() -> {
                    DoctorProfile newProfile = new DoctorProfile();
                    newProfile.setUser(user);
                    return newProfile;
                });
        if (profileRequest.getSpecialtyId() != null) {
            Specialty specialty = specialtyRepository.findById(profileRequest.getSpecialtyId())
                    .orElseThrow(
                            () -> new ResourceNotFoundException("Specialty", "id", profileRequest.getSpecialtyId()));
            doctorProfile.setSpecialty(specialty);
        }

        doctorProfile.setLicenseNumber(profileRequest.getLicenseNumber());
        doctorProfile.setDegree(profileRequest.getDegree());
        doctorProfile.setExperienceYears(profileRequest.getExperienceYears());
        doctorProfile.setBio(profileRequest.getBio());
        doctorProfileRepository.save(doctorProfile);
    }

    @Transactional
    public void deactivateStaff(UUID userId) {
        log.warn("Attempting to soft-delete staff member with ID: {}", userId);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getName().equals(user.getEmail())) {
            throw new IllegalArgumentException("Cannot deactivate your own account.");
        }

        if (user.hasRole(RoleCode.ADMIN)) {
            List<String> adminRoleCode = List.of(RoleCode.ADMIN.name());
            Page<User> admins = userRepository.findUsersByRoleCodes(adminRoleCode, Pageable.unpaged());
            if (admins.getTotalElements() <= 1) {
                throw new IllegalArgumentException("Cannot delete the last administrator account.");
            }
        }

        userRepository.delete(user);

        log.warn("ADMIN ACTION: Soft-deleted staff member with user ID: {}", userId);
        auditService.record("DEACTIVATE_STAFF", "USER", userId.toString(),
                toJsonDetails(Map.<String, Object>of("email", user.getEmail(), "reason", "Deactivated by admin")));
    }

    private void updateReceptionistProfile(User user, ReceptionistProfileRequest profileRequest) {
        ReceptionistProfile recepProfile = receptionistProfileRepository.findByUser(user)
                .orElseGet(() -> {
                    ReceptionistProfile newProfile = new ReceptionistProfile();
                    newProfile.setUser(user);
                    return newProfile;
                });

        recepProfile.setEmployeeId(profileRequest.getEmployeeId());
        receptionistProfileRepository.save(recepProfile);
    }

    private void validateStaffRequest(StaffCreateRequest request) {
        userRepository.findByEmail(request.getEmail()).ifPresent(u -> {
            throw new DuplicateResourceException("User", "email", request.getEmail());
        });

        if (request.getRole() == RoleCode.PATIENT) {
            throw new IllegalArgumentException("Cannot create a PATIENT role via staff creation API.");
        }

        if (request.getRole() == RoleCode.DOCTOR && request.getDoctorProfile() == null) {
            throw new IllegalArgumentException("Doctor profile is required for DOCTOR role.");
        }
        if (request.getRole() == RoleCode.RECEPTIONIST && request.getReceptionistProfile() == null) {
            throw new IllegalArgumentException("Receptionist profile is required for RECEPTIONIST role.");
        }
    }

    private SpecialtyDto mapToSpecialtyDto(Specialty specialty) {
        return SpecialtyDto.builder()
                .id(specialty.getId())
                .code(specialty.getCode())
                .name(specialty.getName())
                .description(specialty.getDescription())
                .build();
    }

    private StaffListDto mapToStaffListDto(User user) {
        return StaffListDto.builder()
                .userId(user.getId())
                .email(user.getEmail())
                .fullName(user.getUserProfile() != null ? user.getUserProfile().getFullName() : "")
                .status(user.getStatus())
                .roles(user.getUserRoles().stream()
                        .map(UserRole::getRole)
                        .map(role -> role.getCode())
                        .collect(Collectors.toSet()))
                .createdAt(user.getCreatedAt())
                .build();
    }

    private String toJsonDetails(Object details) {
        try {
            return objectMapper.writeValueAsString(details);
        } catch (JsonProcessingException e) {
            log.error("Failed to serialize details for audit log", e);
            return "{\"error\":\"Serialization failed\"}";
        }
    }

}
