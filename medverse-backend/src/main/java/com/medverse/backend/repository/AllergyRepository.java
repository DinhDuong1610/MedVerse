package com.medverse.backend.repository;

import com.medverse.backend.entity.Allergy;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface AllergyRepository extends JpaRepository<Allergy, UUID> {
    List<Allergy> findByPatientIdOrderByCreatedAtDesc(UUID patientId);
    
}