import { apiRequest } from '@/lib/api/http';
import type { Appointment } from '@/types/clinical';
import type { PageResponse } from '@/types/pagination';

export async function getAppointments() {
    const res = await apiRequest<PageResponse<Appointment>>(
        '/v1/appointments?size=10',
    );

    return res.data;
}