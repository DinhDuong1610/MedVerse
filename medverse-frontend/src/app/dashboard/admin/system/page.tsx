'use client';

import {
    AuditOutlined,
    BellOutlined,
    CalendarOutlined,
    DatabaseOutlined,
    MedicineBoxOutlined,
    UserOutlined,
} from '@ant-design/icons';
import { Card, Skeleton, Tag } from 'antd';
import { useEffect, useState } from 'react';
import DashboardFrame from '../../_components/DashboardFrame';
import MetricCard from '../../_components/MetricCard';
import { useAuthSession } from '@/lib/auth/use-auth-session';
import { getAdminSystemSummary } from '@/services/admin-system.service';
import type { AdminSystemSummary } from '@/types/clinical';
import styles from '../../dashboard.module.scss';

export default function AdminSystemPage() {
    const { session, loading: authLoading } = useAuthSession();

    const [summary, setSummary] = useState<AdminSystemSummary | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            const data = await getAdminSystemSummary();
            setSummary(data);
            setLoading(false);
        }

        if (session?.role === 'ADMIN') {
            load();
        }
    }, [session]);

    if (authLoading || !session || loading || !summary) {
        return <Skeleton active paragraph={{ rows: 8 }} />;
    }

    return (
        <DashboardFrame
            session={session}
            title="Giám sát hệ thống"
            subtitle="Theo dõi trạng thái tổng quan của MedVerse"
        >
            <section className={styles.metricGrid}>
                <MetricCard
                    label="Users"
                    value={summary.userCount}
                    caption="Tổng tài khoản"
                    icon={<UserOutlined />}
                />

                <MetricCard
                    label="Audit logs"
                    value={summary.auditLogCount}
                    caption="Nhật ký hệ thống"
                    icon={<AuditOutlined />}
                />

                <MetricCard
                    label="Notifications"
                    value={summary.notificationCount}
                    caption="Thông báo đã tạo"
                    icon={<BellOutlined />}
                />

                <MetricCard
                    label="Medications"
                    value={summary.medicationCount}
                    caption="Danh mục thuốc"
                    icon={<MedicineBoxOutlined />}
                />

                <MetricCard
                    label="Appointments"
                    value={summary.appointmentCount}
                    caption="Lịch hẹn"
                    icon={<CalendarOutlined />}
                />
            </section>

            <Card className={styles.detailCard}>
                <div className={styles.panelHeader}>
                    <div>
                        <span>Runtime</span>
                        <h2>Trạng thái hệ thống</h2>
                    </div>
                </div>

                <p>
                    Backend:{' '}
                    <Tag color={summary.backendStatus === 'UP' ? 'green' : 'red'}>
                        {summary.backendStatus}
                    </Tag>
                </p>

                <p>
                    Database:{' '}
                    <Tag color={summary.databaseStatus === 'UP' ? 'green' : 'red'}>
                        {summary.databaseStatus}
                    </Tag>
                </p>

                <p style={{ color: '#6a7c7a' }}>
                    Đây là system summary cấp MVP. Các chỉ số sâu hơn như CPU, RAM,
                    request latency có thể tích hợp ở task sau bằng Actuator/Prometheus.
                </p>
            </Card>
        </DashboardFrame>
    );
}