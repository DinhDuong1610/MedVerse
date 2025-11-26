package com.medverse.backend.entity.inventory;

import com.medverse.backend.entity.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.Where;

import java.util.UUID;

@Entity
@Table(name = "medications")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@SQLDelete(sql = "UPDATE medications SET deleted_at = NOW() WHERE id = ?")
@Where(clause = "deleted_at IS NULL")
public class Medication extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "active_ingredient")
    private String activeIngredient;

    @Column(name = "code", nullable = false, unique = true, length = 50)
    private String code;

    @Column(name = "atc_code", length = 20)
    private String atcCode;

    @Column(name = "unit", nullable = false, length = 50)
    private String unit;

    @Column(name = "packing_specification", length = 100)
    private String packingSpecification;

    @Column(name = "usage_instruction", columnDefinition = "TEXT")
    private String usageInstruction;

    @Column(name = "contraindication", columnDefinition = "TEXT")
    private String contraindication;
}