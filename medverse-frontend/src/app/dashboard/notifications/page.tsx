'use client';

import { Badge, Button, Card, List, message } from 'antd';
import { useEffect, useState } from 'react';
import DashboardFrame from '../_components/DashboardFrame';
import ClinicalEmptyState from '../_components/ClinicalEmptyState';
import ClinicalPageState from '../_components/ClinicalPageState';
import StatusTag from '../_components/StatusTag';
import { useAuthSession } from '@/lib/auth/use-auth-session';
import {
    getMyNotifications,
    markAllNotificationsAsRead,
    markNotificationAsRead,
} from '@/services/notification.service';
import type { AppNotification } from '@/types/clinical';
import styles from '../dashboard.module.scss';

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

    return (
        <DashboardFrame
            session={session}
            title="Thông báo"
            subtitle="Theo dõi các cập nhật liên quan đến lịch hẹn, bệnh án và đơn thuốc"
        >
            <ClinicalPageState loading={loading} error={error}>
                <Card className={styles.detailCard}>
                    <div className={styles.panelHeader}>
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
                                <List.Item className={styles.cleanListItem}>
                                    <List.Item.Meta
                                        title={
                                            <div className={styles.listTitle}>
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