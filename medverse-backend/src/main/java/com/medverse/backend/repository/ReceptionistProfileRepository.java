package com.medverse.backend.repository;

import com.medverse.backend.entity.ReceptionistProfile;
import com.medverse.backend.entity.User;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface ReceptionistProfileRepository extends JpaRepository<ReceptionistProfile, UUID> {
    Optional<ReceptionistProfile> findByUser(User user);

    Optional<ReceptionistProfile> findByUserId(UUID userId);
}