package com.medverse.backend.entity;

import com.medverse.backend.utils.enumeration.DiagnosisSource;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.Where;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "medical_record_diagnoses")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
@SQLDelete(sql = "UPDATE medical_record_diagnoses SET deleted_at = NOW() WHERE id = ?")
@Where(clause = "deleted_at IS NULL")
public class MedicalRecordDiagnosis extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "medical_record_id", nullable = false)
    private MedicalRecord medicalRecord;

    @Column(name = "diagnosis_text", nullable = false, columnDefinition = "TEXT")
    private String diagnosisText;

    @Column(name = "icd_code", length = 50)
    private String icdCode;

    @Column(name = "icd_display")
    private String icdDisplay;

    @Column(name = "coding_system", length = 50)
    private String codingSystem;

    @Enumerated(EnumType.STRING)
    @Column(name = "source", nullable = false, length = 50)
    private DiagnosisSource source;

    @Column(name = "confidence", precision = 5, scale = 4)
    private BigDecimal confidence;

    @Column(name = "accepted_by_doctor", nullable = false)
    private Boolean acceptedByDoctor;
}