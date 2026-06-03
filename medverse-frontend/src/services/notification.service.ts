import { apiRequest } from '@/lib/api/http';
import type { AppNotification } from '@/types/clinical';
import type { PageResponse } from '@/types/pagination';

export async function getMyNotifications() {
    const res = await apiRequest<PageResponse<AppNotification>>(
        '/v1/notifications/me?size=20',
    );

    return res.data;
}

export async function getUnreadNotificationCount() {
    const res = await apiRequest<{ count: number }>(
        '/v1/notifications/unread-count',
    );

    return res.data.count || 0;
}

export async function markNotificationAsRead(id: string) {
    const res = await apiRequest<AppNotification>(
        `/v1/notifications/${id}/read`,
        {
            method: 'PATCH',
        },
    );

    return res.data;
}

export async function markAllNotificationsAsRead() {
    const res = await apiRequest<void>('/v1/notifications/read-all', {
        method: 'PATCH',
    });

    return res.data;
}