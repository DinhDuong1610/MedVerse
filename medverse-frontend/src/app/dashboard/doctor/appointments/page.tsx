'use client';

import {
    Alert,
    Button,
    Card,
    DatePicker,
    List,
    Select,
    Skeleton,
    Space,
    Statistic,
    Tag,
} from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import ClinicalEmptyState from '../../_components/ClinicalEmptyState';
import ClinicalPageState from '../../_components/ClinicalPageState';
import DashboardFrame from '../../_components/DashboardFrame';
import RoleGuardState from '../../_components/RoleGuardState';
import StatusTag from '../../_components/StatusTag';
import { hasAnyPermission } from '@/lib/auth/roles';
import { useAuthSession } from '@/lib/auth/use-auth-session';
import { getAppointments } from '@/services/appointment.service';
import type { Appointment, AppointmentStatus } from '@/types/clinical';
import styles from '../../dashboard.module.scss';

type AppointmentStatusFilter = AppointmentStatus | 'ALL';

const statusOptions: Array<{
    value: AppointmentStatusFilter;
    label: string;
}> = [
        { value: 'ALL', label: 'Tất cả' },
        { value: 'SCHEDULED', label: 'SCHEDULED' },
        { value: 'CONFIRMED', label: 'CONFIRMED' },
        { value: 'COMPLETED', label: 'COMPLETED' },
        { value: 'CANCELLED', label: 'CANCELLED' },
        { value: 'NO_SHOW', label: 'NO_SHOW' },
    ];

function getDayRange(date: Dayjs) {
    return {
        from: date.startOf('day').toISOString(),
        to: date.endOf('day').toISOString(),
    };
}

function formatDateTime(value?: string) {
    if (!value) return 'Chưa rõ';

    return new Date(value).toLocaleString('vi-VN');
}

function formatTime(value?: string) {
    if (!value) return 'Chưa rõ';

    return new Date(value).toLocaleTimeString('vi-VN');
}

function getAppointmentHint(appointment: Appointment) {
    switch (appointment.status) {
        case 'SCHEDULED':
            return 'Lịch đã được tạo. Bác sĩ có thể chuẩn bị hồ sơ trước khi khám.';
        case 'CONFIRMED':
            return 'Lịch đã xác nhận. Có thể mở ca khám để cập nhật bệnh án.';
        case 'COMPLETED':
            return 'Ca khám đã hoàn tất.';
        case 'CANCELLED':
            return 'Lịch hẹn đã bị hủy.';
        case 'NO_SHOW':
            return 'Bệnh nhân không đến khám.';
        default:
            return 'Lịch khám của bác sĩ.';
    }
}

function canOpenClinicalCase(appointment: Appointment) {
    return ['SCHEDULED', 'CONFIRMED', 'COMPLETED'].includes(
        appointment.status,
    );
}

