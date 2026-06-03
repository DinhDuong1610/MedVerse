package com.medverse.backend.payload.admin;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class AdminOperationsSummaryDto {
    private Overview overview;
    private UserBreakdown userBreakdown;
    private DoctorQualitySummary doctorQuality;
    private AppointmentBreakdown appointmentBreakdown;
    private AppointmentRequestBreakdown appointmentRequestBreakdown;
    private PrescriptionBreakdown prescriptionBreakdown;
    private InventorySummary inventorySummary;
    private List<OperationalWarning> warnings;

    @Data
    @Builder
    public static class Overview {
        private long totalUsers;
        private long totalDoctors;
        private long totalPatients;
        private long totalReceptionists;
        private long totalSpecialties;
        private long totalAppointments;
        private long totalAppointmentRequests;
        private long totalPrescriptions;
        private long totalMedications;
    }

    @Data
    @Builder
    public static class UserBreakdown {
        private long active;
        private long locked;
        private long disabled;
        private long pendingActivation;
    }

    @Data
    @Builder
    public static class DoctorQualitySummary {
        private long totalDoctors;
        private long withSpecialty;
        private long missingSpecialty;
        private long missingLicense;
        private long completeProfile;
    }

    @Data
    @Builder
    public static class AppointmentBreakdown {
        private long total;
        private long today;
        private long upcoming7Days;

        private long scheduled;
        private long confirmed;
        private long completed;
        private long cancelled;
        private long noShow;
    }

    @Data
    @Builder
    public static class AppointmentRequestBreakdown {
        private long total;
        private long pending;
        private long approved;
        private long rejected;
        private long cancelled;
    }

    @Data
    @Builder
    public static class PrescriptionBreakdown {
        private long total;
        private long draft;
        private long finalized;
        private long cancelled;
    }

    @Data
    @Builder
    public static class InventorySummary {
        private long medicationCount;
    }

    @Data
    @Builder
    public static class OperationalWarning {
        private String type;
        private String severity;
        private String title;
        private String message;
        private long count;
        private String href;
    }
}