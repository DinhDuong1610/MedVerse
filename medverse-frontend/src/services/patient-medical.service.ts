import { apiRequest } from '@/lib/api/http';
import type { Allergy, PatientMedicalProfile } from '@/types/clinical';

export type PatientMedicalProfileUpdatePayload = {
    bloodType?: string | null;
    heightCm?: number | null;
    weightKg?: number | null;
    chronicDiseases?: string | null;
    medicalHistory?: string | null;
    currentMedicationsNote?: string | null;
};

export type AllergySeverity =
    | 'LOW'
    | 'MODERATE'
    | 'HIGH'
    | 'CRITICAL'
    | 'UNKNOWN';

export type AllergyPayload = {
    allergen: string;
    reaction?: string | null;
    severity?: AllergySeverity;
    note?: string | null;
};

export async function getMyMedicalProfile() {
    const res = await apiRequest<PatientMedicalProfile>(
        '/v1/patient-medical/me/profile',
    );

    return res.data;
}

export async function updateMyMedicalProfile(
    payload: PatientMedicalProfileUpdatePayload,
) {
    const res = await apiRequest<PatientMedicalProfile>(
        '/v1/patient-medical/me/profile',
        {
            method: 'PUT',
            body: payload,
        },
    );

    return res.data;
}

export async function getPatientMedicalProfile(patientId: string) {
    const res = await apiRequest<PatientMedicalProfile>(
        `/v1/patient-medical/patients/${patientId}/profile`,
    );

    return res.data;
}

export async function getMyAllergies() {
    const res = await apiRequest<Allergy[]>('/v1/patient-medical/me/allergies');

    return res.data;
}

export async function createMyAllergy(payload: AllergyPayload) {
    const res = await apiRequest<Allergy>('/v1/patient-medical/me/allergies', {
        method: 'POST',
        body: payload,
    });

    return res.data;
}

export async function updateMyAllergy(
    allergyId: string,
    payload: AllergyPayload,
) {
    const res = await apiRequest<Allergy>(
        `/v1/patient-medical/me/allergies/${allergyId}`,
        {
            method: 'PUT',
            body: payload,
        },
    );

    return res.data;
}

export async function deleteMyAllergy(allergyId: string) {
    const res = await apiRequest<void>(
        `/v1/patient-medical/me/allergies/${allergyId}`,
        {
            method: 'DELETE',
        },
    );

    return res.data;
}

export async function getPatientAllergies(patientId: string) {
    const res = await apiRequest<Allergy[]>(
        `/v1/patient-medical/patients/${patientId}/allergies`,
    );

    return res.data;
}