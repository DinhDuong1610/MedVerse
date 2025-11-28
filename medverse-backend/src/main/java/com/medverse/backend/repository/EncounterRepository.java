package com.medverse.backend.repository;

import com.medverse.backend.entity.emr.Encounter;
import com.medverse.backend.utils.enumeration.EncounterStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface EncounterRepository extends JpaRepository<Encounter, UUID> {
    Optional<Encounter> findByAppointmentId(UUID appointmentId);

    Page<Encounter> findByPatientIdOrderByStartTimeDesc(UUID patientId, Pageable pageable);

    Page<Encounter> findByDoctorIdAndStatus(UUID doctorId, EncounterStatus status, Pageable pageable);
}