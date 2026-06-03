import { apiRequest } from '@/lib/api/http';
import type { AdminOperationsSummary } from '@/types/admin-operations';

export async function getAdminOperationsSummary() {
    const res = await apiRequest<AdminOperationsSummary>(
        '/v1/admin/operations/summary',
    );

    return res.data;
}