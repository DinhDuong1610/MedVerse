package com.medverse.backend.repository;

import com.medverse.backend.entity.inventory.Medication;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface MedicationRepository extends JpaRepository<Medication, UUID> {

    boolean existsByCode(String code);

    @Query("""
                SELECT m FROM Medication m
                WHERE lower(m.name) LIKE lower(concat('%', :keyword, '%'))
                OR lower(m.code) LIKE lower(concat('%', :keyword, '%'))
                OR lower(m.activeIngredient) LIKE lower(concat('%', :keyword, '%'))
                OR lower(m.atcCode) LIKE lower(concat('%', :keyword, '%'))
            """)
    Page<Medication> search(@Param("keyword") String keyword, Pageable pageable);

    @Query("SELECT m FROM Medication m WHERE " +
            "m.atcCode = :atcCode AND " +
            "(" +
            "  LOWER(m.name) LIKE LOWER(CONCAT('%', :refineText, '%')) OR " +
            "  LOWER(m.activeIngredient) LIKE LOWER(CONCAT('%', :refineText, '%')) OR " +
            "  LOWER(m.packingSpecification) LIKE LOWER(CONCAT('%', :refineText, '%')) OR " +
            "  LOWER(m.unit) LIKE LOWER(CONCAT('%', :refineText, '%'))" +
            ")")
    List<Medication> findByAtcCodeAndRefinement(String atcCode, String refineText);

    List<Medication> findByAtcCode(String atcCode);

    Optional<Medication> findFirstByAtcCode(String atcCode);
}