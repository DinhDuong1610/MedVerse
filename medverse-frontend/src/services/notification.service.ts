import { apiRequest } from '@/lib/api/http';
import type {
    NotificationFilter,
    NotificationPage,
    NotificationUnreadCount,
    UserNotification,
} from '@/types/notification';

type NotificationResponseLike =
    | UserNotification[]
    | NotificationPage
    | {
        content?: UserNotification[];
        data?: UserNotification[] | NotificationPage;
    }
    | null
    | undefined;

type UnreadCountResponseLike =
    | number
    | NotificationUnreadCount
    | {
        data?: number | NotificationUnreadCount;
        count?: number;
        unread?: number;
    }
    | null
    | undefined;

function emptyNotificationPage(): NotificationPage {
    return {
        content: [],
        page: 0,
        size: 0,
        totalElements: 0,
        totalPages: 0,
    };
}

function extractNotificationPage(
    response: NotificationResponseLike,
): NotificationPage {
    if (Array.isArray(response)) {
        return {
            content: response,
            page: 0,
            size: response.length,
            totalElements: response.length,
            totalPages: 1,
        };
    }

    if (!response || typeof response !== 'object') {
        return emptyNotificationPage();
    }

    if (Array.isArray(response.content)) {
        return response as NotificationPage;
    }

    if (Array.isArray(response.data)) {
        return {
            content: response.data,
            page: 0,
            size: response.data.length,
            totalElements: response.data.length,
            totalPages: 1,
        };
    }

    if (
        response.data &&
        typeof response.data === 'object' &&
        Array.isArray(response.data.content)
    ) {
        return response.data as NotificationPage;
    }

    return emptyNotificationPage();
}

function extractUnreadCount(response: UnreadCountResponseLike): number {
    if (typeof response === 'number') {
        return response;
    }

    if (!response || typeof response !== 'object') {
        return 0;
    }

    if ('unreadCount' in response && typeof response.unreadCount === 'number') {
        return response.unreadCount;
    }

    if ('count' in response && typeof response.count === 'number') {
        return response.count;
    }

    if ('unread' in response && typeof response.unread === 'number') {
        return response.unread;
    }

    if ('data' in response) {
        const data = response.data;

        if (typeof data === 'number') {
            return data;
        }

        if (
            data &&
            typeof data === 'object' &&
            'unreadCount' in data &&
            typeof data.unreadCount === 'number'
        ) {
            return data.unreadCount;
        }
    }

    return 0;
}

function buildNotificationQuery(filter?: NotificationFilter) {
    const params = new URLSearchParams();

    params.set('page', String(filter?.page || 0));
    params.set('size', String(filter?.size || 50));

    if (filter?.keyword?.trim()) {
        params.set('keyword', filter.keyword.trim());
    }

    if (filter?.status && filter.status !== 'ALL') {
        params.set('status', filter.status);
    }

    return params.toString();
}

export async function getNotifications(filter?: NotificationFilter) {
    const res = await apiRequest<NotificationResponseLike>(
        `/v1/notifications?${buildNotificationQuery(filter)}`,
    );

    return extractNotificationPage(res.data);
}

export async function getUnreadNotificationCount() {
    const res = await apiRequest<UnreadCountResponseLike>(
        '/v1/notifications/unread-count',
    );

    return extractUnreadCount(res.data);
}

export async function markNotificationAsRead(notificationId: string) {
    const res = await apiRequest<UserNotification>(
        `/v1/notifications/${notificationId}/read`,
        {
            method: 'PUT',
        },
    );

    return res.data;
}

export async function markAllNotificationsAsRead() {
    const res = await apiRequest<void>('/v1/notifications/read-all', {
        method: 'PUT',
    });

    return res.data;
}