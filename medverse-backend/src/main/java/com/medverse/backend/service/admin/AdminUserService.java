package com.medverse.backend.service.admin;

import com.medverse.backend.entity.DoctorProfile;
import com.medverse.backend.entity.Permission;
import com.medverse.backend.entity.Role;
import com.medverse.backend.entity.Specialty;
import com.medverse.backend.entity.User;
import com.medverse.backend.entity.UserProfile;
import com.medverse.backend.entity.UserRole;
import com.medverse.backend.payload.admin.AdminCreateStaffRequest;
import com.medverse.backend.payload.admin.AdminUserDto;
import com.medverse.backend.repository.DoctorProfileRepository;
import com.medverse.backend.repository.RoleRepository;
import com.medverse.backend.repository.SpecialtyRepository;
import com.medverse.backend.repository.UserRepository;
import com.medverse.backend.service.AuditService;
import com.medverse.backend.utils.enumeration.UserStatus;
import com.medverse.backend.utils.exception.DuplicateResourceException;
import com.medverse.backend.utils.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AdminUserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final DoctorProfileRepository doctorProfileRepository;
    private final SpecialtyRepository specialtyRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;

    public Page<AdminUserDto> getUsers(String roleCode, Pageable pageable) {
        Page<User> users;

        if (roleCode == null || roleCode.isBlank() || roleCode.equalsIgnoreCase("ALL")) {
            users = userRepository.findAll(pageable);
        } else {
            users = userRepository.findUsersByRoleCodes(List.of(roleCode.toUpperCase()), pageable);
        }

        return users.map(this::toDto);
    }

    public AdminUserDto getUserById(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        return toDto(user);
    }

    @Transactional
    public AdminUserDto createStaff(AdminCreateStaffRequest request) {
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new DuplicateResourceException("User", "email", request.getEmail());
        }

        String roleCode = request.getRoleCode().toUpperCase();

        if (!roleCode.equals("DOCTOR") && !roleCode.equals("RECEPTIONIST")) {
            throw new IllegalArgumentException("Admin can only create DOCTOR or RECEPTIONIST in this workflow.");
        }

        Role role = roleRepository.findByCode(roleCode)
                .orElseThrow(() -> new ResourceNotFoundException("Role", "code", roleCode));

        User user = new User();
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setStatus(UserStatus.ACTIVE);

        UserProfile profile = new UserProfile();
        profile.setUser(user);
        profile.setFullName(request.getFullName());
        profile.setDateOfBirth(request.getDateOfBirth());
        profile.setGender(request.getGender());
        profile.setPhoneNumber(request.getPhoneNumber());
        profile.setAddress(request.getAddress());

        UserRole userRole = new UserRole(user, role);

        user.setUserProfile(profile);
        user.setUserRoles(new HashSet<>(List.of(userRole)));

        User savedUser = userRepository.save(user);

        if (roleCode.equals("DOCTOR")) {
            DoctorProfile doctorProfile = new DoctorProfile();
            doctorProfile.setUser(savedUser);
            doctorProfile.setLicenseNumber(request.getLicenseNumber());
            doctorProfile.setDegree(request.getDegree());
            doctorProfile.setExperienceYears(request.getExperienceYears());
            doctorProfile.setBio(request.getBio());

            if (request.getSpecialtyId() != null) {
                Specialty specialty = specialtyRepository.findById(request.getSpecialtyId())
                        .orElseThrow(() -> new ResourceNotFoundException("Specialty", "id", request.getSpecialtyId()));

                doctorProfile.setSpecialty(specialty);
            }

            doctorProfileRepository.save(doctorProfile);
        }

        auditService.record(
                "ADMIN_CREATE_STAFF",
                "USER",
                savedUser.getId().toString(),
                "Created " + roleCode + " account: " + savedUser.getEmail());

        return toDto(savedUser);
    }

    private AdminUserDto toDto(User user) {
        UserProfile profile = user.getUserProfile();

        DoctorProfile doctorProfile = doctorProfileRepository
                .findByUserId(user.getId())
                .orElse(null);

        List<String> roles = user.getUserRoles()
                .stream()
                .map(UserRole::getRole)
                .map(Role::getCode)
                .distinct()
                .sorted()
                .toList();

        List<String> permissions = user.getAuthorities()
                .stream()
                .map(GrantedAuthority::getAuthority)
                .filter(authority -> !authority.startsWith("ROLE_"))
                .distinct()
                .sorted()
                .toList();

        return AdminUserDto.builder()
                .id(user.getId())
                .email(user.getEmail())
                .status(user.getStatus())
                .lastLoginAt(user.getLastLoginAt())
                .fullName(profile != null ? profile.getFullName() : null)
                .dateOfBirth(profile != null ? profile.getDateOfBirth() : null)
                .gender(profile != null ? profile.getGender() : null)
                .phoneNumber(profile != null ? profile.getPhoneNumber() : null)
                .address(profile != null ? profile.getAddress() : null)
                .roles(roles)
                .permissions(permissions)
                .doctorProfileId(doctorProfile != null ? doctorProfile.getId() : null)
                .specialtyId(
                        doctorProfile != null && doctorProfile.getSpecialty() != null
                                ? doctorProfile.getSpecialty().getId()
                                : null)
                .specialtyName(
                        doctorProfile != null && doctorProfile.getSpecialty() != null
                                ? doctorProfile.getSpecialty().getName()
                                : null)
                .licenseNumber(doctorProfile != null ? doctorProfile.getLicenseNumber() : null)
                .degree(doctorProfile != null ? doctorProfile.getDegree() : null)
                .experienceYears(doctorProfile != null ? doctorProfile.getExperienceYears() : null)
                .bio(doctorProfile != null ? doctorProfile.getBio() : null)
                .build();
    }
}