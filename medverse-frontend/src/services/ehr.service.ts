import { apiRequest } from '@/lib/api/http';
import type { MedicalRecord, MedicalRecordDiagnosis } from '@/types/clinical';
import type { PageResponse } from '@/types/pagination';

export async function getMyMedicalRecords() {
    const res = await apiRequest<PageResponse<MedicalRecord>>(
        '/v1/medical-records/me?size=10',
    );

    return res.data;
}

export async function getMedicalRecordById(id: string) {
    const res = await apiRequest<MedicalRecord>(`/v1/medical-records/${id}`);

    return res.data;
}

export async function getMedicalRecordByAppointment(appointmentId: string) {
    const res = await apiRequest<MedicalRecord>(
        `/v1/medical-records/by-appointment/${appointmentId}`,
    );

    return res.data;
}

export async function getPatientMedicalRecords(patientId: string, size = 20) {
    const res = await apiRequest<PageResponse<MedicalRecord>>(
        `/v1/medical-records/patient/${patientId}?size=${size}`,
    );

    return res.data;
}

export type MedicalRecordCreatePayload = {
    appointmentId: string;
    chiefComplaint?: string;
    symptoms?: string;
    clinicalNote?: string;
    diagnosisText?: string;
    treatmentPlan?: string;
    followUpNote?: string;
};

export type MedicalRecordUpdatePayload = {
    chiefComplaint?: string;
    symptoms?: string;
    clinicalNote?: string;
    diagnosisText?: string;
    treatmentPlan?: string;
    followUpNote?: string;
};

export type DiagnosisCreatePayload = {
    diagnosisText: string;
    icdCode?: string;
    icdDisplay?: string;
    codingSystem?: string;
    source?: string;
    confidence?: number;
    acceptedByDoctor?: boolean;
};

export async function createMedicalRecord(payload: MedicalRecordCreatePayload) {
    const res = await apiRequest<MedicalRecord>('/v1/medical-records', {
        method: 'POST',
        body: payload,
    });

    return res.data;
}

export async function updateMedicalRecord(
    medicalRecordId: string,
    payload: MedicalRecordUpdatePayload,
) {
    const res = await apiRequest<MedicalRecord>(
        `/v1/medical-records/${medicalRecordId}`,
        {
            method: 'PUT',
            body: payload,
        },
    );

    return res.data;
}

export async function addDiagnosis(
    medicalRecordId: string,
    payload: DiagnosisCreatePayload,
) {
    const res = await apiRequest<MedicalRecordDiagnosis>(
        `/v1/medical-records/${medicalRecordId}/diagnoses`,
        {
            method: 'POST',
            body: payload,
        },
    );

    return res.data;
}

export async function deleteDiagnosis(
    medicalRecordId: string,
    diagnosisId: string,
) {
    const res = await apiRequest<void>(
        `/v1/medical-records/${medicalRecordId}/diagnoses/${diagnosisId}`,
        {
            method: 'DELETE',
        },
    );

    return res.data;
}

export async function completeMedicalRecord(medicalRecordId: string) {
    const res = await apiRequest<MedicalRecord>(
        `/v1/medical-records/${medicalRecordId}/complete`,
        {
            method: 'PATCH',
        },
    );

    return res.data;
}