package com.medverse.backend.repository;

import com.medverse.backend.entity.prescription.Prescription;
import com.medverse.backend.utils.enumeration.PrescriptionStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface PrescriptionRepository extends JpaRepository<Prescription, UUID> {

    Optional<Prescription> findByMedicalRecordId(UUID medicalRecordId);

    boolean existsByMedicalRecordId(UUID medicalRecordId);

    Page<Prescription> findByPatientIdOrderByCreatedAtDesc(UUID patientId, Pageable pageable);

    Page<Prescription> findByDoctorIdOrderByCreatedAtDesc(UUID doctorId, Pageable pageable);

    Page<Prescription> findByStatusOrderByCreatedAtDesc(PrescriptionStatus status, Pageable pageable);

    long countByStatus(PrescriptionStatus status);
}