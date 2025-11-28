package com.medverse.backend.entity.emr;

import com.medverse.backend.entity.User;
import com.medverse.backend.utils.enumeration.ObservationType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.annotations.Where;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "emr_observations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@SQLDelete(sql = "UPDATE emr_observations SET deleted_at = NOW() WHERE id = ?")
@Where(clause = "deleted_at IS NULL")
public class EmrObservation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "patient_id", nullable = false)
    private User patient;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "encounter_id", nullable = false)
    private Encounter encounter;

    @Enumerated(EnumType.STRING)
    @Column(name = "observation_type", nullable = false)
    private ObservationType observationType;

    @Column(name = "standard_code", length = 50)
    private String standardCode;

    @Column(name = "description")
    private String description;

    @Column(name = "value_quantity", precision = 10, scale = 2)
    private BigDecimal valueQuantity;

    @Column(name = "value_unit", length = 50)
    private String valueUnit;

    @Column(name = "value_text", columnDefinition = "TEXT")
    private String valueText;

    @Column(name = "issued_at", nullable = false)
    @Builder.Default
    private OffsetDateTime issuedAt = OffsetDateTime.now();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @Column(name = "deleted_at")
    private OffsetDateTime deletedAt;
}