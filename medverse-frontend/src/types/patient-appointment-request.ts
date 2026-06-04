export type PatientAppointmentRequestStatus =
    | 'PENDING'
    | 'APPROVED'
    | 'REJECTED'
    | 'CANCELLED'
    | string;

export type PatientAppointmentRequest = {
    id: string;

    patientId?: string;
    patientName?: string;
    patientEmail?: string;
    patientPhone?: string;

    specialtyId?: string;
    specialtyName?: string;

    doctorId?: string;
    doctorName?: string;
    doctorEmail?: string;

    desiredDate?: string;
    desiredTime?: string;

    reason?: string;
    symptoms?: string;
    note?: string;

    status: PatientAppointmentRequestStatus;

    appointmentId?: string;

    rejectionReason?: string;
    cancelReason?: string;

    createdAt?: string;
    updatedAt?: string;
    approvedAt?: string;
    rejectedAt?: string;
    cancelledAt?: string;
};

export type PatientAppointmentRequestFilter = {
    keyword?: string;
    status?: 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
    page?: number;
    size?: number;
};

export type PatientAppointmentRequestPage = {
    content: PatientAppointmentRequest[];
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
};

export type CancelAppointmentRequestPayload = {
    reason?: string;
    cancelReason?: string;
};