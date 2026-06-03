'use client';

import {
    Badge,
    Button,
    Card,
    List,
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
} from '@ant-design/icons';
import { ReactNode, useEffect, useMemo, useState } from 'react';
import ClinicalEmptyState from '../_components/ClinicalEmptyState';
import ClinicalPageState from '../_components/ClinicalPageState';
import DashboardFrame from '../_components/DashboardFrame';
import PatientPortalFrame from '../_components/PatientPortalFrame';
import StatusTag from '../_components/StatusTag';
import { hasRole } from '@/lib/auth/roles';
import { useAuthSession } from '@/lib/auth/use-auth-session';
import {
    getMyNotifications,
    markAllNotificationsAsRead,
    markNotificationAsRead,
} from '@/services/notification.service';
import type { AppNotification } from '@/types/clinical';
import dashboardStyles from '../dashboard.module.scss';
import portalStyles from '../_components/patient-portal.module.scss';

function formatDateTime(value?: string) {
    if (!value) return 'Chưa rõ thời gian';

    return new Date(value).toLocaleString('vi-VN');
}

function getNotificationLabel(type?: string) {
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

    return labels[type || ''] || type || 'Thông báo';
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

function getNotificationHref(item: AppNotification, isPatient: boolean) {
    const entityType = item.entityType?.toUpperCase();
    const type = item.type?.toUpperCase();

    if (entityType === 'APPOINTMENT_REQUEST') {
        return isPatient
            ? '/dashboard/patient/appointment-requests'
            : '/dashboard/receptionist/requests';
    }

    if (entityType === 'APPOINTMENT') {
        return isPatient
            ? '/dashboard/patient/appointments'
            : '/dashboard/receptionist/appointments';
    }

    if (entityType === 'MEDICAL_RECORD' || type === 'MEDICAL_RECORD_COMPLETED') {
        return isPatient
            ? '/dashboard/patient/medical-records'
            : '/dashboard/doctor/cases';
    }

    if (entityType === 'PRESCRIPTION' || type?.includes('PRESCRIPTION')) {
        return isPatient
            ? '/dashboard/patient/prescriptions'
            : '/dashboard/doctor/prescriptions';
    }

    return '/dashboard/notifications';
}

function NotificationCard({
    item,
    isPatient,
    onRead,
}: {
    item: AppNotification;
    isPatient: boolean;
    onRead: (id: string) => Promise<void>;
}) {
    const href = getNotificationHref(item, isPatient);

    return (
        <List.Item className={dashboardStyles.cleanListItem}>
            <List.Item.Meta
                avatar={
                    <Badge dot={!item.read}>
                        <div
                            style={{
                                width: 42,
                                height: 42,
                                borderRadius: 14,
                                display: 'grid',
                                placeItems: 'center',
                                background: item.read
                                    ? 'rgba(106, 124, 122, 0.10)'
                                    : 'rgba(25, 182, 164, 0.14)',
                                color: item.read ? '#6a7c7a' : '#119c8d',
                                fontSize: 20,
                            }}
                        >
                            {getNotificationIcon(item.type)}
                        </div>
                    </Badge>
                }
                title={
                    <div className={dashboardStyles.listTitle}>
                        <span>
                            <strong>{item.title}</strong>
                        </span>

                        <Space wrap>
                            <Tag color={getNotificationColor(item.type)}>
                                {getNotificationLabel(item.type)}
                            </Tag>

                            <StatusTag value={item.read ? 'Đã đọc' : 'Mới'} />
                        </Space>
                    </div>
                }
                description={
                    <div>
                        <p>{item.message || 'Không có nội dung.'}</p>

                        <p style={{ color: '#6a7c7a' }}>
                            {formatDateTime(item.createdAt)}
                        </p>
                    </div>
                }
            />

            <Space wrap>
                {!item.read && (
                    <Button type="link" onClick={() => onRead(item.id)}>
                        Đánh dấu đã đọc
                    </Button>
                )}

                <Button href={href} type="primary" ghost>
                    Mở chi tiết
                </Button>
            </Space>
        </List.Item>
    );
}

export default function NotificationsPage() {
    const { session, loading: authLoading } = useAuthSession();

    const [items, setItems] = useState<AppNotification[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const isPatient = hasRole(session, 'PATIENT');

    const unreadCount = useMemo(
        () => items.filter((item) => !item.read).length,
        [items],
    );

    const loadNotifications = async () => {
        try {
            setLoading(true);
            setError(null);

            const page = await getMyNotifications(50);
            setItems(page.content || []);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Không thể tải danh sách thông báo.',
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (session) {
            loadNotifications();
        }
    }, [session]);

    const handleRead = async (id: string) => {
        try {
            const updated = await markNotificationAsRead(id);

            setItems((current) =>
                current.map((item) => (item.id === id ? updated : item)),
            );
        } catch {
            message.error('Không thể đánh dấu đã đọc.');
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

            message.success('Đã đánh dấu tất cả là đã đọc.');
        } catch {
            message.error('Không thể đánh dấu tất cả.');
        }
    };

    if (authLoading || !session) {
        return <ClinicalPageState loading>Loading</ClinicalPageState>;
    }

    if (isPatient) {
        return (
            <PatientPortalFrame session={session}>
                <section className={portalStyles.hero}>
                    <div>
                        <div className={portalStyles.heroKicker}>
                            Notification center
                        </div>

                        <h1 className={portalStyles.heroTitle}>
                            Thông báo của tôi
                        </h1>

                        <p className={portalStyles.heroDescription}>
                            Theo dõi cập nhật về yêu cầu đặt lịch, lịch hẹn,
                            kết quả khám và đơn thuốc. Các thông báo quan trọng
                            sẽ được chuyển đến đây ngay khi hệ thống xử lý.
                        </p>
                    </div>

                    <article className={portalStyles.heroCard}>
                        <span>Thông báo chưa đọc</span>
                        <strong>{unreadCount}</strong>
                        <p>
                            Bấm vào chuông ở góc trên để xem nhanh, hoặc xem đầy
                            đủ tại trang này.
                        </p>
                    </article>
                </section>

                <section
                    className={portalStyles.portalPanel}
                    style={{ marginTop: 24 }}
                >
                    <div className={portalStyles.panelHeader}>
                        <div>
                            <span>Cập nhật gần đây</span>
                            <h2>Danh sách thông báo</h2>
                        </div>

                        <Space wrap>
                            <Button onClick={loadNotifications}>
                                Làm mới
                            </Button>

                            <Button
                                disabled={unreadCount === 0}
                                onClick={handleReadAll}
                            >
                                Đánh dấu tất cả đã đọc
                            </Button>
                        </Space>
                    </div>

                    <ClinicalPageState
                        loading={loading}
                        error={error}
                        empty={items.length === 0}
                        emptyTitle="Chưa có thông báo"
                        emptyDescription="Các cập nhật quan trọng sẽ hiển thị tại đây."
                    >
                        {items.map((item) => (
                            <article
                                key={item.id}
                                className={portalStyles.listCard}
                            >
                                <div className={portalStyles.listTitle}>
                                    <strong>
                                        {!item.read && (
                                            <Badge status="processing" />
                                        )}{' '}
                                        {item.title}
                                    </strong>

                                    <Space wrap>
                                        <Tag
                                            color={getNotificationColor(
                                                item.type,
                                            )}
                                        >
                                            {getNotificationLabel(item.type)}
                                        </Tag>

                                        <StatusTag
                                            value={
                                                item.read ? 'Đã đọc' : 'Mới'
                                            }
                                        />
                                    </Space>
                                </div>

                                <p className={portalStyles.muted}>
                                    {item.message || 'Không có nội dung.'}
                                </p>

                                <p className={portalStyles.muted}>
                                    {formatDateTime(item.createdAt)}
                                </p>

                                <Space wrap>
                                    {!item.read && (
                                        <Button
                                            type="link"
                                            onClick={() =>
                                                handleRead(item.id)
                                            }
                                        >
                                            Đánh dấu đã đọc
                                        </Button>
                                    )}

                                    <Button
                                        href={getNotificationHref(
                                            item,
                                            true,
                                        )}
                                        type="primary"
                                        ghost
                                    >
                                        Mở chi tiết
                                    </Button>
                                </Space>
                            </article>
                        ))}
                    </ClinicalPageState>
                </section>
            </PatientPortalFrame>
        );
    }

    return (
        <DashboardFrame
            session={session}
            title="Thông báo"
            subtitle="Theo dõi các cập nhật liên quan đến lịch hẹn, bệnh án, đơn thuốc và vận hành"
        >
            <ClinicalPageState loading={loading} error={error}>
                <Card className={dashboardStyles.detailCard}>
                    <div className={dashboardStyles.panelHeader}>
                        <div>
                            <span>Notification Center</span>
                            <h2>Thông báo của tôi</h2>
                            <p>
                                Các thông báo chưa đọc sẽ được đánh dấu nổi bật.
                                Bấm “Mở chi tiết” để đi đúng khu vực xử lý.
                            </p>
                        </div>

                        <Space wrap>
                            <Button onClick={loadNotifications}>
                                Làm mới
                            </Button>

                            <Button
                                disabled={unreadCount === 0}
                                onClick={handleReadAll}
                            >
                                Đánh dấu tất cả đã đọc
                            </Button>
                        </Space>
                    </div>

                    {items.length === 0 ? (
                        <ClinicalEmptyState
                            title="Chưa có thông báo"
                            description="Các cập nhật quan trọng sẽ hiển thị tại đây."
                        />
                    ) : (
                        <List
                            dataSource={items}
                            renderItem={(item) => (
                                <NotificationCard
                                    key={item.id}
                                    item={item}
                                    isPatient={false}
                                    onRead={handleRead}
                                />
                            )}
                        />
                    )}
                </Card>
            </ClinicalPageState>
        </DashboardFrame>
    );
}