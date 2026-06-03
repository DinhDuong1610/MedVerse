import { apiRequest } from '@/lib/api/http';
import type { Prescription } from '@/types/clinical';
import type { PageResponse } from '@/types/pagination';

export async function getMyPrescriptions() {
    const res = await apiRequest<PageResponse<Prescription>>(
        '/v1/prescriptions/me?size=10',
    );

    return res.data;
}

export async function getPrescriptionByMedicalRecord(medicalRecordId: string) {
    const res = await apiRequest<Prescription>(
        `/v1/prescriptions/by-medical-record/${medicalRecordId}`,
    );

    return res.data;
}

export async function runPrescriptionSafetyCheck(prescriptionId: string) {
    const res = await apiRequest<Prescription>(
        `/v1/prescriptions/${prescriptionId}/safety-check`,
        {
            method: 'PATCH',
        },
    );

    return res.data;
}