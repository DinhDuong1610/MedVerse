import { apiRequest } from '@/lib/api/http';
import type { AdminSystemSummary } from '@/types/clinical';

export async function getAdminSystemSummary() {
    const res = await apiRequest<AdminSystemSummary>(
        '/v1/admin/system/summary',
    );

    return res.data;
}