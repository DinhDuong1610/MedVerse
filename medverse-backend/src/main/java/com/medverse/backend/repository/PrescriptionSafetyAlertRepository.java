package com.medverse.backend.repository;

import com.medverse.backend.entity.prescription.PrescriptionSafetyAlert;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PrescriptionSafetyAlertRepository extends JpaRepository<PrescriptionSafetyAlert, UUID> {

    List<PrescriptionSafetyAlert> findByPrescriptionIdOrderByCreatedAtDesc(UUID prescriptionId);
}