'use client';

import {
    AppstoreOutlined,
    AuditOutlined,
    CalendarOutlined,
    ClockCircleOutlined,
    FileProtectOutlined,
    MedicineBoxOutlined,
    SafetyCertificateOutlined,
    TeamOutlined,
    UserOutlined,
} from '@ant-design/icons';
import { Alert, Button, Card, List, Skeleton, Space, Statistic, Tag } from 'antd';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { DemoRole } from '@/types/auth';
import type {
    Appointment,
    AppointmentRequest,
} from '@/types/clinical';
import { getAppointmentRequests } from '@/services/appointment-request.service';
import { getAppointments } from '@/services/appointment.service';
import { getAdminOperationsSummary } from '@/services/admin-operations.service';
import type { AdminOperationsSummary } from '@/types/admin-operations';
import styles from '../dashboard.module.scss';

type Props = {
    role: DemoRole;
};

type ReceptionistData = {
    requests: AppointmentRequest[];
    appointments: Appointment[];
};

function formatDateTime(value?: string) {
    if (!value) return 'Chưa xác định';

    return new Date(value).toLocaleString('vi-VN');
}

function AdminDashboard() {
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
                    : 'Không thể tải dữ liệu vận hành.',
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSummary();
    }, []);

    if (loading) {
        return <Skeleton active paragraph={{ rows: 8 }} />;
    }

    return (
        <div className={styles.roleDashboard}>
            {error && (
                <Alert
                    type="error"
                    showIcon
                    message="Không thể tải dashboard quản trị"
                    description={error}
                    style={{ marginBottom: 20 }}
                />
            )}

            <section className={styles.heroCard}>
                <div>
                    <span>Quản trị hệ thống</span>
                    <h2>Kiểm soát vận hành phòng khám từ một trung tâm.</h2>
                    <p>
                        Theo dõi nhân sự, chuyên khoa, lịch hẹn, đơn thuốc, kho
                        thuốc và các cảnh báo quan trọng trong hệ thống.
                    </p>
                </div>

                <div className={styles.pulseCard}>
                    <strong>{summary?.warnings?.length || 0}</strong>
                    <span>cảnh báo cần theo dõi</span>
                </div>
            </section>

            <section className={styles.metricGrid}>
                <Card className={styles.metricCard}>
                    <Statistic
                        title="Tài khoản"
                        value={summary?.overview.totalUsers || 0}
                        prefix={<UserOutlined />}
                    />
                    <p>Tổng người dùng đang quản lý.</p>
                </Card>

                <Card className={styles.metricCard}>
                    <Statistic
                        title="Bác sĩ"
                        value={summary?.overview.totalDoctors || 0}
                        prefix={<TeamOutlined />}
                    />
                    <p>Đội ngũ bác sĩ trong hệ thống.</p>
                </Card>

                <Card className={styles.metricCard}>
                    <Statistic
                        title="Lịch hẹn"
                        value={summary?.overview.totalAppointments || 0}
                        prefix={<CalendarOutlined />}
                    />
                    <p>Tổng lịch hẹn đã ghi nhận.</p>
                </Card>

                <Card className={styles.metricCard}>
                    <Statistic
                        title="Thuốc"
                        value={summary?.overview.totalMedications || 0}
                        prefix={<MedicineBoxOutlined />}
                    />
                    <p>Danh mục thuốc phục vụ kê đơn.</p>
                </Card>
            </section>

            <section className={styles.detailGrid} style={{ marginTop: 24 }}>
                <Card
                    className={styles.detailCard}
                    title="Tác vụ quản trị"
                >
                    <div className={styles.quickActionGrid}>
                        <Link href="/dashboard/admin/operations">
                            <Button block icon={<AppstoreOutlined />}>
                                Dashboard vận hành
                            </Button>
                        </Link>

                        <Link href="/dashboard/admin/users">
                            <Button block icon={<UserOutlined />}>
                                Quản lý người dùng
                            </Button>
                        </Link>

                        <Link href="/dashboard/admin/access-control">
                            <Button block icon={<SafetyCertificateOutlined />}>
                                Phân quyền
                            </Button>
                        </Link>

                        <Link href="/dashboard/admin/audit-logs">
                            <Button block icon={<AuditOutlined />}>
                                Audit Logs
                            </Button>
                        </Link>
                    </div>
                </Card>

                <Card
                    className={styles.detailCard}
                    title="Chất lượng dữ liệu"
                >
                    <List
                        dataSource={[
                            {
                                label: 'Bác sĩ thiếu chuyên khoa',
                                value: summary?.doctorQuality.missingSpecialty || 0,
                                href: '/dashboard/admin/doctors',
                            },
                            {
                                label: 'Bác sĩ thiếu giấy phép',
                                value: summary?.doctorQuality.missingLicense || 0,
                                href: '/dashboard/admin/doctors',
                            },
                            {
                                label: 'Yêu cầu đặt lịch chờ xử lý',
                                value:
                                    summary?.appointmentRequestBreakdown.pending ||
                                    0,
                                href: '/dashboard/receptionist/requests',
                            },
                            {
                                label: 'Đơn thuốc còn nháp',
                                value: summary?.prescriptionBreakdown.draft || 0,
                                href: '/dashboard/doctor/prescriptions',
                            },
                        ]}
                        renderItem={(item) => (
                            <List.Item className={styles.cleanListItem}>
                                <List.Item.Meta
                                    title={
                                        <div className={styles.listTitle}>
                                            <strong>{item.label}</strong>
                                            <Tag
                                                color={
                                                    item.value > 0
                                                        ? 'orange'
                                                        : 'green'
                                                }
                                            >
                                                {item.value}
                                            </Tag>
                                        </div>
                                    }
                                    description={
                                        item.value > 0
                                            ? 'Nên kiểm tra để đảm bảo dữ liệu vận hành đầy đủ.'
                                            : 'Không có vấn đề cần xử lý.'
                                    }
                                />

                                <Link href={item.href}>
                                    <Button type="link">Xem</Button>
                                </Link>
                            </List.Item>
                        )}
                    />
                </Card>
            </section>
        </div>
    );
}

