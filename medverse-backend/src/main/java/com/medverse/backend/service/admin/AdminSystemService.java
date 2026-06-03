package com.medverse.backend.service.admin;

import com.medverse.backend.payload.admin.AdminSystemSummaryDto;
import com.medverse.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AdminSystemService {

    private final UserRepository userRepository;
    private final AuditLogRepository auditLogRepository;
    private final NotificationRepository notificationRepository;
    private final MedicationRepository medicationRepository;
    private final AppointmentRepository appointmentRepository;

    public AdminSystemSummaryDto getSummary() {
        return AdminSystemSummaryDto.builder()
                .userCount(userRepository.count())
                .auditLogCount(auditLogRepository.count())
                .notificationCount(notificationRepository.count())
                .medicationCount(medicationRepository.count())
                .appointmentCount(appointmentRepository.count())
                .backendStatus("UP")
                .databaseStatus("UP")
                .build();
    }
}