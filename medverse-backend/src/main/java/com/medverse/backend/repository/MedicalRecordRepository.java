package com.medverse.backend.repository;

import com.medverse.backend.entity.MedicalRecord;
import com.medverse.backend.utils.enumeration.MedicalRecordStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface MedicalRecordRepository extends JpaRepository<MedicalRecord, UUID> {

    Optional<MedicalRecord> findByAppointmentId(UUID appointmentId);

    boolean existsByAppointmentId(UUID appointmentId);

    Page<MedicalRecord> findByPatientIdOrderByCreatedAtDesc(UUID patientId, Pageable pageable);

    Page<MedicalRecord> findByDoctorIdOrderByCreatedAtDesc(UUID doctorId, Pageable pageable);

    Page<MedicalRecord> findByStatusOrderByCreatedAtDesc(MedicalRecordStatus status, Pageable pageable);
}