package com.medverse.backend.config;

import com.medverse.backend.entity.Role;
import com.medverse.backend.entity.User;
import com.medverse.backend.entity.UserProfile;
import com.medverse.backend.entity.UserRole;
import com.medverse.backend.repository.RoleRepository;
import com.medverse.backend.repository.UserRepository;
import com.medverse.backend.utils.enumeration.RoleCode;
import com.medverse.backend.utils.enumeration.UserStatus;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements ApplicationRunner {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${DEFAULT_ADMIN_EMAIL}")
    private String adminEmail;

    @Value("${DEFAULT_ADMIN_PASSWORD}")
    private String adminPassword;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (userRepository.findByEmail(adminEmail).isPresent()) {
            log.info("Admin user with email {} already exists. Skipping creation.", adminEmail);
            return;
        }

        log.info("Default admin user not found. Creating a new one...");

        Role adminRole = roleRepository.findByCode(RoleCode.ADMIN)
                .orElseThrow(
                        () -> new IllegalStateException("ADMIN role not found in database. Please run migrations."));

        User adminUser = new User();
        adminUser.setEmail(adminEmail);
        adminUser.setPassword(passwordEncoder.encode(adminPassword));
        adminUser.setStatus(UserStatus.ACTIVE);

        UserProfile adminProfile = new UserProfile();
        adminProfile.setFullName("Admin");

        adminUser.setUserProfile(adminProfile);
        adminProfile.setUser(adminUser);

        UserRole userRole = new UserRole(adminUser, adminRole);
        adminUser.setUserRoles(Collections.singleton(userRole));

        userRepository.save(adminUser);
        log.info("Default admin user created successfully with email: {}", adminEmail);
    }
}
