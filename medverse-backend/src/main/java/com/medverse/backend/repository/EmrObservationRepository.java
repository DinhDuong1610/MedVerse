package com.medverse.backend.repository;

import com.medverse.backend.entity.emr.EmrObservation;
import com.medverse.backend.utils.enumeration.ObservationType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface EmrObservationRepository extends JpaRepository<EmrObservation, UUID> {
    List<EmrObservation> findByEncounterIdAndObservationType(UUID encounterId, ObservationType type);

    List<EmrObservation> findByEncounterId(UUID encounterId);
}