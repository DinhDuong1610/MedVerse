package com.medverse.backend.repository;

import com.medverse.backend.entity.prescription.PrescriptionItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PrescriptionItemRepository extends JpaRepository<PrescriptionItem, UUID> {

    List<PrescriptionItem> findByPrescriptionIdOrderByCreatedAtAsc(UUID prescriptionId);
}