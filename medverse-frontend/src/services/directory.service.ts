import { apiRequest } from '@/lib/api/http';
import type { DirectoryDoctor, DirectorySpecialty } from '@/types/clinical';
import type { PageResponse } from '@/types/pagination';

export async function getDirectorySpecialties() {
    const res = await apiRequest<PageResponse<DirectorySpecialty>>(
        '/v1/directory/specialties?size=100',
    );

    return res.data.content || [];
}

export async function getDirectoryDoctors(params?: {
    specialtyId?: string;
    keyword?: string;
}) {
    const searchParams = new URLSearchParams();

    searchParams.set('size', '100');

    if (params?.specialtyId) {
        searchParams.set('specialtyId', params.specialtyId);
    }

    if (params?.keyword?.trim()) {
        searchParams.set('keyword', params.keyword.trim());
    }

    const res = await apiRequest<PageResponse<DirectoryDoctor>>(
        `/v1/directory/doctors?${searchParams.toString()}`,
    );

    return res.data.content || [];
}