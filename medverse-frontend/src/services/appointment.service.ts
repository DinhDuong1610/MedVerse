import { apiRequest } from '@/lib/api/http';
import type { Appointment, AppointmentStatus } from '@/types/clinical';
import type { PageResponse } from '@/types/pagination';

export type AppointmentFilter = {
    doctorId?: string;
    patientId?: string;
    status?: AppointmentStatus | string;
    from?: string;
    to?: string;
    size?: number;
};

export async function getMyAppointments(size = 50) {
    const res = await apiRequest<PageResponse<Appointment>>(
        `/v1/appointments/me?size=${size}`,
    );

    return res.data;
}

export async function getAppointments(filter?: AppointmentFilter) {
    const params = new URLSearchParams();

    params.set('size', String(filter?.size || 50));

    if (filter?.doctorId) params.set('doctorId', filter.doctorId);
    if (filter?.patientId) params.set('patientId', filter.patientId);
    if (filter?.status && filter.status !== 'ALL') {
        params.set('status', filter.status);
    }
    if (filter?.from) params.set('from', filter.from);
    if (filter?.to) params.set('to', filter.to);

    const res = await apiRequest<PageResponse<Appointment>>(
        `/v1/appointments?${params.toString()}`,
    );

    return res.data;
}

export async function getAppointmentById(id: string) {
    const res = await apiRequest<Appointment>(`/v1/appointments/${id}`);

    return res.data;
}

export async function cancelAppointment(id: string, reason: string) {
    const res = await apiRequest<void>(`/v1/appointments/${id}/cancel`, {
        method: 'PATCH',
        body: reason,
    });

    return res.data;
}

export async function markAppointmentNoShow(id: string) {
    const res = await apiRequest<void>(`/v1/appointments/${id}/no-show`, {
        method: 'POST',
    });

    return res.data;
}

export async function rescheduleAppointment(
    appointmentId: string,
    newWorkSlotId: string,
) {
    const res = await apiRequest<Appointment>(
        `/v1/appointments/${appointmentId}/reschedule?newWorkSlotId=${newWorkSlotId}`,
        {
            method: 'PUT',
        },
    );

    return res.data;
}