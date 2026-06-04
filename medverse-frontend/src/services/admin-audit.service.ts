import { apiRequest } from '@/lib/api/http';
import type { AuditLog } from '@/types/clinical';
import type { PageResponse } from '@/types/pagination';

export type AuditLogFilter = {
    keyword?: string;
    action?: string;
    result?: string;
    page?: number;
    size?: number;
};

type AuditLogResponseLike =
    | AuditLog[]
    | PageResponse<AuditLog>
    | {
        content?: AuditLog[];
        data?: AuditLog[] | PageResponse<AuditLog>;
    }
    | null
    | undefined;

function emptyPage(): PageResponse<AuditLog> {
    return {
        content: [],
        page: 0,
        size: 0,
        totalElements: 0,
        totalPages: 0,
    } as PageResponse<AuditLog>;
}

function extractAuditLogPage(response: AuditLogResponseLike): PageResponse<AuditLog> {
    if (Array.isArray(response)) {
        return {
            content: response,
            page: 0,
            size: response.length,
            totalElements: response.length,
            totalPages: 1,
        } as PageResponse<AuditLog>;
    }

    if (!response || typeof response !== 'object') {
        return emptyPage();
    }

    if (Array.isArray(response.content)) {
        return response as PageResponse<AuditLog>;
    }

    if (Array.isArray(response.data)) {
        return {
            content: response.data,
            page: 0,
            size: response.data.length,
            totalElements: response.data.length,
            totalPages: 1,
        } as PageResponse<AuditLog>;
    }

    if (
        response.data &&
        typeof response.data === 'object' &&
        Array.isArray(response.data.content)
    ) {
        return response.data as PageResponse<AuditLog>;
    }

    return emptyPage();
}

function buildAuditQuery(filter?: AuditLogFilter) {
    const params = new URLSearchParams();

    params.set('page', String(filter?.page || 0));
    params.set('size', String(filter?.size || 50));

    if (filter?.keyword?.trim()) {
        params.set('keyword', filter.keyword.trim());
    }

    if (filter?.action && filter.action !== 'ALL') {
        params.set('action', filter.action);
    }

    if (filter?.result && filter.result !== 'ALL') {
        params.set('result', filter.result);
    }

    return params.toString();
}

export async function getAdminAuditLogs(filter?: AuditLogFilter) {
    const res = await apiRequest<AuditLogResponseLike>(
        `/v1/admin/audit-logs?${buildAuditQuery(filter)}`,
    );

    return extractAuditLogPage(res.data);
}