'use client';

import {
    Badge,
    Button,
    Empty,
    List,
    Popover,
    Skeleton,
    Space,
    Tag,
    message,
} from 'antd';
import {
    BellOutlined,
    CalendarOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    ExclamationCircleOutlined,
    FileDoneOutlined,
    MedicineBoxOutlined,
    ReloadOutlined,
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { ReactNode, useEffect, useMemo, useState } from 'react';
import { hasRole } from '@/lib/auth/roles';
import { useAuthSession } from '@/lib/auth/use-auth-session';
import {
    getMyNotifications,
    getUnreadNotificationCount,
    markAllNotificationsAsRead,
    markNotificationAsRead,
} from '@/services/notification.service';
import type { AppNotification } from '@/types/clinical';

function formatDateTime(value?: string) {
    if (!value) return 'Chưa rõ thời gian';

    return new Date(value).toLocaleString('vi-VN');
}

function getNotificationLabel(type?: string) {
    const normalized = type || '';

    const labels: Record<string, string> = {
        APPOINTMENT_REQUEST_CREATED: 'Yêu cầu đặt lịch',
        APPOINTMENT_REQUEST_APPROVED: 'Lịch đã duyệt',
        APPOINTMENT_REQUEST_REJECTED: 'Yêu cầu bị từ chối',
        APPOINTMENT_REQUEST_CANCELLED: 'Yêu cầu đã hủy',
        APPOINTMENT_CANCELLED: 'Lịch đã hủy',
        APPOINTMENT_RESCHEDULED: 'Đổi lịch',
        APPOINTMENT_NO_SHOW: 'Vắng mặt',
        MEDICAL_RECORD_COMPLETED: 'Kết quả khám',
        PRESCRIPTION_FINALIZED: 'Đơn thuốc',
        PRESCRIPTION_CANCELLED: 'Hủy đơn thuốc',
        AI_SAFETY_ALERT: 'AI Safety',
        SYSTEM: 'Hệ thống',
    };

    return labels[normalized] || normalized || 'Thông báo';
}

function getNotificationColor(type?: string) {
    if (!type) return 'blue';

    if (
        type.includes('REJECTED') ||
        type.includes('CANCELLED') ||
        type.includes('NO_SHOW')
    ) {
        return 'red';
    }

    if (type.includes('APPROVED') || type.includes('FINALIZED')) {
        return 'green';
    }

    if (type.includes('RESCHEDULED')) {
        return 'orange';
    }

    if (type.includes('MEDICAL_RECORD')) {
        return 'purple';
    }

    return 'blue';
}

function getNotificationIcon(type?: string): ReactNode {
    if (!type) return <BellOutlined />;

    if (type.includes('PRESCRIPTION')) {
        return <MedicineBoxOutlined />;
    }

    if (type.includes('MEDICAL_RECORD')) {
        return <FileDoneOutlined />;
    }

    if (type.includes('REJECTED') || type.includes('CANCELLED')) {
        return <CloseCircleOutlined />;
    }

    if (type.includes('APPROVED') || type.includes('FINALIZED')) {
        return <CheckCircleOutlined />;
    }

    if (type.includes('NO_SHOW') || type.includes('AI_SAFETY')) {
        return <ExclamationCircleOutlined />;
    }

    if (type.includes('APPOINTMENT')) {
        return <CalendarOutlined />;
    }

    return <BellOutlined />;
}

function getNotificationHref(
    item: AppNotification,
    session: ReturnType<typeof useAuthSession>['session'],
) {
    const entityType = item.entityType?.toUpperCase();
    const type = item.type?.toUpperCase();

    if (entityType === 'APPOINTMENT_REQUEST') {
        if (hasRole(session, 'PATIENT')) {
            return '/dashboard/patient/appointment-requests';
        }

        return '/dashboard/receptionist/requests';
    }

    if (entityType === 'APPOINTMENT') {
        if (hasRole(session, 'PATIENT')) {
            return '/dashboard/patient/appointments';
        }

        if (hasRole(session, 'DOCTOR')) {
            return '/dashboard/doctor/appointments';
        }

        return '/dashboard/receptionist/appointments';
    }

    if (entityType === 'MEDICAL_RECORD' || type === 'MEDICAL_RECORD_COMPLETED') {
        if (hasRole(session, 'PATIENT')) {
            return '/dashboard/patient/medical-records';
        }

        return '/dashboard/doctor/cases';
    }

    if (entityType === 'PRESCRIPTION' || type?.includes('PRESCRIPTION')) {
        if (hasRole(session, 'PATIENT')) {
            return '/dashboard/patient/prescriptions';
        }

        return '/dashboard/doctor/prescriptions';
    }

    return '/dashboard/notifications';
}

export default function NotificationBadge() {
    const router = useRouter();
    const { session } = useAuthSession();

    const [open, setOpen] = useState(false);
    const [count, setCount] = useState(0);
    const [items, setItems] = useState<AppNotification[]>([]);
    const [loading, setLoading] = useState(false);

    const unreadItems = useMemo(
        () => items.filter((item) => !item.read),
        [items],
    );

    const latestItems = useMemo(() => items.slice(0, 6), [items]);

    const loadNotifications = async () => {
        try {
            setLoading(true);

            const [page, unread] = await Promise.all([
                getMyNotifications(8),
                getUnreadNotificationCount(),
            ]);

            setItems(page.content || []);
            setCount(unread);
        } catch {
            setItems([]);
            setCount(0);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadNotifications();

        const timer = window.setInterval(() => {
            loadNotifications();
        }, 60000);

        return () => window.clearInterval(timer);
    }, []);

    const handleOpenChange = (nextOpen: boolean) => {
        setOpen(nextOpen);

        if (nextOpen) {
            loadNotifications();
        }
    };

    const handleReadOne = async (item: AppNotification) => {
        if (item.read) return;

        try {
            const updated = await markNotificationAsRead(item.id);

            setItems((current) =>
                current.map((notification) =>
                    notification.id === item.id ? updated : notification,
                ),
            );

            setCount((current) => Math.max(0, current - 1));
        } catch {
            message.error('Không thể đánh dấu thông báo đã đọc.');
        }
    };

    const handleReadAll = async () => {
        try {
            await markAllNotificationsAsRead();

            setItems((current) =>
                current.map((item) => ({
                    ...item,
                    read: true,
                })),
            );

            setCount(0);
            message.success('Đã đánh dấu tất cả thông báo là đã đọc.');
        } catch {
            message.error('Không thể đánh dấu tất cả thông báo.');
        }
    };

    const handleOpenNotification = async (item: AppNotification) => {
        await handleReadOne(item);

        const href = getNotificationHref(item, session);
        setOpen(false);
        router.push(href);
    };

    const content = (
        <div style={{ width: 420, maxWidth: 'calc(100vw - 32px)' }}>
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 12,
                    alignItems: 'flex-start',
                    marginBottom: 12,
                }}
            >
                <div>
                    <strong style={{ fontSize: 16 }}>Thông báo</strong>
                    <p
                        style={{
                            margin: '4px 0 0',
                            color: '#6a7c7a',
                            fontSize: 13,
                        }}
                    >
                        {count > 0
                            ? `Bạn có ${count} thông báo chưa đọc.`
                            : 'Không có thông báo mới.'}
                    </p>
                </div>

                <Space>
                    <Button
                        size="small"
                        icon={<ReloadOutlined />}
                        onClick={loadNotifications}
                    />

                    <Button
                        size="small"
                        disabled={count === 0}
                        onClick={handleReadAll}
                    >
                        Đọc tất cả
                    </Button>
                </Space>
            </div>

            {loading ? (
                <Skeleton active paragraph={{ rows: 4 }} />
            ) : latestItems.length === 0 ? (
                <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="Chưa có thông báo"
                />
            ) : (
                <List
                    dataSource={latestItems}
                    renderItem={(item) => {
                        const color = getNotificationColor(item.type);

                        return (
                            <List.Item
                                style={{
                                    cursor: 'pointer',
                                    padding: '12px 4px',
                                    background: item.read
                                        ? 'transparent'
                                        : 'rgba(25, 182, 164, 0.08)',
                                    borderRadius: 12,
                                    marginBottom: 6,
                                }}
                                onClick={() => handleOpenNotification(item)}
                            >
                                <List.Item.Meta
                                    avatar={
                                        <Badge dot={!item.read}>
                                            <div
                                                style={{
                                                    width: 36,
                                                    height: 36,
                                                    borderRadius: 12,
                                                    display: 'grid',
                                                    placeItems: 'center',
                                                    background:
                                                        'rgba(25, 182, 164, 0.12)',
                                                    color: '#119c8d',
                                                    fontSize: 18,
                                                }}
                                            >
                                                {getNotificationIcon(item.type)}
                                            </div>
                                        </Badge>
                                    }
                                    title={
                                        <Space
                                            direction="vertical"
                                            size={4}
                                            style={{ width: '100%' }}
                                        >
                                            <Space
                                                wrap
                                                style={{
                                                    width: '100%',
                                                    justifyContent:
                                                        'space-between',
                                                }}
                                            >
                                                <strong>{item.title}</strong>

                                                <Tag color={color}>
                                                    {getNotificationLabel(
                                                        item.type,
                                                    )}
                                                </Tag>
                                            </Space>
                                        </Space>
                                    }
                                    description={
                                        <div>
                                            <p
                                                style={{
                                                    margin: '4px 0',
                                                    color: '#52605f',
                                                }}
                                            >
                                                {item.message ||
                                                    'Không có nội dung.'}
                                            </p>

                                            <p
                                                style={{
                                                    margin: 0,
                                                    color: '#8a9a98',
                                                    fontSize: 12,
                                                }}
                                            >
                                                {formatDateTime(item.createdAt)}
                                            </p>
                                        </div>
                                    }
                                />
                            </List.Item>
                        );
                    }}
                />
            )}

            {unreadItems.length > 0 && (
                <p
                    style={{
                        margin: '8px 0 0',
                        color: '#6a7c7a',
                        fontSize: 12,
                    }}
                >
                    Mẹo: bấm vào thông báo để mở đúng khu vực xử lý.
                </p>
            )}

            <Button
                type="link"
                block
                href="/dashboard/notifications"
                style={{ marginTop: 8 }}
                onClick={() => setOpen(false)}
            >
                Xem tất cả thông báo
            </Button>
        </div>
    );

    return (
        <Popover
            trigger="click"
            placement="bottomRight"
            open={open}
            onOpenChange={handleOpenChange}
            content={content}
            overlayInnerStyle={{
                padding: 16,
                borderRadius: 18,
            }}
        >
            <Badge count={count} size="small" overflowCount={99}>
                <Button shape="circle" icon={<BellOutlined />} />
            </Badge>
        </Popover>
    );
}