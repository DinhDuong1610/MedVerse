'use client';

import { Badge, Button, Card, List, message } from 'antd';
import { useEffect, useState } from 'react';
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

export default function NotificationsPage() {
    const { session, loading: authLoading } = useAuthSession();

    const [items, setItems] = useState<AppNotification[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadNotifications = async () => {
        try {
            setLoading(true);
            setError(null);

            const page = await getMyNotifications();
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
            await markNotificationAsRead(id);
            await loadNotifications();
        } catch {
            message.error('Không thể đánh dấu đã đọc.');
        }
    };

    const handleReadAll = async () => {
        try {
            await markAllNotificationsAsRead();
            message.success('Đã đánh dấu tất cả là đã đọc.');
            await loadNotifications();
        } catch {
            message.error('Không thể đánh dấu tất cả.');
        }
    };

    if (authLoading || !session) {
        return <ClinicalPageState loading>Loading</ClinicalPageState>;
    }

    if (hasRole(session, 'PATIENT')) {
        return (
            <PatientPortalFrame session={session}>
                <section className={portalStyles.hero}>
                    <div>
                        <div className={portalStyles.heroKicker}>
                            Notifications
                        </div>
                        <h1 className={portalStyles.heroTitle}>
                            Thông báo của tôi
                        </h1>
                        <p className={portalStyles.heroDescription}>
                            Theo dõi các cập nhật về yêu cầu đặt lịch, lịch hẹn,
                            bệnh án, đơn thuốc và những thay đổi quan trọng từ
                            phòng khám.
                        </p>
                    </div>

                    <article className={portalStyles.heroCard}>
                        <span>Thông báo mới</span>
                        <strong>
                            {items.filter((item) => !item.read).length}
                        </strong>
                        <p>
                            Bạn có thể đánh dấu từng thông báo hoặc toàn bộ là
                            đã đọc.
                        </p>
                    </article>
                </section>

                <section
                    className={portalStyles.portalPanel}
                    style={{ marginTop: 24 }}
                >
                    <div className={portalStyles.panelHeader}>
                        <div>
                            <span>Notification center</span>
                            <h2>Cập nhật gần đây</h2>
                        </div>

                        <Button onClick={handleReadAll}>
                            Đánh dấu tất cả đã đọc
                        </Button>
                    </div>

                    <ClinicalPageState
                        loading={loading}
                        error={error}
                        empty={items.length === 0}
                        emptyTitle="Chưa có thông báo"
                        emptyDescription="Các cập nhật quan trọng sẽ hiển thị tại đây."
                    >
                        {items.map((item) => (
                            <article key={item.id} className={portalStyles.listCard}>
                                <div className={portalStyles.listTitle}>
                                    <strong>
                                        {!item.read && (
                                            <Badge status="processing" />
                                        )}{' '}
                                        {item.title}
                                    </strong>

                                    <StatusTag
                                        value={item.read ? 'Đã đọc' : 'Mới'}
                                    />
                                </div>

                                <p className={portalStyles.muted}>
                                    {item.message || 'Không có nội dung.'}
                                </p>

                                <p className={portalStyles.muted}>
                                    {item.type} ·{' '}
                                    {item.createdAt
                                        ? new Date(
                                            item.createdAt,
                                        ).toLocaleString('vi-VN')
                                        : 'Chưa rõ thời gian'}
                                </p>

                                {!item.read && (
                                    <Button
                                        type="link"
                                        onClick={() => handleRead(item.id)}
                                    >
                                        Đánh dấu đã đọc
                                    </Button>
                                )}
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
            subtitle="Theo dõi các cập nhật liên quan đến lịch hẹn, bệnh án và đơn thuốc"
        >
            <ClinicalPageState loading={loading} error={error}>
                <Card className={dashboardStyles.detailCard}>
                    <div className={dashboardStyles.panelHeader}>
                        <div>
                            <span>Notification Center</span>
                            <h2>Thông báo của tôi</h2>
                        </div>

                        <Button onClick={handleReadAll}>
                            Đánh dấu tất cả đã đọc
                        </Button>
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
                                <List.Item
                                    className={dashboardStyles.cleanListItem}
                                >
                                    <List.Item.Meta
                                        title={
                                            <div
                                                className={
                                                    dashboardStyles.listTitle
                                                }
                                            >
                                                <span>
                                                    {!item.read && (
                                                        <Badge status="processing" />
                                                    )}{' '}
                                                    <strong>{item.title}</strong>
                                                </span>

                                                <StatusTag
                                                    value={
                                                        item.read
                                                            ? 'Đã đọc'
                                                            : 'Mới'
                                                    }
                                                />
                                            </div>
                                        }
                                        description={
                                            <div>
                                                <p>
                                                    {item.message ||
                                                        'Không có nội dung.'}
                                                </p>
                                                <p>
                                                    {item.type} ·{' '}
                                                    {item.createdAt
                                                        ? new Date(
                                                            item.createdAt,
                                                        ).toLocaleString(
                                                            'vi-VN',
                                                        )
                                                        : 'Chưa rõ thời gian'}
                                                </p>
                                            </div>
                                        }
                                    />

                                    {!item.read && (
                                        <Button
                                            type="link"
                                            onClick={() => handleRead(item.id)}
                                        >
                                            Đã đọc
                                        </Button>
                                    )}
                                </List.Item>
                            )}
                        />
                    )}
                </Card>
            </ClinicalPageState>
        </DashboardFrame>
    );
}