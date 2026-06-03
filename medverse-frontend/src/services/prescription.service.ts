import { apiRequest } from '@/lib/api/http';
import type { Prescription, PrescriptionItem } from '@/types/clinical';
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

export type PrescriptionCreatePayload = {
    medicalRecordId: string;
    note?: string;
};

export type PrescriptionItemCreatePayload = {
    medicationId: string;
    dosage: string;
    frequency: string;
    duration: string;
    quantity: number;
    instruction?: string;
};

export async function createPrescription(payload: PrescriptionCreatePayload) {
    const res = await apiRequest<Prescription>('/v1/prescriptions', {
        method: 'POST',
        body: payload,
    });

    return res.data;
}

export async function addPrescriptionItem(
    prescriptionId: string,
    payload: PrescriptionItemCreatePayload,
) {
    const res = await apiRequest<PrescriptionItem>(
        `/v1/prescriptions/${prescriptionId}/items`,
        {
            method: 'POST',
            body: payload,
        },
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

export async function finalizePrescription(prescriptionId: string) {
    const res = await apiRequest<Prescription>(
        `/v1/prescriptions/${prescriptionId}/finalize`,
        {
            method: 'PATCH',
        },
    );

    return res.data;
}