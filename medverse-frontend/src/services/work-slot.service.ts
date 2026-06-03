import { apiRequest } from '@/lib/api/http';
import type { WorkSlot, WorkSlotCreatePayload } from '@/types/clinical';

export async function createWorkSlot(payload: WorkSlotCreatePayload) {
    const res = await apiRequest<WorkSlot>('/v1/work-slots', {
        method: 'POST',
        body: payload,
    });

    return res.data;
}

export async function getWorkSlots(params: {
    doctorId: string;
    from: string;
    to: string;
}) {
    const searchParams = new URLSearchParams();

    searchParams.set('doctorId', params.doctorId);
    searchParams.set('from', params.from);
    searchParams.set('to', params.to);

    const res = await apiRequest<WorkSlot[]>(
        `/v1/work-slots?${searchParams.toString()}`,
    );

    return res.data || [];
}

export async function getAvailableWorkSlots(doctorId: string) {
    const res = await apiRequest<WorkSlot[]>(
        `/v1/work-slots/available?doctorId=${doctorId}`,
    );

    return res.data || [];
}

export async function deleteWorkSlot(id: string) {
    const res = await apiRequest<void>(`/v1/work-slots/${id}`, {
        method: 'DELETE',
    });

    return res.data;
}