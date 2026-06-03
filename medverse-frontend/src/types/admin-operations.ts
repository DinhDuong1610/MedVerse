export type AdminOperationsOverview = {
    totalUsers: number;
    totalDoctors: number;
    totalPatients: number;
    totalReceptionists: number;
    totalSpecialties: number;
    totalAppointments: number;
    totalAppointmentRequests: number;
    totalPrescriptions: number;
    totalMedications: number;
};

export type AdminOperationsUserBreakdown = {
    active: number;
    locked: number;
    disabled: number;
    pendingActivation: number;
};

export type AdminOperationsDoctorQuality = {
    totalDoctors: number;
    withSpecialty: number;
    missingSpecialty: number;
    missingLicense: number;
    completeProfile: number;
};

export type AdminOperationsAppointmentBreakdown = {
    total: number;
    today: number;
    upcoming7Days: number;

    scheduled: number;
    confirmed: number;
    completed: number;
    cancelled: number;
    noShow: number;
};

export type AdminOperationsAppointmentRequestBreakdown = {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    cancelled: number;
};

export type AdminOperationsPrescriptionBreakdown = {
    total: number;
    draft: number;
    finalized: number;
    cancelled: number;
};

export type AdminOperationsInventorySummary = {
    medicationCount: number;
};

export type AdminOperationalWarning = {
    type: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | string;
    title: string;
    message: string;
    count: number;
    href?: string;
};

export type AdminOperationsSummary = {
    overview: AdminOperationsOverview;
    userBreakdown: AdminOperationsUserBreakdown;
    doctorQuality: AdminOperationsDoctorQuality;
    appointmentBreakdown: AdminOperationsAppointmentBreakdown;
    appointmentRequestBreakdown: AdminOperationsAppointmentRequestBreakdown;
    prescriptionBreakdown: AdminOperationsPrescriptionBreakdown;
    inventorySummary: AdminOperationsInventorySummary;
    warnings: AdminOperationalWarning[];
};