export default function DoctorAppointmentsPage() {
    const { session, loading: authLoading } = useAuthSession();

    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());
    const [status, setStatus] = useState<AppointmentStatusFilter>('ALL');

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const canReadAppointments = hasAnyPermission(session, [
        'APPOINTMENT:READ_ANY',
    ]);

    const loadAppointments = async (
        nextDate = selectedDate,
        nextStatus = status,
    ) => {
        if (!session?.userId) {
            setError('Không tìm thấy userId trong session.');
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const { from, to } = getDayRange(nextDate);

            const page = await getAppointments({
                doctorId: session.userId,
                from,
                to,
                status: nextStatus,
                size: 100,
            });

            const sorted = [...(page.content || [])].sort((a, b) =>
                String(a.startTime).localeCompare(String(b.startTime)),
            );

            setAppointments(sorted);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Không thể tải lịch khám của bác sĩ.',
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!session) return;

        if (!canReadAppointments) {
            setError('Tài khoản hiện tại không có quyền xem lịch khám.');
            setLoading(false);
            return;
        }

        loadAppointments();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session]);

    const metrics = useMemo(() => {
        const scheduled = appointments.filter(
            (item) => item.status === 'SCHEDULED',
        ).length;

        const confirmed = appointments.filter(
            (item) => item.status === 'CONFIRMED',
        ).length;

        const completed = appointments.filter(
            (item) => item.status === 'COMPLETED',
        ).length;

        const cancelled = appointments.filter(
            (item) => item.status === 'CANCELLED',
        ).length;

        const noShow = appointments.filter(
            (item) => item.status === 'NO_SHOW',
        ).length;

        return {
            total: appointments.length,
            scheduled,
            confirmed,
            completed,
            cancelled,
            noShow,
        };
    }, [appointments]);

    const handleDateChange = (value: Dayjs | null) => {
        const nextDate = value || dayjs();

        setSelectedDate(nextDate);
        loadAppointments(nextDate, status);
    };

    const handleStatusChange = (value: AppointmentStatusFilter) => {
        setStatus(value);
        loadAppointments(selectedDate, value);
    };

    if (authLoading || !session) {
        return <Skeleton active paragraph={{ rows: 8 }} />;
    }

    return (
        <DashboardFrame
            session={session}
            title="Lịch khám trong ngày"
            subtitle="Theo dõi lịch khám của bác sĩ và mở ca khám trực tiếp"
        >
            <RoleGuardState
                session={session}
                anyPermissions={['APPOINTMENT:READ_ANY']}
            >
                <section className={styles.metricGrid}>
                    <Card className={styles.metricCard}>
                        <Statistic title="Tổng lịch" value={metrics.total} />
                    </Card>

                    <Card className={styles.metricCard}>
                        <Statistic title="Scheduled" value={metrics.scheduled} />
                    </Card>

                    <Card className={styles.metricCard}>
                        <Statistic title="Confirmed" value={metrics.confirmed} />
                    </Card>

                    <Card className={styles.metricCard}>
                        <Statistic title="Completed" value={metrics.completed} />
                    </Card>
                </section>

                <Card className={styles.detailCard} style={{ marginTop: 24 }}>
                    <div className={styles.panelHeader}>
                        <div>
                            <span>Daily agenda</span>
                            <h2>Lịch khám của tôi</h2>
                            <p>
                                Chỉ hiển thị lịch hẹn của bác sĩ đang đăng nhập.
                                Bấm mở ca khám để cập nhật bệnh án, chẩn đoán,
                                kê đơn và AI safety.
                            </p>
                        </div>

                        <Space wrap>
                            <DatePicker
                                value={selectedDate}
                                onChange={handleDateChange}
                                allowClear={false}
                            />

                            <Select
                                value={status}
                                onChange={handleStatusChange}
                                options={statusOptions}
                                style={{ width: 170 }}
                            />

                            <Button onClick={() => loadAppointments()}>
                                Làm mới
                            </Button>
                        </Space>
                    </div>

                    {error && (
                        <Alert
                            type="error"
                            showIcon
                            message="Không thể tải lịch khám"
                            description={error}
                            style={{ marginBottom: 16 }}
                        />
                    )}

                    <ClinicalPageState loading={loading}>
                        {appointments.length === 0 ? (
                            <ClinicalEmptyState
                                title="Chưa có lịch khám"
                                description="Không tìm thấy lịch khám nào theo ngày và trạng thái hiện tại."
                            />
                        ) : (
                            <List
                                dataSource={appointments}
                                renderItem={(appointment) => (
                                    <List.Item className={styles.cleanListItem}>
                                        <List.Item.Meta
                                            title={
                                                <div className={styles.listTitle}>
                                                    <strong>
                                                        {formatDateTime(
                                                            appointment.startTime,
                                                        )}
                                                    </strong>

                                                    <Space wrap>
                                                        <StatusTag
                                                            value={
                                                                appointment.status
                                                            }
                                                        />

                                                        <Tag color="cyan">
                                                            {appointment.type ||
                                                                'OFFLINE'}
                                                        </Tag>
                                                    </Space>
                                                </div>
                                            }
                                            description={
                                                <div>
                                                    <p>
                                                        Bệnh nhân:{' '}
                                                        <b>
                                                            {appointment.patientName ||
                                                                'Bệnh nhân'}
                                                        </b>
                                                    </p>

                                                    <p>
                                                        Thời gian:{' '}
                                                        {formatDateTime(
                                                            appointment.startTime,
                                                        )}{' '}
                                                        →{' '}
                                                        {formatTime(
                                                            appointment.endTime,
                                                        )}
                                                    </p>

                                                    <p>
                                                        Ghi chú:{' '}
                                                        {appointment.diagnosis ||
                                                            getAppointmentHint(
                                                                appointment,
                                                            )}
                                                    </p>
                                                </div>
                                            }
                                        />

                                        <Space wrap>
                                            {canOpenClinicalCase(
                                                appointment,
                                            ) ? (
                                                <Link
                                                    href={`/dashboard/doctor/cases/${appointment.id}`}
                                                >
                                                    <Button type="primary">
                                                        Mở ca khám
                                                    </Button>
                                                </Link>
                                            ) : (
                                                <Button disabled>
                                                    Không thể mở ca
                                                </Button>
                                            )}
                                        </Space>
                                    </List.Item>
                                )}
                            />
                        )}
                    </ClinicalPageState>
                </Card>
            </RoleGuardState>
        </DashboardFrame>
    );
}