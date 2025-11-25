package com.medverse.backend.repository;

import com.medverse.backend.entity.AppointmentRequest;
import com.medverse.backend.utils.enumeration.AppointmentRequestStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface AppointmentRequestRepository extends JpaRepository<AppointmentRequest, UUID> {

    Page<AppointmentRequest> findByPatientIdOrderByCreatedAtDesc(UUID patientId, Pageable pageable);

    @Query("""
                SELECT r FROM AppointmentRequest r
                WHERE (:status IS NULL OR r.status = :status)
                AND (:specialtyId IS NULL OR r.specialty.id = :specialtyId)
                ORDER BY r.createdAt ASC
            """)
    Page<AppointmentRequest> findRequestsForReceptionist(
            @Param("status") AppointmentRequestStatus status,
            @Param("specialtyId") UUID specialtyId,
            Pageable pageable);

    long countByStatus(AppointmentRequestStatus status);
}