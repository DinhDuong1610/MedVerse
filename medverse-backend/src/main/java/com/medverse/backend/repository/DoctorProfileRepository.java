package com.medverse.backend.repository;

import com.medverse.backend.entity.DoctorProfile;
import com.medverse.backend.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface DoctorProfileRepository extends JpaRepository<DoctorProfile, UUID> {
    Optional<DoctorProfile> findByUser(User user);

    Optional<DoctorProfile> findByUserId(UUID userId);

    @EntityGraph(attributePaths = {
            "user",
            "user.userProfile",
            "specialty"
    })
    @Query("""
            select d
            from DoctorProfile d
            join d.user u
            left join u.userProfile p
            left join d.specialty s
            where (:specialtyId is null or s.id = :specialtyId)
              and (
                    :keyword is null
                    or :keyword = ''
                    or lower(coalesce(p.fullName, '')) like lower(concat('%', :keyword, '%'))
                    or lower(coalesce(u.email, '')) like lower(concat('%', :keyword, '%'))
                    or lower(coalesce(s.name, '')) like lower(concat('%', :keyword, '%'))
                    or lower(coalesce(d.degree, '')) like lower(concat('%', :keyword, '%'))
                  )
            """)
    Page<DoctorProfile> searchDirectory(
            @Param("specialtyId") UUID specialtyId,
            @Param("keyword") String keyword,
            Pageable pageable);
}