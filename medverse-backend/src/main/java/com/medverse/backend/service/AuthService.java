package com.medverse.backend.service;

import com.medverse.backend.entity.RefreshToken;
import com.medverse.backend.entity.Role;
import com.medverse.backend.entity.User;
import com.medverse.backend.entity.UserProfile;
import com.medverse.backend.entity.UserRole;
import com.medverse.backend.entity.VerificationToken;
import com.medverse.backend.payload.auth.AuthResponse;
import com.medverse.backend.payload.auth.LoginRequest;
import com.medverse.backend.payload.auth.RefreshTokenRequest;
import com.medverse.backend.payload.auth.RegisterRequest;
import com.medverse.backend.repository.RefreshTokenRepository;
import com.medverse.backend.repository.RoleRepository;
import com.medverse.backend.repository.UserRepository;
import com.medverse.backend.repository.VerificationTokenRepository;
import com.medverse.backend.utils.enumeration.RoleCode;
import com.medverse.backend.utils.enumeration.UserStatus;
import com.medverse.backend.utils.exception.DuplicateResourceException;
import com.medverse.backend.utils.exception.ResourceNotFoundException;
import com.medverse.backend.utils.exception.TokenRefreshException;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Collections;
import java.util.Date;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final VerificationTokenRepository verificationTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final EmailService emailService;
    private final RefreshTokenRepository refreshTokenRepository;

    @Value("${FRONTEND_BASE_URL}")
    private String frontendBaseUrl;

    @Transactional
    public void register(RegisterRequest request) {
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new DuplicateResourceException("User", "email", request.getEmail());
        }

        User user = new User();
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setStatus(UserStatus.PENDING_ACTIVATION);

        Role patientRole = roleRepository.findByCode(RoleCode.PATIENT.toString())
                .orElseThrow(() -> new ResourceNotFoundException("Role", "code", "PATIENT"));
        UserRole userRole = new UserRole(user, patientRole);

        UserProfile userProfile = new UserProfile();
        userProfile.setFullName(request.getFullName());
        userProfile.setDateOfBirth(request.getDateOfBirth());
        userProfile.setGender(request.getGender());
        userProfile.setPhoneNumber(request.getPhoneNumber());
        userProfile.setAddress(request.getAddress());

        user.setUserProfile(userProfile);
        userProfile.setUser(user);
        user.setUserRoles(Collections.singleton(userRole));

        userRepository.save(user);

        String token = UUID.randomUUID().toString();
        VerificationToken verificationToken = new VerificationToken(token, user);
        verificationTokenRepository.save(verificationToken);

        String verificationUrl = frontendBaseUrl + "/verify-email?token=" + token;

        String emailText = "Thank you for registering with MedVerse. Please click the link below to activate your account:\n"
                + verificationUrl;
        emailService.sendEmail(user.getEmail(), "MedVerse Account Verification", emailText);
    }

    @Transactional
    public String verifyEmail(String token) {
        VerificationToken verificationToken = verificationTokenRepository.findByToken(token)
                .orElseThrow(() -> new ResourceNotFoundException("Verification Token", "token", "invalid"));

        if (verificationToken.getExpiryDate().isBefore(OffsetDateTime.now())) {
            throw new IllegalStateException("Token has expired.");
        }

        User user = verificationToken.getUser();
        user.setStatus(UserStatus.ACTIVE);
        userRepository.save(user);

        verificationTokenRepository.delete(verificationToken);

        return "Account activated successfully. You can now log in.";
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword()));

        var user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + request.getEmail()));

        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new IllegalStateException("Account is not active. Please verify your email first.");
        }

        var accessToken = jwtService.generateAccessToken(user);
        var refreshToken = createAndSaveRefreshToken(user);

        return new AuthResponse(accessToken, refreshToken.getToken());
    }

    @Transactional
    public AuthResponse refreshToken(RefreshTokenRequest request) {
        String requestRefreshToken = request.getRefreshToken();

        return refreshTokenRepository.findByToken(requestRefreshToken)
                .map(this::verifyRefreshTokenExpiration)
                .map(RefreshToken::getUser)
                .map(user -> {
                    String newAccessToken = jwtService.generateAccessToken(user);
                    return new AuthResponse(newAccessToken, requestRefreshToken);
                }).orElseThrow(
                        () -> new TokenRefreshException(requestRefreshToken, "Refresh token not found in database!"));
    }

    private RefreshToken createAndSaveRefreshToken(User user) {
        refreshTokenRepository.deleteByUser(user);

        String tokenString = jwtService.generateRefreshToken(user);
        RefreshToken refreshToken = new RefreshToken();
        refreshToken.setUser(user);
        refreshToken.setToken(tokenString);
        Date expiryDate = jwtService.extractExpiration(tokenString);
        refreshToken.setExpiryDate(OffsetDateTime.ofInstant(expiryDate.toInstant(), ZoneOffset.UTC));

        return refreshTokenRepository.save(refreshToken);
    }

    private RefreshToken verifyRefreshTokenExpiration(RefreshToken token) {
        if (token.getExpiryDate().isBefore(OffsetDateTime.now())) {
            refreshTokenRepository.delete(token);
            throw new TokenRefreshException(token.getToken(),
                    "Refresh token was expired. Please make a new signin request");
        }
        return token;
    }
}