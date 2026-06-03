import { apiRequest } from '@/lib/api/http';
import type {
    AiAtcSuggestion,
    AiAutocompleteResponse,
    AiHealth,
    AiIcdSuggestion,
} from '@/types/clinical';

function normalizeAutocomplete<T>(payload: AiAutocompleteResponse<T>): T[] {
    return payload.suggestions || payload.results || payload.data || [];
}

export async function getAiHealth() {
    const res = await apiRequest<AiHealth>('/v1/ai/health');

    return res.data;
}

export async function autocompleteAtc(query: string, topK = 8) {
    if (!query.trim()) return [];

    const res = await apiRequest<AiAutocompleteResponse<AiAtcSuggestion>>(
        `/v1/ai/autocomplete/atc?q=${encodeURIComponent(query)}&topK=${topK}`,
    );

    return normalizeAutocomplete(res.data);
}

export async function autocompleteIcd(query: string, topK = 8) {
    if (!query.trim()) return [];

    const res = await apiRequest<AiAutocompleteResponse<AiIcdSuggestion>>(
        `/v1/ai/autocomplete/icd?q=${encodeURIComponent(query)}&topK=${topK}`,
    );

    return normalizeAutocomplete(res.data);
}