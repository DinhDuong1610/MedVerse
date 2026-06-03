import { apiRequest } from '@/lib/api/http';
import type { Medication } from '@/types/clinical';
import type { PageResponse } from '@/types/pagination';

const MEDICATION_SEARCH_ENDPOINT = '/v1/inventory/medications';

export async function searchMedications(keyword = '') {
    const query = keyword.trim();

    const res = await apiRequest<PageResponse<Medication>>(
        `${MEDICATION_SEARCH_ENDPOINT}?keyword=${encodeURIComponent(query)}&size=20`,
    );

    return res.data.content || [];
}