package com.medverse.backend.repository;

import com.medverse.backend.entity.emr.EmrAllergy;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface EmrAllergyRepository extends JpaRepository<EmrAllergy, UUID> {
    List<EmrAllergy> findByPatientId(UUID patientId);
}