package com.medverse.backend.repository;

import com.medverse.backend.entity.MedicalRecordDiagnosis;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface MedicalRecordDiagnosisRepository extends JpaRepository<MedicalRecordDiagnosis, UUID> {

    List<MedicalRecordDiagnosis> findByMedicalRecordIdOrderByCreatedAtDesc(UUID medicalRecordId);
}