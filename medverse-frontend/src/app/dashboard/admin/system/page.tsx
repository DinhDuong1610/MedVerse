'use client';

import {
    AuditOutlined,
    BellOutlined,
    CalendarOutlined,
    DatabaseOutlined,
    MedicineBoxOutlined,
    UserOutlined,
} from '@ant-design/icons';
import { Card, Tag } from 'antd';
import { useEffect, useState } from 'react';
import DashboardFrame from '../../_components/DashboardFrame';
import ClinicalPageState from '../../_components/ClinicalPageState';
import MetricCard from '../../_components/MetricCard';
import RoleGuardState from '../../_components/RoleGuardState';
import { useAuthSession } from '@/lib/auth/use-auth-session';
import { getAdminSystemSummary } from '@/services/admin-system.service';
import type { AdminSystemSummary } from '@/types/clinical';
import styles from '../../dashboard.module.scss';

export default function AdminSystemPage() {
    const { session, loading: authLoading } = useAuthSession();

    const [summary, setSummary] = useState<AdminSystemSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadSummary = async () => {
        try {
            setLoading(true);
            setError(null);

            const data = await getAdminSystemSummary();
            setSummary(data);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Không thể tải thống kê hệ thống.',
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!session) return;

        if (session.role !== 'ADMIN') {
            setLoading(false);
            return;
        }

        loadSummary();
    }, [session]);

    if (authLoading || !session) {
        return <ClinicalPageState loading>Loading</ClinicalPageState>;
    }

    return (
        <DashboardFrame
            session={session}
            title="Giám sát hệ thống"
            subtitle="Theo dõi trạng thái tổng quan của MedVerse"
        >
            <RoleGuardState session={session} allow={['ADMIN']}>
                <ClinicalPageState
                    loading={loading}
                    error={error}
                    empty={!summary}
                    emptyTitle="Chưa có dữ liệu hệ thống"
                    emptyDescription="Hệ thống chưa trả về dữ liệu summary. Hãy kiểm tra backend hoặc quyền Admin."
                >
                    {summary && (
                        <>
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

                            <Card
                                className={styles.detailCard}
                                style={{ marginTop: 24 }}
                            >
                                <div className={styles.panelHeader}>
                                    <div>
                                        <span>Runtime</span>
                                        <h2>Trạng thái hệ thống</h2>
                                    </div>

                                    <DatabaseOutlined
                                        style={{
                                            fontSize: 28,
                                            color: '#19b6a4',
                                        }}
                                    />
                                </div>

                                <p>
                                    Backend:{' '}
                                    <Tag
                                        color={
                                            summary.backendStatus === 'UP'
                                                ? 'green'
                                                : 'red'
                                        }
                                    >
                                        {summary.backendStatus}
                                    </Tag>
                                </p>

                                <p>
                                    Database:{' '}
                                    <Tag
                                        color={
                                            summary.databaseStatus === 'UP'
                                                ? 'green'
                                                : 'red'
                                        }
                                    >
                                        {summary.databaseStatus}
                                    </Tag>
                                </p>

                                <p style={{ color: '#6a7c7a', lineHeight: 1.7 }}>
                                    Đây là system summary cấp MVP. Các chỉ số sâu
                                    hơn như CPU, RAM, request latency có thể tích
                                    hợp ở task sau bằng Spring Boot Actuator,
                                    Prometheus hoặc Grafana.
                                </p>
                            </Card>
                        </>
                    )}
                </ClinicalPageState>
            </RoleGuardState>
        </DashboardFrame>
    );
}