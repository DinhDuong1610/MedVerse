'use client';

import {
    Alert,
    Button,
    Card,
    List,
    Progress,
    Space,
    Statistic,
    Tag,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';
import ClinicalEmptyState from '../../_components/ClinicalEmptyState';
import ClinicalPageState from '../../_components/ClinicalPageState';
import DashboardFrame from '../../_components/DashboardFrame';
import RoleGuardState from '../../_components/RoleGuardState';
import { useAuthSession } from '@/lib/auth/use-auth-session';
import { getAdminOperationsSummary } from '@/services/admin-operations.service';
import type {
    AdminOperationalWarning,
    AdminOperationsSummary,
} from '@/types/admin-operations';
import styles from '../../dashboard.module.scss';

function safePercent(value: number, total: number) {
    if (!total || total <= 0) return 0;

    return Math.round((value / total) * 100);
}

function getWarningColor(severity?: string) {
    if (severity === 'CRITICAL' || severity === 'HIGH') {
        return 'red';
    }

    if (severity === 'MEDIUM') {
        return 'orange';
    }

    return 'blue';
}

function getWarningTypeLabel(type?: string) {
    if (type === 'APPOINTMENT_REQUEST') return 'Yêu cầu đặt lịch';
    if (type === 'DOCTOR_PROFILE') return 'Hồ sơ bác sĩ';
    if (type === 'APPOINTMENT') return 'Lịch hẹn';
    if (type === 'PRESCRIPTION') return 'Đơn thuốc';

    return type || 'Cảnh báo';
}

function OperationMetricCard({
    title,
    value,
    caption,
}: {
    title: string;
    value: number;
    caption: string;
}) {
    return (
        <Card className={styles.metricCard}>
            <Statistic title={title} value={value} />
            <p style={{ marginBottom: 0, color: '#6a7c7a' }}>{caption}</p>
        </Card>
    );
}

function WarningList({ warnings }: { warnings: AdminOperationalWarning[] }) {
    if (!warnings.length) {
        return (
            <ClinicalEmptyState
                title="Không có cảnh báo vận hành"
                description="Hiện tại hệ thống chưa ghi nhận vấn đề nổi bật cần admin xử lý."
            />
        );
    }

    return (
        <List
            dataSource={warnings}
            renderItem={(warning) => (
                <List.Item className={styles.cleanListItem}>
                    <List.Item.Meta
                        title={
                            <div className={styles.listTitle}>
                                <strong>{warning.title}</strong>

                                <Space wrap>
                                    <Tag color={getWarningColor(warning.severity)}>
                                        {warning.severity}
                                    </Tag>

                                    <Tag>{getWarningTypeLabel(warning.type)}</Tag>

                                    <Tag color="purple">
                                        {warning.count} mục
                                    </Tag>
                                </Space>
                            </div>
                        }
                        description={
                            <div>
                                <p>{warning.message}</p>
                            </div>
                        }
                    />

                    {warning.href && (
                        <Button href={warning.href} type="primary" ghost>
                            Xử lý
                        </Button>
                    )}
                </List.Item>
            )}
        />
    );
}

export default function AdminOperationsPage() {
    const { session, loading: authLoading } = useAuthSession();

    const [summary, setSummary] = useState<AdminOperationsSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadSummary = async () => {
        try {
            setLoading(true);
            setError(null);

            const data = await getAdminOperationsSummary();
            setSummary(data);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Không thể tải dashboard vận hành.',
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!session) return;

        if (session.role !== 'ADMIN' && session.primaryRole !== 'ADMIN') {
            setLoading(false);
            return;
        }

        loadSummary();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session]);

    const doctorProfileCompleteness = useMemo(() => {
        if (!summary) return 0;

        return safePercent(
            summary.doctorQuality.completeProfile,
            summary.doctorQuality.totalDoctors,
        );
    }, [summary]);

    const appointmentCompletionRate = useMemo(() => {
        if (!summary) return 0;

        return safePercent(
            summary.appointmentBreakdown.completed,
            summary.appointmentBreakdown.total,
        );
    }, [summary]);

    const prescriptionFinalizedRate = useMemo(() => {
        if (!summary) return 0;

        return safePercent(
            summary.prescriptionBreakdown.finalized,
            summary.prescriptionBreakdown.total,
        );
    }, [summary]);

    if (authLoading || !session) {
        return <ClinicalPageState loading>Loading</ClinicalPageState>;
    }

    return (
        <DashboardFrame
            session={session}
            title="Dashboard vận hành"
            subtitle="Theo dõi nhanh hoạt động hệ thống, lịch hẹn, bác sĩ, đơn thuốc và cảnh báo dữ liệu"
        >
            <RoleGuardState session={session} allow={['ADMIN']}>
                {error && (
                    <Alert
                        type="error"
                        showIcon
                        message="Không thể tải dashboard vận hành"
                        description={error}
                        style={{ marginBottom: 20 }}
                    />
                )}

                <ClinicalPageState
                    loading={loading}
                    empty={!summary}
                    emptyTitle="Chưa có dữ liệu vận hành"
                    emptyDescription="Backend chưa trả về dữ liệu operations summary."
                >
                    {summary && (
                        <>
                            <section className={styles.metricGrid}>
                                <OperationMetricCard
                                    title="Users"
                                    value={summary.overview.totalUsers}
                                    caption="Tổng tài khoản"
                                />

                                <OperationMetricCard
                                    title="Doctors"
                                    value={summary.overview.totalDoctors}
                                    caption="Tổng bác sĩ"
                                />

                                <OperationMetricCard
                                    title="Patients"
                                    value={summary.overview.totalPatients}
                                    caption="Tổng bệnh nhân"
                                />

                                <OperationMetricCard
                                    title="Appointments"
                                    value={summary.overview.totalAppointments}
                                    caption="Tổng lịch hẹn"
                                />
                            </section>

                            <section
                                className={styles.detailGrid}
                                style={{ marginTop: 24 }}
                            >
                                <Card
                                    className={styles.detailCard}
                                    title="Chất lượng hồ sơ bác sĩ"
                                    extra={
                                        <Button
                                            href="/dashboard/admin/doctors"
                                            type="link"
                                        >
                                            Quản lý bác sĩ
                                        </Button>
                                    }
                                >
                                    <Progress
                                        percent={doctorProfileCompleteness}
                                        status={
                                            doctorProfileCompleteness >= 80
                                                ? 'success'
                                                : 'active'
                                        }
                                    />

                                    <div className={styles.profileMatrix}>
                                        <div>
                                            <span>Tổng bác sĩ</span>
                                            <strong>
                                                {
                                                    summary.doctorQuality
                                                        .totalDoctors
                                                }
                                            </strong>
                                        </div>

                                        <div>
                                            <span>Hồ sơ đầy đủ</span>
                                            <strong>
                                                {
                                                    summary.doctorQuality
                                                        .completeProfile
                                                }
                                            </strong>
                                        </div>

                                        <div>
                                            <span>Thiếu chuyên khoa</span>
                                            <strong>
                                                {
                                                    summary.doctorQuality
                                                        .missingSpecialty
                                                }
                                            </strong>
                                        </div>

                                        <div>
                                            <span>Thiếu giấy phép</span>
                                            <strong>
                                                {
                                                    summary.doctorQuality
                                                        .missingLicense
                                                }
                                            </strong>
                                        </div>
                                    </div>
                                </Card>

                                <Card
                                    className={styles.detailCard}
                                    title="Tình hình lịch hẹn"
                                    extra={
                                        <Button
                                            href="/dashboard/receptionist/appointments"
                                            type="link"
                                        >
                                            Xem lịch hẹn
                                        </Button>
                                    }
                                >
                                    <Progress
                                        percent={appointmentCompletionRate}
                                        status={
                                            appointmentCompletionRate >= 70
                                                ? 'success'
                                                : 'active'
                                        }
                                    />

                                    <div className={styles.profileMatrix}>
                                        <div>
                                            <span>Hôm nay</span>
                                            <strong>
                                                {
                                                    summary.appointmentBreakdown
                                                        .today
                                                }
                                            </strong>
                                        </div>

                                        <div>
                                            <span>7 ngày tới</span>
                                            <strong>
                                                {
                                                    summary.appointmentBreakdown
                                                        .upcoming7Days
                                                }
                                            </strong>
                                        </div>

                                        <div>
                                            <span>Scheduled</span>
                                            <strong>
                                                {
                                                    summary.appointmentBreakdown
                                                        .scheduled
                                                }
                                            </strong>
                                        </div>

                                        <div>
                                            <span>Confirmed</span>
                                            <strong>
                                                {
                                                    summary.appointmentBreakdown
                                                        .confirmed
                                                }
                                            </strong>
                                        </div>

                                        <div>
                                            <span>Completed</span>
                                            <strong>
                                                {
                                                    summary.appointmentBreakdown
                                                        .completed
                                                }
                                            </strong>
                                        </div>

                                        <div>
                                            <span>No-show</span>
                                            <strong>
                                                {
                                                    summary.appointmentBreakdown
                                                        .noShow
                                                }
                                            </strong>
                                        </div>
                                    </div>
                                </Card>

                                <Card
                                    className={styles.detailCard}
                                    title="Yêu cầu đặt lịch"
                                    extra={
                                        <Button
                                            href="/dashboard/receptionist/requests"
                                            type="link"
                                        >
                                            Xử lý request
                                        </Button>
                                    }
                                >
                                    <div className={styles.profileMatrix}>
                                        <div>
                                            <span>Tổng request</span>
                                            <strong>
                                                {
                                                    summary
                                                        .appointmentRequestBreakdown
                                                        .total
                                                }
                                            </strong>
                                        </div>

                                        <div>
                                            <span>Pending</span>
                                            <strong>
                                                {
                                                    summary
                                                        .appointmentRequestBreakdown
                                                        .pending
                                                }
                                            </strong>
                                        </div>

                                        <div>
                                            <span>Approved</span>
                                            <strong>
                                                {
                                                    summary
                                                        .appointmentRequestBreakdown
                                                        .approved
                                                }
                                            </strong>
                                        </div>

                                        <div>
                                            <span>Rejected</span>
                                            <strong>
                                                {
                                                    summary
                                                        .appointmentRequestBreakdown
                                                        .rejected
                                                }
                                            </strong>
                                        </div>
                                    </div>
                                </Card>

                                <Card
                                    className={styles.detailCard}
                                    title="Đơn thuốc"
                                    extra={
                                        <Button
                                            href="/dashboard/doctor/prescriptions"
                                            type="link"
                                        >
                                            Xem đơn thuốc
                                        </Button>
                                    }
                                >
                                    <Progress
                                        percent={prescriptionFinalizedRate}
                                        status={
                                            prescriptionFinalizedRate >= 80
                                                ? 'success'
                                                : 'active'
                                        }
                                    />

                                    <div className={styles.profileMatrix}>
                                        <div>
                                            <span>Tổng đơn</span>
                                            <strong>
                                                {
                                                    summary.prescriptionBreakdown
                                                        .total
                                                }
                                            </strong>
                                        </div>

                                        <div>
                                            <span>Draft</span>
                                            <strong>
                                                {
                                                    summary.prescriptionBreakdown
                                                        .draft
                                                }
                                            </strong>
                                        </div>

                                        <div>
                                            <span>Finalized</span>
                                            <strong>
                                                {
                                                    summary.prescriptionBreakdown
                                                        .finalized
                                                }
                                            </strong>
                                        </div>

                                        <div>
                                            <span>Cancelled</span>
                                            <strong>
                                                {
                                                    summary.prescriptionBreakdown
                                                        .cancelled
                                                }
                                            </strong>
                                        </div>
                                    </div>
                                </Card>

                                <Card
                                    className={styles.detailCard}
                                    title="Tài khoản"
                                    extra={
                                        <Button
                                            href="/dashboard/admin/users"
                                            type="link"
                                        >
                                            Quản lý user
                                        </Button>
                                    }
                                >
                                    <div className={styles.profileMatrix}>
                                        <div>
                                            <span>Active</span>
                                            <strong>
                                                {summary.userBreakdown.active}
                                            </strong>
                                        </div>

                                        <div>
                                            <span>Locked</span>
                                            <strong>
                                                {summary.userBreakdown.locked}
                                            </strong>
                                        </div>

                                        <div>
                                            <span>Disabled</span>
                                            <strong>
                                                {summary.userBreakdown.disabled}
                                            </strong>
                                        </div>

                                        <div>
                                            <span>Pending</span>
                                            <strong>
                                                {
                                                    summary.userBreakdown
                                                        .pendingActivation
                                                }
                                            </strong>
                                        </div>
                                    </div>
                                </Card>

                                <Card
                                    className={styles.detailCard}
                                    title="Kho thuốc & danh mục"
                                >
                                    <div className={styles.profileMatrix}>
                                        <div>
                                            <span>Thuốc</span>
                                            <strong>
                                                {
                                                    summary.inventorySummary
                                                        .medicationCount
                                                }
                                            </strong>
                                        </div>

                                        <div>
                                            <span>Chuyên khoa</span>
                                            <strong>
                                                {
                                                    summary.overview
                                                        .totalSpecialties
                                                }
                                            </strong>
                                        </div>
                                    </div>

                                    <Space wrap style={{ marginTop: 16 }}>
                                        <Button href="/dashboard/admin/inventory">
                                            Kho thuốc
                                        </Button>

                                        <Button href="/dashboard/admin/specialties">
                                            Chuyên khoa
                                        </Button>
                                    </Space>
                                </Card>
                            </section>

                            <Card
                                className={styles.detailCard}
                                title="Cảnh báo vận hành"
                                style={{ marginTop: 24 }}
                                extra={
                                    <Button onClick={loadSummary}>
                                        Làm mới
                                    </Button>
                                }
                            >
                                <WarningList warnings={summary.warnings || []} />
                            </Card>
                        </>
                    )}
                </ClinicalPageState>
            </RoleGuardState>
        </DashboardFrame>
    );
}