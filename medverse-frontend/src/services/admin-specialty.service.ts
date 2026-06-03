import { apiRequest } from '@/lib/api/http';
import type {
    AdminSpecialty,
    AdminSpecialtyPayload,
} from '@/types/admin-specialty';
import type { PageResponse } from '@/types/pagination';

export async function getAdminSpecialties(size = 100) {
    const res = await apiRequest<PageResponse<AdminSpecialty>>(
        `/v1/admin/specialties?size=${size}`,
    );

    return res.data;
}

export async function getAdminSpecialtyById(id: string) {
    const res = await apiRequest<AdminSpecialty>(
        `/v1/admin/specialties/${id}`,
    );

    return res.data;
}

export async function createAdminSpecialty(payload: AdminSpecialtyPayload) {
    const res = await apiRequest<AdminSpecialty>('/v1/admin/specialties', {
        method: 'POST',
        body: payload,
    });

    return res.data;
}

export async function updateAdminSpecialty(
    id: string,
    payload: AdminSpecialtyPayload,
) {
    const res = await apiRequest<AdminSpecialty>(
        `/v1/admin/specialties/${id}`,
        {
            method: 'PUT',
            body: payload,
        },
    );

    return res.data;
}

export async function deleteAdminSpecialty(id: string) {
    const res = await apiRequest<void>(`/v1/admin/specialties/${id}`, {
        method: 'DELETE',
    });

    return res.data;
}