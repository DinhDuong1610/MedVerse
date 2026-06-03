package com.medverse.backend.service.admin;

import com.medverse.backend.entity.Specialty;
import com.medverse.backend.payload.admin.AdminSpecialtyDto;
import com.medverse.backend.payload.admin.AdminSpecialtyRequest;
import com.medverse.backend.repository.SpecialtyRepository;
import com.medverse.backend.service.AuditService;
import com.medverse.backend.utils.exception.DuplicateResourceException;
import com.medverse.backend.utils.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AdminSpecialtyService {

    private final SpecialtyRepository specialtyRepository;
    private final AuditService auditService;

    public Page<AdminSpecialtyDto> getSpecialties(Pageable pageable) {
        return specialtyRepository.findAll(pageable)
                .map(this::toDto);
    }

    public AdminSpecialtyDto getSpecialtyById(UUID id) {
        Specialty specialty = specialtyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Specialty", "id", id));

        return toDto(specialty);
    }

    @Transactional
    public AdminSpecialtyDto createSpecialty(AdminSpecialtyRequest request) {
        String code = normalizeCode(request.getCode());

        if (specialtyRepository.existsByCode(code)) {
            throw new DuplicateResourceException("Specialty", "code", code);
        }

        Specialty specialty = new Specialty();
        specialty.setCode(code);
        specialty.setName(request.getName().trim());
        specialty.setDescription(normalizeText(request.getDescription()));

        Specialty saved = specialtyRepository.save(specialty);

        auditService.record(
                "ADMIN_CREATE_SPECIALTY",
                "SPECIALTY",
                saved.getId().toString(),
                "Created specialty " + saved.getCode());

        return toDto(saved);
    }

    @Transactional
    public AdminSpecialtyDto updateSpecialty(UUID id, AdminSpecialtyRequest request) {
        Specialty specialty = specialtyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Specialty", "id", id));

        String nextCode = normalizeCode(request.getCode());

        specialtyRepository.findByCode(nextCode)
                .filter(existing -> !existing.getId().equals(id))
                .ifPresent(existing -> {
                    throw new DuplicateResourceException("Specialty", "code", nextCode);
                });

        String oldCode = specialty.getCode();

        specialty.setCode(nextCode);
        specialty.setName(request.getName().trim());
        specialty.setDescription(normalizeText(request.getDescription()));

        Specialty saved = specialtyRepository.save(specialty);

        auditService.record(
                "ADMIN_UPDATE_SPECIALTY",
                "SPECIALTY",
                saved.getId().toString(),
                "Updated specialty from " + oldCode + " to " + saved.getCode());

        return toDto(saved);
    }

    @Transactional
    public void deleteSpecialty(UUID id) {
        Specialty specialty = specialtyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Specialty", "id", id));

        specialtyRepository.delete(specialty);

        auditService.record(
                "ADMIN_DELETE_SPECIALTY",
                "SPECIALTY",
                id.toString(),
                "Deleted specialty " + specialty.getCode());
    }

    private AdminSpecialtyDto toDto(Specialty specialty) {
        return AdminSpecialtyDto.builder()
                .id(specialty.getId())
                .code(specialty.getCode())
                .name(specialty.getName())
                .description(specialty.getDescription())
                .createdAt(specialty.getCreatedAt())
                .updatedAt(specialty.getUpdatedAt())
                .build();
    }

    private String normalizeCode(String value) {
        return value == null
                ? null
                : value.trim().toUpperCase().replace(" ", "_");
    }

    private String normalizeText(String value) {
        if (value == null || value.trim().isBlank()) {
            return null;
        }

        return value.trim();
    }
}