import { apiRequest } from '@/lib/api/http';
import type { WorkSlot } from '@/types/clinical';

export async function getAvailableWorkSlots(doctorId: string) {
    const res = await apiRequest<WorkSlot[]>(
        `/v1/work-slots/available?doctorId=${doctorId}`,
    );

    return res.data || [];
}