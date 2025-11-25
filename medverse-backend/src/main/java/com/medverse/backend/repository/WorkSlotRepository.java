package com.medverse.backend.repository;

import com.medverse.backend.entity.WorkSlot;
import com.medverse.backend.utils.enumeration.WorkSlotStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface WorkSlotRepository extends JpaRepository<WorkSlot, UUID> {

        List<WorkSlot> findByDoctorIdAndStartTimeBetweenOrderByStartTimeAsc(
                        UUID doctorId, OffsetDateTime from, OffsetDateTime to);

        @Query("""
                            SELECT COUNT(w) > 0 FROM WorkSlot w
                            WHERE w.doctor.id = :doctorId
                            AND w.startTime < :endTime
                            AND w.endTime > :startTime
                            AND w.status != 'BLOCKED'
                        """)
        boolean existsOverlappingSlot(
                        @Param("doctorId") UUID doctorId,
                        @Param("startTime") OffsetDateTime startTime,
                        @Param("endTime") OffsetDateTime endTime);

        List<WorkSlot> findByDoctorIdAndStatusAndStartTimeAfterOrderByStartTimeAsc(
                        UUID doctorId, WorkSlotStatus status, OffsetDateTime now);
}