package com.medverse.backend.repository;

import com.medverse.backend.entity.Role;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface RoleRepository extends JpaRepository<Role, UUID> {
    Optional<Role> findByCode(String code);

    List<Role> findAllByOrderByCodeAsc();

    @Query("SELECT COUNT(ur) > 0 FROM UserRole ur WHERE ur.role.id = :roleId")
    boolean isRoleAssignedToUsers(UUID roleId);
}