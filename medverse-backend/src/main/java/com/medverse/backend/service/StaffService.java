package com.medverse.backend.service;

import com.medverse.backend.entity.Specialty;
import com.medverse.backend.entity.User;
import com.medverse.backend.entity.UserRole;
import com.medverse.backend.payload.staff.SpecialtyDto;
import com.medverse.backend.payload.staff.StaffListDto;
import com.medverse.backend.repository.SpecialtyRepository;
import com.medverse.backend.repository.UserRepository;
import com.medverse.backend.utils.enumeration.RoleCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class StaffService {

    private final UserRepository userRepository;
    private final SpecialtyRepository specialtyRepository;

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
}
