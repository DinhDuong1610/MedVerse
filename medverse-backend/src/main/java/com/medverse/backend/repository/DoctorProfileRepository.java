package com.medverse.backend.repository;

import com.medverse.backend.entity.DoctorProfile;
import com.medverse.backend.entity.User;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface DoctorProfileRepository extends JpaRepository<DoctorProfile, UUID> {
    Optional<DoctorProfile> findByUser(User user);

    Optional<DoctorProfile> findByUserId(UUID userId);
}
