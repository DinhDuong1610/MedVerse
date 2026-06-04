export type UserNotification = {
    id: string;
    title?: string;
    message?: string;
    content?: string;
    type?: string;
    category?: string;
    severity?: string;
    status?: string;
    read?: boolean;
    isRead?: boolean;
    readAt?: string;
    createdAt?: string;
    occurredAt?: string;
    linkUrl?: string;
    actionUrl?: string;
    actorName?: string;
    actorEmail?: string;
    metadata?: Record<string, unknown>;
};

export type NotificationFilter = {
    keyword?: string;
    status?: 'ALL' | 'UNREAD' | 'READ';
    page?: number;
    size?: number;
};

export type NotificationPage = {
    content: UserNotification[];
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
};

export type NotificationUnreadCount = {
    unreadCount: number;
};