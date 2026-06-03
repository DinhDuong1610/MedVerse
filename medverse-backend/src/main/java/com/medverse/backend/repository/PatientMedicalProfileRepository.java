package com.medverse.backend.repository;

import com.medverse.backend.entity.PatientMedicalProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface PatientMedicalProfileRepository extends JpaRepository<PatientMedicalProfile, UUID> {
    Optional<PatientMedicalProfile> findByPatientId(UUID patientId);
}