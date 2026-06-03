import { apiRequest } from '@/lib/api/http';
import type {
    Medication,
    MedicationCreatePayload,
    StockImportPayload,
} from '@/types/clinical';
import type { PageResponse } from '@/types/pagination';

export async function getInventoryMedications(keyword = '') {
    const params = new URLSearchParams();

    params.set('size', '30');

    if (keyword.trim()) {
        params.set('keyword', keyword.trim());
    }

    const res = await apiRequest<PageResponse<Medication>>(
        `/v1/inventory/medications?${params.toString()}`,
    );

    return res.data;
}

export async function createMedication(payload: MedicationCreatePayload) {
    const res = await apiRequest<Medication>('/v1/inventory/medications', {
        method: 'POST',
        body: payload,
    });

    return res.data;
}

export async function getMedicationById(id: string) {
    const res = await apiRequest<Medication>(`/v1/inventory/medications/${id}`);

    return res.data;
}

export async function importStock(payload: StockImportPayload) {
    const res = await apiRequest<void>('/v1/inventory/import', {
        method: 'POST',
        body: payload,
    });

    return res.data;
}