function ReceptionistDashboard() {
    const [data, setData] = useState<ReceptionistData>({
        requests: [],
        appointments: [],
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadDashboard = async () => {
        try {
            setLoading(true);
            setError(null);

            const [requestPage, appointmentPage] = await Promise.all([
                getAppointmentRequests('ALL'),
                getAppointments({ size: 20 }),
            ]);

            setData({
                requests: requestPage.content || [],
                appointments: appointmentPage.content || [],
            });
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Không thể tải dữ liệu lễ tân.',
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDashboard();
    }, []);

    const pendingRequests = useMemo(
        () => data.requests.filter((item) => item.status === 'PENDING'),
        [data.requests],
    );

    const todayAppointments = useMemo(() => {
        const today = new Date().toISOString().slice(0, 10);

        return data.appointments.filter((item) =>
            String(item.startTime || '').startsWith(today),
        );
    }, [data.appointments]);

    if (loading) {
        return <Skeleton active paragraph={{ rows: 8 }} />;
    }

    return (
        <div className={styles.roleDashboard}>
            {error && (
                <Alert
                    type="error"
                    showIcon
                    message="Không thể tải dashboard lễ tân"
                    description={error}
                    style={{ marginBottom: 20 }}
                />
            )}

            <section className={styles.heroCard}>
                <div>
                    <span>Điều phối tiếp nhận</span>
                    <h2>Theo dõi yêu cầu đặt lịch và lịch hẹn trong ngày.</h2>
                    <p>
                        Lễ tân có thể xử lý yêu cầu mới, điều phối slot bác sĩ,
                        theo dõi lịch hẹn và hỗ trợ bệnh nhân khi cần thay đổi
                        lịch khám.
                    </p>
                </div>

                <div className={styles.pulseCard}>
                    <strong>{pendingRequests.length}</strong>
                    <span>yêu cầu đang chờ</span>
                </div>
            </section>

            <section className={styles.metricGrid}>
                <Card className={styles.metricCard}>
                    <Statistic
                        title="Yêu cầu chờ"
                        value={pendingRequests.length}
                        prefix={<ClockCircleOutlined />}
                    />
                    <p>Cần xác nhận hoặc từ chối.</p>
                </Card>

                <Card className={styles.metricCard}>
                    <Statistic
                        title="Lịch hôm nay"
                        value={todayAppointments.length}
                        prefix={<CalendarOutlined />}
                    />
                    <p>Lịch khám cần theo dõi trong ngày.</p>
                </Card>

                <Card className={styles.metricCard}>
                    <Statistic
                        title="Tổng yêu cầu"
                        value={data.requests.length}
                        prefix={<FileProtectOutlined />}
                    />
                    <p>Các yêu cầu gần đây.</p>
                </Card>

                <Card className={styles.metricCard}>
                    <Statistic
                        title="Tổng lịch hẹn"
                        value={data.appointments.length}
                        prefix={<CalendarOutlined />}
                    />
                    <p>Lịch hẹn trong phạm vi truy cập.</p>
                </Card>
            </section>

            <section className={styles.detailGrid} style={{ marginTop: 24 }}>
                <Card
                    className={styles.detailCard}
                    title="Yêu cầu cần xử lý"
                    extra={
                        <Link href="/dashboard/receptionist/requests">
                            <Button type="link">Xem tất cả</Button>
                        </Link>
                    }
                >
                    {pendingRequests.length === 0 ? (
                        <p className={styles.mutedText}>
                            Hiện không có yêu cầu đặt lịch đang chờ xử lý.
                        </p>
                    ) : (
                        <List
                            dataSource={pendingRequests.slice(0, 5)}
                            renderItem={(item) => (
                                <List.Item className={styles.cleanListItem}>
                                    <List.Item.Meta
                                        title={
                                            <div className={styles.listTitle}>
                                                <strong>
                                                    {item.patientName ||
                                                        'Bệnh nhân'}
                                                </strong>
                                                <Tag color="orange">
                                                    {item.status}
                                                </Tag>
                                            </div>
                                        }
                                        description={
                                            <>
                                                {item.specialtyName ||
                                                    'Chuyên khoa chưa rõ'}{' '}
                                                ·{' '}
                                                {item.desiredDate ||
                                                    'Chưa chọn ngày'}{' '}
                                                {item.desiredTime || ''}
                                            </>
                                        }
                                    />

                                    <Link href="/dashboard/receptionist/requests">
                                        <Button type="primary" ghost>
                                            Xử lý
                                        </Button>
                                    </Link>
                                </List.Item>
                            )}
                        />
                    )}
                </Card>

                <Card
                    className={styles.detailCard}
                    title="Lịch hẹn hôm nay"
                    extra={
                        <Link href="/dashboard/receptionist/appointments">
                            <Button type="link">Xem lịch</Button>
                        </Link>
                    }
                >
                    {todayAppointments.length === 0 ? (
                        <p className={styles.mutedText}>
                            Chưa có lịch hẹn nào trong hôm nay.
                        </p>
                    ) : (
                        <List
                            dataSource={todayAppointments.slice(0, 5)}
                            renderItem={(item) => (
                                <List.Item className={styles.cleanListItem}>
                                    <List.Item.Meta
                                        title={
                                            <div className={styles.listTitle}>
                                                <strong>
                                                    {item.patientName ||
                                                        'Bệnh nhân'}
                                                </strong>
                                                <Tag color="blue">
                                                    {item.status}
                                                </Tag>
                                            </div>
                                        }
                                        description={
                                            <>
                                                {formatDateTime(item.startTime)} ·{' '}
                                                {item.doctorName ||
                                                    'Bác sĩ chưa rõ'}
                                            </>
                                        }
                                    />
                                </List.Item>
                            )}
                        />
                    )}
                </Card>
            </section>
        </div>
    );
}

export default function StaffDashboardPlaceholder({ role }: Props) {
    if (role === 'ADMIN') {
        return <AdminDashboard />;
    }

    return <ReceptionistDashboard />;
}