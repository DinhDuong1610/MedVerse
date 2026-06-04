import { apiRequest } from '@/lib/api/http';
import type {
    Medication,
    MedicationCreatePayload,
    StockImportPayload,
} from '@/types/clinical';
import type { PageResponse } from '@/types/pagination';

export type MedicationFilter = {
    keyword?: string;
    page?: number;
    size?: number;
};

type MedicationResponseLike =
    | Medication[]
    | PageResponse<Medication>
    | {
        content?: Medication[];
        data?: Medication[] | PageResponse<Medication>;
    }
    | null
    | undefined;

function extractMedicationPage(response: MedicationResponseLike): PageResponse<Medication> {
    if (Array.isArray(response)) {
        return {
            content: response,
            page: 0,
            size: response.length,
            totalElements: response.length,
            totalPages: 1,
        } as PageResponse<Medication>;
    }

    if (!response || typeof response !== 'object') {
        return {
            content: [],
            page: 0,
            size: 0,
            totalElements: 0,
            totalPages: 0,
        } as PageResponse<Medication>;
    }

    if (Array.isArray(response.content)) {
        return response as PageResponse<Medication>;
    }

    if (Array.isArray(response.data)) {
        return {
            content: response.data,
            page: 0,
            size: response.data.length,
            totalElements: response.data.length,
            totalPages: 1,
        } as PageResponse<Medication>;
    }

    if (
        response.data &&
        typeof response.data === 'object' &&
        Array.isArray(response.data.content)
    ) {
        return response.data as PageResponse<Medication>;
    }

    return {
        content: [],
        page: 0,
        size: 0,
        totalElements: 0,
        totalPages: 0,
    } as PageResponse<Medication>;
}

function buildMedicationQuery(filter?: MedicationFilter) {
    const params = new URLSearchParams();

    params.set('page', String(filter?.page || 0));
    params.set('size', String(filter?.size || 50));

    if (filter?.keyword?.trim()) {
        params.set('keyword', filter.keyword.trim());
    }

    return params.toString();
}

export async function getInventoryMedications(filter?: MedicationFilter) {
    const res = await apiRequest<MedicationResponseLike>(
        `/v1/inventory/medications?${buildMedicationQuery(filter)}`,
    );

    return extractMedicationPage(res.data);
}

export async function createInventoryMedication(payload: MedicationCreatePayload) {
    const res = await apiRequest<Medication>('/v1/inventory/medications', {
        method: 'POST',
        body: payload,
    });

    return res.data;
}

export async function updateInventoryMedication(
    medicationId: string,
    payload: MedicationCreatePayload,
) {
    const res = await apiRequest<Medication>(
        `/v1/inventory/medications/${medicationId}`,
        {
            method: 'PUT',
            body: payload,
        },
    );

    return res.data;
}

export async function importMedicationStock(payload: StockImportPayload) {
    /**
     * Endpoint chính nên dùng.
     * Nếu backend của bạn đang đặt tên khác, chỉ cần sửa duy nhất path này.
     */
    const res = await apiRequest<void>('/v1/inventory/stock-imports', {
        method: 'POST',
        body: payload,
    });

    return res.data;
}