package com.medverse.backend.repository;

import com.medverse.backend.entity.emr.EmrCondition;
import com.medverse.backend.utils.enumeration.ConditionType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface EmrConditionRepository extends JpaRepository<EmrCondition, UUID> {
    List<EmrCondition> findByPatientIdAndConditionType(UUID patientId, ConditionType type);

    List<EmrCondition> findByEncounterId(UUID encounterId);
}