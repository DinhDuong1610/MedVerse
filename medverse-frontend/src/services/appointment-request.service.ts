import { apiRequest } from '@/lib/api/http';
import type {
    Appointment,
    AppointmentRequest,
    AppointmentRequestStatus,
} from '@/types/clinical';
import type { PageResponse } from '@/types/pagination';

export async function getAppointmentRequests(
    status?: AppointmentRequestStatus | 'ALL',
) {
    const params = new URLSearchParams();

    params.set('size', '20');

    if (status && status !== 'ALL') {
        params.set('status', status);
    }

    const res = await apiRequest<PageResponse<AppointmentRequest>>(
        `/v1/appointment-requests?${params.toString()}`,
    );

    return res.data;
}

export async function approveAppointmentRequest(
    requestId: string,
    workSlotId: string,
) {
    const res = await apiRequest<Appointment>(
        `/v1/appointment-requests/${requestId}/approve?workSlotId=${workSlotId}`,
        {
            method: 'PATCH',
        },
    );

    return res.data;
}

export async function rejectAppointmentRequest(
    requestId: string,
    reason: string,
) {
    const res = await apiRequest<AppointmentRequest>(
        `/v1/appointment-requests/${requestId}/reject`,
        {
            method: 'PATCH',
            body: reason,
        },
    );

    return res.data;
}