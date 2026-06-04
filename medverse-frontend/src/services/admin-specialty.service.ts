import { apiRequest } from '@/lib/api/http';
import type {
    AdminSpecialty,
    AdminSpecialtyPayload,
} from '@/types/admin-specialty';

type SpecialtyResponseLike =
    | AdminSpecialty[]
    | {
        content?: AdminSpecialty[];
        data?:
        | AdminSpecialty[]
        | {
            content?: AdminSpecialty[];
        };
    }
    | null
    | undefined;

function extractSpecialtyList(response: SpecialtyResponseLike): AdminSpecialty[] {
    if (Array.isArray(response)) {
        return response;
    }

    if (!response || typeof response !== 'object') {
        return [];
    }

    if (Array.isArray(response.content)) {
        return response.content;
    }

    if (Array.isArray(response.data)) {
        return response.data;
    }

    if (
        response.data &&
        typeof response.data === 'object' &&
        Array.isArray(response.data.content)
    ) {
        return response.data.content;
    }

    return [];
}

export async function getAdminSpecialties() {
    const res = await apiRequest<SpecialtyResponseLike>('/v1/admin/specialties');

    return extractSpecialtyList(res.data);
}

export async function getAdminSpecialtyById(id: string) {
    const res = await apiRequest<AdminSpecialty>(`/v1/admin/specialties/${id}`);

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
    const res = await apiRequest<AdminSpecialty>(`/v1/admin/specialties/${id}`, {
        method: 'PUT',
        body: payload,
    });

    return res.data;
}

export async function deleteAdminSpecialty(id: string) {
    const res = await apiRequest<void>(`/v1/admin/specialties/${id}`, {
        method: 'DELETE',
    });

    return res.data;
}