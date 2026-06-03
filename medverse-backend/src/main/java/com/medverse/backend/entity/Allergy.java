package com.medverse.backend.entity;

import com.medverse.backend.utils.enumeration.AllergySeverity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.Where;

import java.util.UUID;

@Entity
@Table(name = "allergies")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
@SQLDelete(sql = "UPDATE allergies SET deleted_at = NOW() WHERE id = ?")
@Where(clause = "deleted_at IS NULL")
public class Allergy extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "patient_id", nullable = false)
    private User patient;

    @Column(name = "allergen", nullable = false)
    private String allergen;

    @Column(name = "reaction")
    private String reaction;

    @Enumerated(EnumType.STRING)
    @Column(name = "severity", length = 50)
    private AllergySeverity severity;

    @Column(name = "note")
    private String note;
}