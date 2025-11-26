package com.medverse.backend.repository;

import com.medverse.backend.entity.inventory.MedicationBatch;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface MedicationBatchRepository extends JpaRepository<MedicationBatch, UUID> {

    @Query("SELECT COALESCE(SUM(b.currentQuantity), 0) FROM MedicationBatch b WHERE b.medication.id = :medicationId AND b.expiryDate > :now")
    Integer sumAvailableQuantity(@Param("medicationId") UUID medicationId, @Param("now") LocalDate now);

    @Query("SELECT b FROM MedicationBatch b WHERE b.medication.id = :medicationId AND b.currentQuantity > 0 AND b.expiryDate > :now ORDER BY b.expiryDate ASC")
    List<MedicationBatch> findAvailableBatchesForSale(@Param("medicationId") UUID medicationId,
            @Param("now") LocalDate now);

    List<MedicationBatch> findByExpiryDateBetweenAndCurrentQuantityGreaterThan(LocalDate from, LocalDate to,
            Integer minQuantity);
}