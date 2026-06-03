import { apiRequest } from '@/lib/api/http';
import type { MedicalRecord } from '@/types/clinical';
import type { PageResponse } from '@/types/pagination';

export async function getMyMedicalRecords() {
    const res = await apiRequest<PageResponse<MedicalRecord>>(
        '/v1/medical-records/me?size=10',
    );

    return res.data;
}

export async function getMedicalRecordByAppointment(appointmentId: string) {
    const res = await apiRequest<MedicalRecord>(
        `/v1/medical-records/by-appointment/${appointmentId}`,
    );

    return res.data;
}