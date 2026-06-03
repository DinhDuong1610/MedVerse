package com.medverse.backend.service.patient;

import com.medverse.backend.entity.Allergy;
import com.medverse.backend.entity.PatientMedicalProfile;
import com.medverse.backend.entity.User;
import com.medverse.backend.payload.patient.*;
import com.medverse.backend.repository.AllergyRepository;
import com.medverse.backend.repository.PatientMedicalProfileRepository;
import com.medverse.backend.repository.UserRepository;
import com.medverse.backend.service.AuditService;
import com.medverse.backend.utils.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PatientMedicalService {

    private final PatientMedicalProfileRepository profileRepository;
    private final AllergyRepository allergyRepository;
    private final UserRepository userRepository;
    private final AuditService auditService;

    public PatientMedicalProfileDto getMyMedicalProfile(User currentUser) {
        PatientMedicalProfile profile = getOrCreateProfile(currentUser.getId());
        return toProfileDto(profile);
    }

    public PatientMedicalProfileDto getPatientMedicalProfile(UUID patientId, User currentUser) {
        assertCanAccessPatientMedicalProfile(patientId, currentUser, "PATIENT_MEDICAL_PROFILE:READ_ANY");
        PatientMedicalProfile profile = getOrCreateProfile(patientId);
        return toProfileDto(profile);
    }

    @Transactional
    public PatientMedicalProfileDto updateMyMedicalProfile(User currentUser,
            PatientMedicalProfileUpdateRequest request) {
        PatientMedicalProfile profile = getOrCreateProfile(currentUser.getId());
        applyProfileUpdate(profile, request);

        PatientMedicalProfile saved = profileRepository.save(profile);

        auditService.record(
                "UPDATE_OWN_PATIENT_MEDICAL_PROFILE",
                "PATIENT_MEDICAL_PROFILE",
                saved.getId().toString(),
                "Patient updated own medical profile");

        return toProfileDto(saved);
    }

    @Transactional
    public PatientMedicalProfileDto updatePatientMedicalProfile(
            UUID patientId,
            User currentUser,
            PatientMedicalProfileUpdateRequest request) {
        assertCanAccessPatientMedicalProfile(patientId, currentUser, "PATIENT_MEDICAL_PROFILE:WRITE_ANY");

        PatientMedicalProfile profile = getOrCreateProfile(patientId);
        applyProfileUpdate(profile, request);

        PatientMedicalProfile saved = profileRepository.save(profile);

        auditService.record(
                "UPDATE_PATIENT_MEDICAL_PROFILE",
                "PATIENT_MEDICAL_PROFILE",
                saved.getId().toString(),
                "Staff updated medical profile for patient " + patientId);

        return toProfileDto(saved);
    }

    public List<AllergyDto> getMyAllergies(User currentUser) {
        return allergyRepository.findByPatientIdOrderByCreatedAtDesc(currentUser.getId())
                .stream()
                .map(this::toAllergyDto)
                .collect(Collectors.toList());
    }

    public List<AllergyDto> getPatientAllergies(UUID patientId, User currentUser) {
        assertCanAccessPatientAllergies(patientId, currentUser, "ALLERGY:READ_ANY");

        return allergyRepository.findByPatientIdOrderByCreatedAtDesc(patientId)
                .stream()
                .map(this::toAllergyDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public AllergyDto createMyAllergy(User currentUser, AllergyCreateRequest request) {
        User patient = getPatient(currentUser.getId());

        Allergy allergy = Allergy.builder()
                .patient(patient)
                .allergen(request.getAllergen())
                .reaction(request.getReaction())
                .severity(request.getSeverity())
                .note(request.getNote())
                .build();

        Allergy saved = allergyRepository.save(allergy);

        auditService.record(
                "CREATE_OWN_ALLERGY",
                "ALLERGY",
                saved.getId().toString(),
                "Patient created own allergy: " + saved.getAllergen());

        return toAllergyDto(saved);
    }

    @Transactional
    public AllergyDto createPatientAllergy(UUID patientId, User currentUser, AllergyCreateRequest request) {
        assertCanAccessPatientAllergies(patientId, currentUser, "ALLERGY:WRITE_ANY");

        User patient = getPatient(patientId);

        Allergy allergy = Allergy.builder()
                .patient(patient)
                .allergen(request.getAllergen())
                .reaction(request.getReaction())
                .severity(request.getSeverity())
                .note(request.getNote())
                .build();

        Allergy saved = allergyRepository.save(allergy);

        auditService.record(
                "CREATE_PATIENT_ALLERGY",
                "ALLERGY",
                saved.getId().toString(),
                "Staff created allergy for patient " + patientId + ": " + saved.getAllergen());

        return toAllergyDto(saved);
    }

    @Transactional
    public AllergyDto updateMyAllergy(User currentUser, UUID allergyId, AllergyUpdateRequest request) {
        Allergy allergy = getAllergy(allergyId);

        if (!allergy.getPatient().getId().equals(currentUser.getId())) {
            throw new IllegalStateException("You are not authorized to update this allergy.");
        }

        applyAllergyUpdate(allergy, request);
        Allergy saved = allergyRepository.save(allergy);

        auditService.record(
                "UPDATE_OWN_ALLERGY",
                "ALLERGY",
                saved.getId().toString(),
                "Patient updated own allergy");

        return toAllergyDto(saved);
    }

    @Transactional
    public AllergyDto updatePatientAllergy(
            UUID patientId,
            UUID allergyId,
            User currentUser,
            AllergyUpdateRequest request) {
        assertCanAccessPatientAllergies(patientId, currentUser, "ALLERGY:WRITE_ANY");

        Allergy allergy = getAllergy(allergyId);
        if (!allergy.getPatient().getId().equals(patientId)) {
            throw new IllegalArgumentException("Allergy does not belong to the selected patient.");
        }

        applyAllergyUpdate(allergy, request);
        Allergy saved = allergyRepository.save(allergy);

        auditService.record(
                "UPDATE_PATIENT_ALLERGY",
                "ALLERGY",
                saved.getId().toString(),
                "Staff updated allergy for patient " + patientId);

        return toAllergyDto(saved);
    }

    @Transactional
    public void deleteMyAllergy(User currentUser, UUID allergyId) {
        Allergy allergy = getAllergy(allergyId);

        if (!allergy.getPatient().getId().equals(currentUser.getId())) {
            throw new IllegalStateException("You are not authorized to delete this allergy.");
        }

        allergyRepository.delete(allergy);

        auditService.record(
                "DELETE_OWN_ALLERGY",
                "ALLERGY",
                allergyId.toString(),
                "Patient deleted own allergy");
    }

    @Transactional
    public void deletePatientAllergy(UUID patientId, UUID allergyId, User currentUser) {
        assertCanAccessPatientAllergies(patientId, currentUser, "ALLERGY:WRITE_ANY");

        Allergy allergy = getAllergy(allergyId);
        if (!allergy.getPatient().getId().equals(patientId)) {
            throw new IllegalArgumentException("Allergy does not belong to the selected patient.");
        }

        allergyRepository.delete(allergy);

        auditService.record(
                "DELETE_PATIENT_ALLERGY",
                "ALLERGY",
                allergyId.toString(),
                "Staff deleted allergy for patient " + patientId);
    }

    private PatientMedicalProfile getOrCreateProfile(UUID patientId) {
        return profileRepository.findByPatientId(patientId)
                .orElseGet(() -> {
                    User patient = getPatient(patientId);

                    PatientMedicalProfile profile = PatientMedicalProfile.builder()
                            .patient(patient)
                            .build();

                    return profileRepository.save(profile);
                });
    }

    private User getPatient(UUID patientId) {
        return userRepository.findById(patientId)
                .orElseThrow(() -> new ResourceNotFoundException("Patient", "id", patientId));
    }

    private Allergy getAllergy(UUID allergyId) {
        return allergyRepository.findById(allergyId)
                .orElseThrow(() -> new ResourceNotFoundException("Allergy", "id", allergyId));
    }

    private void applyProfileUpdate(PatientMedicalProfile profile, PatientMedicalProfileUpdateRequest request) {
        profile.setBloodType(normalizeBloodType(request.getBloodType()));
        profile.setHeightCm(request.getHeightCm());
        profile.setWeightKg(request.getWeightKg());
        profile.setChronicDiseases(request.getChronicDiseases());
        profile.setMedicalHistory(request.getMedicalHistory());
        profile.setCurrentMedicationsNote(request.getCurrentMedicationsNote());
    }

    private void applyAllergyUpdate(Allergy allergy, AllergyUpdateRequest request) {
        allergy.setAllergen(request.getAllergen());
        allergy.setReaction(request.getReaction());
        allergy.setSeverity(request.getSeverity());
        allergy.setNote(request.getNote());
    }

    private String normalizeBloodType(String bloodType) {
        if (bloodType == null || bloodType.isBlank()) {
            return null;
        }

        return bloodType.trim().toUpperCase();
    }

    private void assertCanAccessPatientMedicalProfile(UUID patientId, User currentUser, String requiredAnyPermission) {
        if (currentUser.getId().equals(patientId)) {
            return;
        }

        if (!hasAuthority(currentUser, requiredAnyPermission)) {
            throw new IllegalStateException("You are not authorized to access this patient medical profile.");
        }
    }

    private void assertCanAccessPatientAllergies(UUID patientId, User currentUser, String requiredAnyPermission) {
        if (currentUser.getId().equals(patientId)) {
            return;
        }

        if (!hasAuthority(currentUser, requiredAnyPermission)) {
            throw new IllegalStateException("You are not authorized to access this patient allergies.");
        }
    }

    private boolean hasAuthority(User user, String authority) {
        if (user == null || user.getAuthorities() == null) {
            return false;
        }

        return user.getAuthorities()
                .stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch(authority::equals);
    }

    private PatientMedicalProfileDto toProfileDto(PatientMedicalProfile profile) {
        User patient = profile.getPatient();

        return PatientMedicalProfileDto.builder()
                .id(profile.getId())
                .patientId(patient.getId())
                .patientEmail(patient.getEmail())
                .fullName(patient.getUserProfile() != null ? patient.getUserProfile().getFullName() : null)
                .bloodType(profile.getBloodType())
                .heightCm(profile.getHeightCm())
                .weightKg(profile.getWeightKg())
                .chronicDiseases(profile.getChronicDiseases())
                .medicalHistory(profile.getMedicalHistory())
                .currentMedicationsNote(profile.getCurrentMedicationsNote())
                .build();
    }

    private AllergyDto toAllergyDto(Allergy allergy) {
        return AllergyDto.builder()
                .id(allergy.getId())
                .patientId(allergy.getPatient().getId())
                .allergen(allergy.getAllergen())
                .reaction(allergy.getReaction())
                .severity(allergy.getSeverity())
                .note(allergy.getNote())
                .build();
    }
}