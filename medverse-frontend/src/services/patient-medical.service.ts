import { apiRequest } from '@/lib/api/http';
import type { Allergy, PatientMedicalProfile } from '@/types/clinical';

export async function getMyMedicalProfile() {
    const res = await apiRequest<PatientMedicalProfile>(
        '/v1/patient-medical/me/profile',
    );

    return res.data;
}

export async function getMyAllergies() {
    const res = await apiRequest<Allergy[]>('/v1/patient-medical/me/allergies');

    return res.data;
}