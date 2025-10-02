package com.medverse.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "verification_tokens")
@Data
@NoArgsConstructor
public class VerificationToken {

    private static final int EXPIRATION_HOURS = 24;

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true)
    private String token;

    @OneToOne(targetEntity = User.class, fetch = FetchType.EAGER)
    @JoinColumn(nullable = false, name = "user_id")
    private User user;

    @Column(nullable = false, name = "expiry_date")
    private OffsetDateTime expiryDate;

    @Column(nullable = false, name = "created_at", updatable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();

    public VerificationToken(String token, User user) {
        this.token = token;
        this.user = user;
        this.expiryDate = OffsetDateTime.now().plusHours(EXPIRATION_HOURS);
    }
}