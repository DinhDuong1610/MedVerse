import { apiRequest } from '@/lib/api/http';
import type { AuditLog } from '@/types/clinical';
import type { PageResponse } from '@/types/pagination';

export type AuditLogFilter = {
    action?: string;
    entityType?: string;
    actorEmail?: string;
    result?: string;
    size?: number;
};

export async function getAuditLogs(filter?: AuditLogFilter) {
    const params = new URLSearchParams();

    params.set('size', String(filter?.size || 30));

    if (filter?.action?.trim()) {
        params.set('action', filter.action.trim());
    }

    if (filter?.entityType?.trim()) {
        params.set('entityType', filter.entityType.trim());
    }

    if (filter?.actorEmail?.trim()) {
        params.set('actorEmail', filter.actorEmail.trim());
    }

    if (filter?.result?.trim()) {
        params.set('result', filter.result.trim());
    }

    const res = await apiRequest<PageResponse<AuditLog>>(
        `/v1/admin/audit-logs?${params.toString()}`,
    );

    return res.data;
}