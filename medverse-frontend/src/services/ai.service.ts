import { apiRequest } from '@/lib/api/http';
import type { AiHealth } from '@/types/clinical';

export async function getAiHealth() {
    const res = await apiRequest<AiHealth>('/v1/ai/health');

    return res.data;
}