package com.medverse.backend.entity.prescription;

import com.medverse.backend.entity.AuditableEntity;
import com.medverse.backend.utils.enumeration.PrescriptionAlertSeverity;
import com.medverse.backend.utils.enumeration.PrescriptionAlertType;
import com.medverse.backend.utils.enumeration.PrescriptionDoctorAction;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.Where;
import org.hibernate.type.SqlTypes;

import java.util.UUID;

@Entity
@Table(name = "prescription_safety_alerts")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
@SQLDelete(sql = "UPDATE prescription_safety_alerts SET deleted_at = NOW() WHERE id = ?")
@Where(clause = "deleted_at IS NULL")
public class PrescriptionSafetyAlert extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "prescription_id", nullable = false)
    private Prescription prescription;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 100)
    private PrescriptionAlertType type;

    @Enumerated(EnumType.STRING)
    @Column(name = "severity", nullable = false, length = 50)
    private PrescriptionAlertSeverity severity;

    @Column(name = "title")
    private String title;

    @Column(name = "message", columnDefinition = "TEXT")
    private String message;

    @Column(name = "recommendation", columnDefinition = "TEXT")
    private String recommendation;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "ai_payload", columnDefinition = "jsonb")
    private String aiPayload;

    @Enumerated(EnumType.STRING)
    @Column(name = "doctor_action", length = 100)
    private PrescriptionDoctorAction doctorAction;

    @Column(name = "doctor_note", columnDefinition = "TEXT")
    private String doctorNote;
}