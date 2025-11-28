package com.medverse.backend.repository;

import com.medverse.backend.entity.emr.Prescription;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface PrescriptionRepository extends JpaRepository<Prescription, UUID> {
    Optional<Prescription> findByEncounterId(UUID encounterId);

    Page<Prescription> findByPatientIdOrderByIssuedAtDesc(UUID patientId, Pageable pageable);
}