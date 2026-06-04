import { apiRequest } from '@/lib/api/http';

export type PatientMedicalProfile = {
    id?: string;
    patientId?: string;
    bloodType?: string;
    heightCm?: number;
    weightKg?: number;
    chronicDiseases?: string;
    chronicConditionsNote?: string;
    medicalHistory?: string;
    currentMedicationsNote?: string;
    note?: string;
    createdAt?: string;
    updatedAt?: string;
};

export type PatientMedicalProfilePayload = {
    bloodType?: string;
    heightCm?: number;
    weightKg?: number;
    chronicDiseases?: string;
    medicalHistory?: string;
    currentMedicationsNote?: string;
    note?: string;
};

export type PatientAllergy = {
    id: string;
    allergen: string;
    reaction?: string;
    severity?: string;
    note?: string;
    createdAt?: string;
    updatedAt?: string;
};

export type PatientAllergyPayload = {
    allergen: string;
    reaction?: string;
    severity?: string;
    note?: string;
};

type ListResponseLike<T> =
    | T[]
    | {
        content?: T[];
        data?: T[] | { content?: T[] };
    }
    | null
    | undefined;

function extractList<T>(response: ListResponseLike<T>): T[] {
    if (Array.isArray(response)) return response;

    if (!response || typeof response !== 'object') return [];

    if (Array.isArray(response.content)) return response.content;

    if (Array.isArray(response.data)) return response.data;

    if (
        response.data &&
        typeof response.data === 'object' &&
        Array.isArray(response.data.content)
    ) {
        return response.data.content;
    }

    return [];
}

export async function getMyPatientMedicalProfile() {
    const res = await apiRequest<PatientMedicalProfile>(
        '/v1/patient-medical/me/profile',
    );

    return res.data;
}

export async function updateMyPatientMedicalProfile(
    payload: PatientMedicalProfilePayload,
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

export async function getMyAllergies() {
    const res = await apiRequest<ListResponseLike<PatientAllergy>>(
        '/v1/patient-medical/me/allergies',
    );

    return extractList(res.data);
}

export async function createMyAllergy(payload: PatientAllergyPayload) {
    const res = await apiRequest<PatientAllergy>(
        '/v1/patient-medical/me/allergies',
        {
            method: 'POST',
            body: payload,
        },
    );

    return res.data;
}

export async function updateMyAllergy(
    allergyId: string,
    payload: PatientAllergyPayload,
) {
    const res = await apiRequest<PatientAllergy>(
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

export async function getPatientMedicalProfileByPatientId(patientId: string) {
    const res = await apiRequest<PatientMedicalProfile>(
        `/v1/patient-medical/patients/${patientId}/profile`,
    );

    return res.data;
}

export async function getPatientAllergiesByPatientId(patientId: string) {
    const res = await apiRequest<ListResponseLike<PatientAllergy>>(
        `/v1/patient-medical/patients/${patientId}/allergies`,
    );

    return extractList(res.data);
}

// Alias để không phá các file doctor workspace nếu đang dùng tên ngắn hơn.
export const getPatientMedicalProfile = getPatientMedicalProfileByPatientId;
export const getPatientAllergies = getPatientAllergiesByPatientId;