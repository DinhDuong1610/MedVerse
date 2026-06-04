'use client';

import {
    BellOutlined,
    CheckCircleOutlined,
    EyeOutlined,
    FileTextOutlined,
    LinkOutlined,
    ReloadOutlined,
    SearchOutlined,
    WarningOutlined,
} from '@ant-design/icons';
import {
    Alert,
    Button,
    Card,
    Descriptions,
    Drawer,
    Empty,
    Input,
    Select,
    Skeleton,
    Space,
    Statistic,
    Table,
    Tag,
    message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import DashboardFrame from '../_components/DashboardFrame';
import { useAuthSession } from '@/lib/auth/use-auth-session';
import {
    getNotifications,
    markAllNotificationsAsRead,
    markNotificationAsRead,
} from '@/services/notification.service';
import type {
    NotificationFilter,
    UserNotification,
} from '@/types/notification';
import styles from '../dashboard.module.scss';

const statusOptions = [
    {
        label: 'Tất cả thông báo',
        value: 'ALL',
    },
    {
        label: 'Chưa đọc',
        value: 'UNREAD',
    },
    {
        label: 'Đã đọc',
        value: 'READ',
    },
];

function normalizeKeyword(value?: string) {
    return String(value || '')
        .trim()
        .toLowerCase();
}

function formatDateTime(value?: string) {
    if (!value) return 'Chưa ghi nhận';

    return new Date(value).toLocaleString('vi-VN');
}

function getNotificationTitle(item: UserNotification) {
    return item.title || 'Thông báo hệ thống';
}

function getNotificationMessage(item: UserNotification) {
    return item.message || item.content || 'Không có nội dung chi tiết.';
}

function getNotificationTime(item: UserNotification) {
    return item.createdAt || item.occurredAt;
}

function isNotificationRead(item: UserNotification) {
    if (typeof item.read === 'boolean') return item.read;
    if (typeof item.isRead === 'boolean') return item.isRead;

    return String(item.status || '').toUpperCase() === 'READ';
}

function getNotificationTypeLabel(value?: string) {
    const type = String(value || '').toUpperCase();

    const labels: Record<string, string> = {
        SYSTEM: 'Hệ thống',
        APPOINTMENT: 'Lịch hẹn',
        APPOINTMENT_REQUEST: 'Yêu cầu đặt lịch',
        PRESCRIPTION: 'Đơn thuốc',
        MEDICAL_RECORD: 'Bệnh án',
        INVENTORY: 'Kho thuốc',
        SECURITY: 'Bảo mật',
        AI: 'AI',
        REMINDER: 'Nhắc nhở',
    };

    return labels[type] || value || 'Chung';
}

function getSeverityMeta(value?: string) {
    const severity = String(value || '').toUpperCase();

    if (['ERROR', 'CRITICAL', 'HIGH', 'URGENT'].includes(severity)) {
        return {
            label: 'Quan trọng',
            color: 'red',
        };
    }

    if (['WARNING', 'MEDIUM'].includes(severity)) {
        return {
            label: 'Cần chú ý',
            color: 'orange',
        };
    }

    if (['SUCCESS', 'LOW'].includes(severity)) {
        return {
            label: 'Thông tin',
            color: 'green',
        };
    }

    return {
        label: 'Thông báo',
        color: 'blue',
    };
}

export default function NotificationsPage() {
    const { session, loading: authLoading } = useAuthSession();

    const [notifications, setNotifications] = useState<UserNotification[]>([]);
    const [filter, setFilter] = useState<NotificationFilter>({
        keyword: '',
        status: 'ALL',
        page: 0,
        size: 100,
    });

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [selectedNotification, setSelectedNotification] =
        useState<UserNotification | null>(null);
    const [openDetailDrawer, setOpenDetailDrawer] = useState(false);

    const loadNotifications = async (nextFilter = filter) => {
        try {
            setLoading(true);
            setError(null);

            const page = await getNotifications({
                ...nextFilter,
                size: nextFilter.size || 100,
            });

            setNotifications(page.content || []);
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
        if (!session) return;

        loadNotifications();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session]);

    const filteredNotifications = useMemo(() => {
        const keyword = normalizeKeyword(filter.keyword);

        return notifications.filter((item) => {
            const read = isNotificationRead(item);

            const matchKeyword =
                !keyword ||
                getNotificationTitle(item).toLowerCase().includes(keyword) ||
                getNotificationMessage(item).toLowerCase().includes(keyword) ||
                item.type?.toLowerCase().includes(keyword) ||
                item.category?.toLowerCase().includes(keyword);

            const matchStatus =
                filter.status === 'ALL' ||
                (filter.status === 'READ' && read) ||
                (filter.status === 'UNREAD' && !read);

            return matchKeyword && matchStatus;
        });
    }, [notifications, filter]);

    const metrics = useMemo(() => {
        const unread = notifications.filter((item) => !isNotificationRead(item)).length;
        const read = notifications.length - unread;
        const important = notifications.filter((item) =>
            ['ERROR', 'CRITICAL', 'HIGH', 'URGENT', 'WARNING'].includes(
                String(item.severity || '').toUpperCase(),
            ),
        ).length;

        return {
            total: notifications.length,
            unread,
            read,
            important,
        };
    }, [notifications]);

    const openDetail = async (notification: UserNotification) => {
        setSelectedNotification(notification);
        setOpenDetailDrawer(true);

        if (!isNotificationRead(notification)) {
            try {
                await markNotificationAsRead(notification.id);

                setNotifications((current) =>
                    current.map((item) =>
                        item.id === notification.id
                            ? {
                                ...item,
                                read: true,
                                isRead: true,
                                status: 'READ',
                                readAt: new Date().toISOString(),
                            }
                            : item,
                    ),
                );
            } catch {
                // Không chặn drawer nếu mark read lỗi.
            }
        }
    };

    const handleMarkRead = async (notification: UserNotification) => {
        try {
            setSaving(true);

            await markNotificationAsRead(notification.id);

            setNotifications((current) =>
                current.map((item) =>
                    item.id === notification.id
                        ? {
                            ...item,
                            read: true,
                            isRead: true,
                            status: 'READ',
                            readAt: new Date().toISOString(),
                        }
                        : item,
                ),
            );

            message.success('Đã đánh dấu thông báo là đã đọc.');
        } catch (err) {
            message.error(
                err instanceof Error
                    ? err.message
                    : 'Không thể đánh dấu đã đọc.',
            );
        } finally {
            setSaving(false);
        }
    };

    const handleMarkAllRead = async () => {
        try {
            setSaving(true);

            await markAllNotificationsAsRead();

            setNotifications((current) =>
                current.map((item) => ({
                    ...item,
                    read: true,
                    isRead: true,
                    status: 'READ',
                    readAt: item.readAt || new Date().toISOString(),
                })),
            );

            message.success('Đã đánh dấu tất cả thông báo là đã đọc.');
        } catch (err) {
            message.error(
                err instanceof Error
                    ? err.message
                    : 'Không thể đánh dấu tất cả đã đọc.',
            );
        } finally {
            setSaving(false);
        }
    };

    const handleReset = () => {
        const nextFilter: NotificationFilter = {
            keyword: '',
            status: 'ALL',
            page: 0,
            size: 100,
        };

        setFilter(nextFilter);
        loadNotifications(nextFilter);
    };

    const columns: ColumnsType<UserNotification> = [
        {
            title: 'Thông báo',
            key: 'notification',
            render: (_, record) => {
                const read = isNotificationRead(record);
                const severity = getSeverityMeta(record.severity);

                return (
                    <Space direction="vertical" size={4}>
                        <Space wrap>
                            {!read && <Tag color="blue">Mới</Tag>}
                            <Tag color={severity.color}>{severity.label}</Tag>
                            <Tag>
                                {getNotificationTypeLabel(
                                    record.type || record.category,
                                )}
                            </Tag>
                        </Space>

                        <strong>{getNotificationTitle(record)}</strong>

                        <span className={styles.mutedText}>
                            {getNotificationMessage(record)}
                        </span>
                    </Space>
                );
            },
        },
        {
            title: 'Trạng thái',
            key: 'status',
            width: 130,
            render: (_, record) =>
                isNotificationRead(record) ? (
                    <Tag color="green">Đã đọc</Tag>
                ) : (
                    <Tag color="orange">Chưa đọc</Tag>
                ),
        },
        {
            title: 'Thời gian',
            key: 'time',
            width: 190,
            render: (_, record) => formatDateTime(getNotificationTime(record)),
        },
        {
            title: 'Thao tác',
            key: 'actions',
            width: 220,
            fixed: 'right',
            render: (_, record) => (
                <Space wrap>
                    <Button
                        size="small"
                        icon={<EyeOutlined />}
                        onClick={() => openDetail(record)}
                    >
                        Chi tiết
                    </Button>

                    {!isNotificationRead(record) && (
                        <Button
                            size="small"
                            icon={<CheckCircleOutlined />}
                            loading={saving}
                            onClick={() => handleMarkRead(record)}
                        >
                            Đã đọc
                        </Button>
                    )}
                </Space>
            ),
        },
    ];

    if (authLoading || !session) {
        return <Skeleton active paragraph={{ rows: 8 }} />;
    }

    return (
        <DashboardFrame
            session={session}
            title="Thông báo"
            subtitle="Theo dõi các cập nhật quan trọng liên quan đến lịch hẹn, hồ sơ và hệ thống"
        >
            <div className={styles.roleDashboard}>
                {/* {error && (
                    <Alert
                        type="error"
                        showIcon
                        message="Không thể tải thông báo"
                        description={error}
                    />
                )} */}

                <section className={styles.heroCard}>
                    <div>
                        <span>Notification Center</span>
                        <h2>Trung tâm thông báo cá nhân.</h2>
                        <p>
                            Tất cả cập nhật quan trọng từ hệ thống sẽ được gom về
                            đây: lịch hẹn, yêu cầu đặt lịch, đơn thuốc, hồ sơ y tế
                            và các cảnh báo vận hành.
                        </p>
                    </div>

                    <div className={styles.pulseCard}>
                        <strong>{metrics.unread}</strong>
                        <span>thông báo chưa đọc</span>
                    </div>
                </section>

                <section className={styles.metricGrid}>
                    <Card className={styles.metricCard}>
                        <Statistic
                            title="Tổng thông báo"
                            value={metrics.total}
                            prefix={<BellOutlined />}
                        />
                        <p>Tất cả thông báo trong tài khoản.</p>
                    </Card>

                    <Card className={styles.metricCard}>
                        <Statistic
                            title="Chưa đọc"
                            value={metrics.unread}
                            prefix={<WarningOutlined />}
                        />
                        <p>Cần kiểm tra để không bỏ lỡ cập nhật.</p>
                    </Card>

                    <Card className={styles.metricCard}>
                        <Statistic
                            title="Đã đọc"
                            value={metrics.read}
                            prefix={<CheckCircleOutlined />}
                        />
                        <p>Thông báo đã được xử lý.</p>
                    </Card>

                    <Card className={styles.metricCard}>
                        <Statistic
                            title="Quan trọng"
                            value={metrics.important}
                            prefix={<FileTextOutlined />}
                        />
                        <p>Các thông báo có mức độ ưu tiên cao.</p>
                    </Card>
                </section>

                <Card
                    className={styles.detailCard}
                    title="Danh sách thông báo"
                    extra={
                        <Space>
                            <Button
                                icon={<CheckCircleOutlined />}
                                loading={saving}
                                onClick={handleMarkAllRead}
                                disabled={metrics.unread === 0}
                            >
                                Đánh dấu tất cả đã đọc
                            </Button>

                            <Button
                                icon={<ReloadOutlined />}
                                loading={loading}
                                onClick={() => loadNotifications()}
                            >
                                Làm mới
                            </Button>
                        </Space>
                    }
                >
                    <div className={styles.toolbar}>
                        <Input
                            allowClear
                            prefix={<SearchOutlined />}
                            placeholder="Tìm theo tiêu đề, nội dung hoặc loại thông báo"
                            value={filter.keyword}
                            onChange={(event) =>
                                setFilter((current) => ({
                                    ...current,
                                    keyword: event.target.value,
                                }))
                            }
                            onPressEnter={() => loadNotifications()}
                        />

                        <Select
                            value={filter.status}
                            options={statusOptions}
                            style={{ minWidth: 180 }}
                            onChange={(value) =>
                                setFilter((current) => ({
                                    ...current,
                                    status: value,
                                }))
                            }
                        />

                        <Button
                            type="primary"
                            icon={<SearchOutlined />}
                            onClick={() => loadNotifications()}
                        >
                            Lọc
                        </Button>

                        <Button icon={<ReloadOutlined />} onClick={handleReset}>
                            Đặt lại
                        </Button>
                    </div>

                    {filteredNotifications.length === 0 && !loading ? (
                        <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description="Không có thông báo phù hợp"
                        />
                    ) : (
                        <Table
                            rowKey="id"
                            loading={loading}
                            columns={columns}
                            dataSource={filteredNotifications}
                            pagination={{
                                pageSize: 10,
                                showSizeChanger: false,
                            }}
                            scroll={{ x: 980 }}
                        />
                    )}
                </Card>
            </div>

            <Drawer
                title="Chi tiết thông báo"
                open={openDetailDrawer}
                width={620}
                onClose={() => setOpenDetailDrawer(false)}
                extra={
                    selectedNotification &&
                    (selectedNotification.linkUrl ||
                        selectedNotification.actionUrl) && (
                        <Link
                            href={
                                selectedNotification.linkUrl ||
                                selectedNotification.actionUrl ||
                                '#'
                            }
                        >
                            <Button type="primary" icon={<LinkOutlined />}>
                                Mở liên kết
                            </Button>
                        </Link>
                    )
                }
            >
                {selectedNotification && (
                    <Descriptions
                        bordered
                        column={1}
                        size="small"
                        title={getNotificationTitle(selectedNotification)}
                    >
                        <Descriptions.Item label="Nội dung">
                            {getNotificationMessage(selectedNotification)}
                        </Descriptions.Item>

                        <Descriptions.Item label="Loại thông báo">
                            <Tag>
                                {getNotificationTypeLabel(
                                    selectedNotification.type ||
                                    selectedNotification.category,
                                )}
                            </Tag>
                        </Descriptions.Item>

                        <Descriptions.Item label="Mức độ">
                            <Tag
                                color={
                                    getSeverityMeta(selectedNotification.severity)
                                        .color
                                }
                            >
                                {
                                    getSeverityMeta(selectedNotification.severity)
                                        .label
                                }
                            </Tag>
                        </Descriptions.Item>

                        <Descriptions.Item label="Trạng thái">
                            {isNotificationRead(selectedNotification) ? (
                                <Tag color="green">Đã đọc</Tag>
                            ) : (
                                <Tag color="orange">Chưa đọc</Tag>
                            )}
                        </Descriptions.Item>

                        <Descriptions.Item label="Thời gian tạo">
                            {formatDateTime(
                                getNotificationTime(selectedNotification),
                            )}
                        </Descriptions.Item>

                        <Descriptions.Item label="Thời gian đọc">
                            {formatDateTime(selectedNotification.readAt)}
                        </Descriptions.Item>

                        <Descriptions.Item label="Người liên quan">
                            {selectedNotification.actorName ||
                                selectedNotification.actorEmail ||
                                'Không có'}
                        </Descriptions.Item>
                    </Descriptions>
                )}
            </Drawer>
        </DashboardFrame>
    );
}