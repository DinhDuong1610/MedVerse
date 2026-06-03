package com.medverse.backend.repository;

import com.medverse.backend.entity.Appointment;
import com.medverse.backend.utils.enumeration.AppointmentStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface AppointmentRepository extends JpaRepository<Appointment, UUID> {

    Page<Appointment> findByPatientIdOrderByStartTimeDesc(UUID patientId, Pageable pageable);

    List<Appointment> findByDoctorIdAndStartTimeBetweenOrderByStartTimeAsc(
            UUID doctorId, OffsetDateTime from, OffsetDateTime to);

    @Query("""
                SELECT COUNT(a) > 0 FROM Appointment a
                WHERE a.doctor.id = :doctorId
                AND a.startTime < :endTime
                AND a.endTime > :startTime
                AND a.status NOT IN ('CANCELLED', 'NO_SHOW')
            """)
    boolean existsOverlappingAppointment(
            @Param("doctorId") UUID doctorId,
            @Param("startTime") OffsetDateTime startTime,
            @Param("endTime") OffsetDateTime endTime);

    List<Appointment> findByStatusAndStartTimeBetween(
            AppointmentStatus status, OffsetDateTime from, OffsetDateTime to);

    long countByStatus(AppointmentStatus status);

    long countByStartTimeBetween(OffsetDateTime from, OffsetDateTime to);

    long countByStartTimeAfter(OffsetDateTime from);

    long countByStatusAndStartTimeBetween(
            AppointmentStatus status,
            OffsetDateTime from,
            OffsetDateTime to);

    @Query("""
                SELECT a FROM Appointment a
                WHERE (:doctorId IS NULL OR a.doctor.id = :doctorId)
                AND (:patientId IS NULL OR a.patient.id = :patientId)
                AND (:status IS NULL OR a.status = :status)
                AND (cast(:fromTime as timestamp) IS NULL OR a.startTime >= :fromTime)
                AND (cast(:toTime as timestamp) IS NULL OR a.endTime <= :toTime)
                ORDER BY a.startTime ASC
            """)
    Page<Appointment> searchAppointments(
            @Param("doctorId") UUID doctorId,
            @Param("patientId") UUID patientId,
            @Param("status") AppointmentStatus status,
            @Param("fromTime") OffsetDateTime fromTime,
            @Param("toTime") OffsetDateTime toTime,
            Pageable pageable);
}