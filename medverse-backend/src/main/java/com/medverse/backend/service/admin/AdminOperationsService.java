package com.medverse.backend.service.admin;

import com.medverse.backend.entity.DoctorProfile;
import com.medverse.backend.entity.User;
import com.medverse.backend.entity.UserRole;
import com.medverse.backend.payload.admin.AdminOperationsSummaryDto;
import com.medverse.backend.repository.AppointmentRepository;
import com.medverse.backend.repository.AppointmentRequestRepository;
import com.medverse.backend.repository.DoctorProfileRepository;
import com.medverse.backend.repository.MedicationRepository;
import com.medverse.backend.repository.PrescriptionRepository;
import com.medverse.backend.repository.SpecialtyRepository;
import com.medverse.backend.repository.UserRepository;
import com.medverse.backend.utils.enumeration.AppointmentRequestStatus;
import com.medverse.backend.utils.enumeration.AppointmentStatus;
import com.medverse.backend.utils.enumeration.PrescriptionStatus;
import com.medverse.backend.utils.enumeration.RoleCode;
import com.medverse.backend.utils.enumeration.UserStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminOperationsService {

    private final UserRepository userRepository;
    private final DoctorProfileRepository doctorProfileRepository;
    private final SpecialtyRepository specialtyRepository;
    private final AppointmentRepository appointmentRepository;
    private final AppointmentRequestRepository appointmentRequestRepository;
    private final PrescriptionRepository prescriptionRepository;
    private final MedicationRepository medicationRepository;

    @Transactional(readOnly = true)
    public AdminOperationsSummaryDto getSummary() {
        List<User> users = userRepository.findAll();
        List<DoctorProfile> doctors = doctorProfileRepository.findAll();

        OffsetDateTime now = OffsetDateTime.now();
        OffsetDateTime startOfToday = now.toLocalDate().atStartOfDay().atOffset(now.getOffset());
        OffsetDateTime endOfToday = startOfToday.plusDays(1);
        OffsetDateTime next7Days = now.plusDays(7);

        long totalDoctors = users.stream()
                .filter(user -> hasRole(user, RoleCode.DOCTOR))
                .count();

        long totalPatients = users.stream()
                .filter(user -> hasRole(user, RoleCode.PATIENT))
                .count();

        long totalReceptionists = users.stream()
                .filter(user -> hasRole(user, RoleCode.RECEPTIONIST))
                .count();

        long activeUsers = countUsersByStatus(users, UserStatus.ACTIVE);
        long lockedUsers = countUsersByStatus(users, UserStatus.LOCKED);
        long disabledUsers = countUsersByStatus(users, UserStatus.DISABLED);
        long pendingActivationUsers = countUsersByStatus(users, UserStatus.PENDING_ACTIVATION);

        long doctorsWithSpecialty = doctors.stream()
                .filter(doctor -> doctor.getSpecialty() != null)
                .count();

        long doctorsMissingSpecialty = doctors.size() - doctorsWithSpecialty;

        long doctorsMissingLicense = doctors.stream()
                .filter(doctor -> isBlank(doctor.getLicenseNumber()))
                .count();

        long completeDoctorProfiles = doctors.stream()
                .filter(doctor -> doctor.getSpecialty() != null
                        && !isBlank(doctor.getLicenseNumber())
                        && !isBlank(doctor.getDegree())
                        && doctor.getExperienceYears() != null)
                .count();

        long scheduledAppointments = appointmentRepository.countByStatus(AppointmentStatus.SCHEDULED);
        long confirmedAppointments = appointmentRepository.countByStatus(AppointmentStatus.CONFIRMED);
        long completedAppointments = appointmentRepository.countByStatus(AppointmentStatus.COMPLETED);
        long cancelledAppointments = appointmentRepository.countByStatus(AppointmentStatus.CANCELLED);
        long noShowAppointments = appointmentRepository.countByStatus(AppointmentStatus.NO_SHOW);

        long appointmentsToday = appointmentRepository.countByStartTimeBetween(startOfToday, endOfToday);
        long appointmentsNext7Days = appointmentRepository.countByStartTimeBetween(now, next7Days);

        long pendingRequests = appointmentRequestRepository.countByStatus(AppointmentRequestStatus.PENDING);
        long approvedRequests = appointmentRequestRepository.countByStatus(AppointmentRequestStatus.APPROVED);
        long rejectedRequests = appointmentRequestRepository.countByStatus(AppointmentRequestStatus.REJECTED);
        long cancelledRequests = appointmentRequestRepository.countByStatus(AppointmentRequestStatus.CANCELLED);

        long draftPrescriptions = prescriptionRepository.countByStatus(PrescriptionStatus.DRAFT);
        long finalizedPrescriptions = prescriptionRepository.countByStatus(PrescriptionStatus.FINALIZED);
        long cancelledPrescriptions = prescriptionRepository.countByStatus(PrescriptionStatus.CANCELLED);

        long totalAppointments = appointmentRepository.count();
        long totalAppointmentRequests = appointmentRequestRepository.count();
        long totalPrescriptions = prescriptionRepository.count();
        long medicationCount = medicationRepository.count();

        List<AdminOperationsSummaryDto.OperationalWarning> warnings = buildWarnings(
                pendingRequests,
                doctorsMissingSpecialty,
                doctorsMissingLicense,
                noShowAppointments,
                cancelledAppointments,
                draftPrescriptions);

        return AdminOperationsSummaryDto.builder()
                .overview(AdminOperationsSummaryDto.Overview.builder()
                        .totalUsers(users.size())
                        .totalDoctors(totalDoctors)
                        .totalPatients(totalPatients)
                        .totalReceptionists(totalReceptionists)
                        .totalSpecialties(specialtyRepository.count())
                        .totalAppointments(totalAppointments)
                        .totalAppointmentRequests(totalAppointmentRequests)
                        .totalPrescriptions(totalPrescriptions)
                        .totalMedications(medicationCount)
                        .build())
                .userBreakdown(AdminOperationsSummaryDto.UserBreakdown.builder()
                        .active(activeUsers)
                        .locked(lockedUsers)
                        .disabled(disabledUsers)
                        .pendingActivation(pendingActivationUsers)
                        .build())
                .doctorQuality(AdminOperationsSummaryDto.DoctorQualitySummary.builder()
                        .totalDoctors(doctors.size())
                        .withSpecialty(doctorsWithSpecialty)
                        .missingSpecialty(doctorsMissingSpecialty)
                        .missingLicense(doctorsMissingLicense)
                        .completeProfile(completeDoctorProfiles)
                        .build())
                .appointmentBreakdown(AdminOperationsSummaryDto.AppointmentBreakdown.builder()
                        .total(totalAppointments)
                        .today(appointmentsToday)
                        .upcoming7Days(appointmentsNext7Days)
                        .scheduled(scheduledAppointments)
                        .confirmed(confirmedAppointments)
                        .completed(completedAppointments)
                        .cancelled(cancelledAppointments)
                        .noShow(noShowAppointments)
                        .build())
                .appointmentRequestBreakdown(AdminOperationsSummaryDto.AppointmentRequestBreakdown.builder()
                        .total(totalAppointmentRequests)
                        .pending(pendingRequests)
                        .approved(approvedRequests)
                        .rejected(rejectedRequests)
                        .cancelled(cancelledRequests)
                        .build())
                .prescriptionBreakdown(AdminOperationsSummaryDto.PrescriptionBreakdown.builder()
                        .total(totalPrescriptions)
                        .draft(draftPrescriptions)
                        .finalized(finalizedPrescriptions)
                        .cancelled(cancelledPrescriptions)
                        .build())
                .inventorySummary(AdminOperationsSummaryDto.InventorySummary.builder()
                        .medicationCount(medicationCount)
                        .build())
                .warnings(warnings)
                .build();
    }

    private List<AdminOperationsSummaryDto.OperationalWarning> buildWarnings(
            long pendingRequests,
            long doctorsMissingSpecialty,
            long doctorsMissingLicense,
            long noShowAppointments,
            long cancelledAppointments,
            long draftPrescriptions) {

        List<AdminOperationsSummaryDto.OperationalWarning> warnings = new ArrayList<>();

        if (pendingRequests > 0) {
            warnings.add(AdminOperationsSummaryDto.OperationalWarning.builder()
                    .type("APPOINTMENT_REQUEST")
                    .severity("HIGH")
                    .title("Yêu cầu đặt lịch đang chờ duyệt")
                    .message("Có yêu cầu đặt lịch cần lễ tân xử lý.")
                    .count(pendingRequests)
                    .href("/dashboard/receptionist/requests")
                    .build());
        }

        if (doctorsMissingSpecialty > 0) {
            warnings.add(AdminOperationsSummaryDto.OperationalWarning.builder()
                    .type("DOCTOR_PROFILE")
                    .severity("MEDIUM")
                    .title("Bác sĩ chưa được gán chuyên khoa")
                    .message("Bác sĩ thiếu chuyên khoa sẽ khó xuất hiện đúng trong luồng booking.")
                    .count(doctorsMissingSpecialty)
                    .href("/dashboard/admin/doctors")
                    .build());
        }

        if (doctorsMissingLicense > 0) {
            warnings.add(AdminOperationsSummaryDto.OperationalWarning.builder()
                    .type("DOCTOR_PROFILE")
                    .severity("MEDIUM")
                    .title("Bác sĩ thiếu số giấy phép")
                    .message("Hồ sơ bác sĩ thiếu giấy phép cần được admin bổ sung.")
                    .count(doctorsMissingLicense)
                    .href("/dashboard/admin/doctors")
                    .build());
        }

        if (noShowAppointments > 0) {
            warnings.add(AdminOperationsSummaryDto.OperationalWarning.builder()
                    .type("APPOINTMENT")
                    .severity("LOW")
                    .title("Có lịch hẹn no-show")
                    .message("Theo dõi tỷ lệ no-show để cải thiện nhắc lịch và vận hành phòng khám.")
                    .count(noShowAppointments)
                    .href("/dashboard/receptionist/appointments")
                    .build());
        }

        if (cancelledAppointments > 0) {
            warnings.add(AdminOperationsSummaryDto.OperationalWarning.builder()
                    .type("APPOINTMENT")
                    .severity("LOW")
                    .title("Có lịch hẹn đã hủy")
                    .message("Admin có thể theo dõi số lịch hủy để đánh giá vận hành.")
                    .count(cancelledAppointments)
                    .href("/dashboard/receptionist/appointments")
                    .build());
        }

        if (draftPrescriptions > 0) {
            warnings.add(AdminOperationsSummaryDto.OperationalWarning.builder()
                    .type("PRESCRIPTION")
                    .severity("MEDIUM")
                    .title("Có đơn thuốc còn DRAFT")
                    .message("Đơn thuốc DRAFT nên được bác sĩ finalize hoặc cancel để hoàn tất hồ sơ khám.")
                    .count(draftPrescriptions)
                    .href("/dashboard/doctor/prescriptions")
                    .build());
        }

        return warnings;
    }

    private long countUsersByStatus(List<User> users, UserStatus status) {
        return users.stream()
                .filter(user -> user.getStatus() == status)
                .count();
    }

    private boolean hasRole(User user, RoleCode roleCode) {
        return user.getUserRoles()
                .stream()
                .map(UserRole::getRole)
                .anyMatch(role -> roleCode.name().equals(role.getCode()));
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isBlank();
    }
}