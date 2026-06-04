'use client';

import {
    AlertOutlined,
    AppstoreOutlined,
    AuditOutlined,
    CalendarOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    ExclamationCircleOutlined,
    FileProtectOutlined,
    MedicineBoxOutlined,
    SafetyCertificateOutlined,
    TeamOutlined,
    UserOutlined,
} from '@ant-design/icons';
import {
    Alert,
    Button,
    Card,
    List,
    Progress,
    Skeleton,
    Space,
    Statistic,
    Tag,
} from 'antd';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import DashboardFrame from '../../_components/DashboardFrame';
import RoleGuardState from '../../_components/RoleGuardState';
import { useAuthSession } from '@/lib/auth/use-auth-session';
import { getAdminOperationsSummary } from '@/services/admin-operations.service';
import type { AdminOperationsSummary } from '@/types/admin-operations';
import styles from '../../dashboard.module.scss';

type OperationItem = {
    label: string;
    value: number;
    description: string;
    href?: string;
    tone?: 'good' | 'warning' | 'danger' | 'neutral';
};

function percent(value: number, total: number) {
    if (!total || total <= 0) return 0;

    return Math.round((value / total) * 100);
}

function getToneColor(tone?: OperationItem['tone']) {
    if (tone === 'good') return 'green';
    if (tone === 'warning') return 'orange';
    if (tone === 'danger') return 'red';

    return 'blue';
}

function numberValue(value?: number | null) {
    return Number(value || 0);
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
                    : 'Không thể tải dữ liệu vận hành.',
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!session) return;

        loadSummary();
    }, [session]);

    const overview = summary?.overview;
    const userBreakdown = summary?.userBreakdown;
    const doctorQuality = summary?.doctorQuality;
    const appointmentBreakdown = summary?.appointmentBreakdown;
    const requestBreakdown = summary?.appointmentRequestBreakdown;
    const prescriptionBreakdown = summary?.prescriptionBreakdown;
    const inventorySummary = summary?.inventorySummary;

    const warningCount = summary?.warnings?.length || 0;

    const totalAppointments = numberValue(overview?.totalAppointments);
    const completedAppointments = numberValue(appointmentBreakdown?.completed);
    const cancelledAppointments = numberValue(appointmentBreakdown?.cancelled);
    const noShowAppointments = numberValue(appointmentBreakdown?.noShow);

    const appointmentCompletionRate = percent(
        completedAppointments,
        totalAppointments,
    );

    const operationalItems: OperationItem[] = useMemo(
        () => [
            {
                label: 'Yêu cầu đặt lịch chờ xử lý',
                value: numberValue(requestBreakdown?.pending),
                description:
                    'Các yêu cầu bệnh nhân đã gửi nhưng chưa được lễ tân xác nhận.',
                href: '/dashboard/receptionist/requests',
                tone: numberValue(requestBreakdown?.pending) > 0 ? 'warning' : 'good',
            },
            {
                label: 'Lịch hẹn đã hủy',
                value: cancelledAppointments,
                description:
                    'Các lịch hẹn đã bị hủy trong hệ thống. Nên theo dõi để phát hiện bất thường.',
                href: '/dashboard/receptionist/appointments',
                tone: cancelledAppointments > 0 ? 'warning' : 'good',
            },
            {
                label: 'Bệnh nhân vắng mặt',
                value: noShowAppointments,
                description:
                    'Các ca khám được đánh dấu vắng mặt, có thể ảnh hưởng đến hiệu suất lịch khám.',
                href: '/dashboard/receptionist/appointments',
                tone: noShowAppointments > 0 ? 'danger' : 'good',
            },
            {
                label: 'Đơn thuốc còn nháp',
                value: numberValue(prescriptionBreakdown?.draft),
                description:
                    'Đơn thuốc chưa phát hành. Cần kiểm tra nếu tồn tại quá lâu.',
                href: '/dashboard/doctor/prescriptions',
                tone: numberValue(prescriptionBreakdown?.draft) > 0 ? 'warning' : 'good',
            },
        ],
        [
            requestBreakdown?.pending,
            cancelledAppointments,
            noShowAppointments,
            prescriptionBreakdown?.draft,
        ],
    );

    const dataQualityItems: OperationItem[] = useMemo(
        () => [
            {
                label: 'Bác sĩ thiếu chuyên khoa',
                value: numberValue(doctorQuality?.missingSpecialty),
                description:
                    'Bác sĩ chưa được gán chuyên khoa sẽ khó hiển thị đúng trong luồng đặt lịch.',
                href: '/dashboard/admin/doctors',
                tone: numberValue(doctorQuality?.missingSpecialty) > 0 ? 'warning' : 'good',
            },
            {
                label: 'Bác sĩ thiếu mã giấy phép',
                value: numberValue(doctorQuality?.missingLicense),
                description:
                    'Thông tin giấy phép giúp hồ sơ bác sĩ đáng tin cậy và đầy đủ hơn.',
                href: '/dashboard/admin/doctors',
                tone: numberValue(doctorQuality?.missingLicense) > 0 ? 'warning' : 'good',
            },
            {
                label: 'Tài khoản đang hoạt động',
                value: numberValue(userBreakdown?.active),
                description:
                    'Số tài khoản có thể đăng nhập và sử dụng hệ thống.',
                href: '/dashboard/admin/users',
                tone: 'good',
            },
            {
                label: 'Tài khoản chưa kích hoạt',
                value: numberValue(userBreakdown?.pendingActivation),
                description:
                    'Người dùng đã đăng ký nhưng chưa hoàn tất xác thực hoặc kích hoạt.',
                href: '/dashboard/admin/users',
                tone:
                    numberValue(userBreakdown?.pendingActivation) > 0
                        ? 'warning'
                        : 'good',
            },
        ],
        [
            doctorQuality?.missingSpecialty,
            doctorQuality?.missingLicense,
            userBreakdown?.active,
            userBreakdown?.pendingActivation,
        ],
    );

    if (authLoading || !session) {
        return <Skeleton active paragraph={{ rows: 8 }} />;
    }

    return (
        <DashboardFrame
            session={session}
            title="Vận hành hệ thống"
            subtitle="Theo dõi hoạt động phòng khám, chất lượng dữ liệu và các điểm cần xử lý"
        >
            <RoleGuardState session={session} allow={['ADMIN']}>
                {loading ? (
                    <Skeleton active paragraph={{ rows: 10 }} />
                ) : (
                    <div className={styles.roleDashboard}>
                        {error && (
                            <Alert
                                type="error"
                                showIcon
                                message="Không thể tải dữ liệu vận hành"
                                description={error}
                            />
                        )}

                        <section className={styles.heroCard}>
                            <div>
                                <span>Trung tâm vận hành</span>
                                <h2>
                                    Nắm bắt tình trạng hệ thống và các vấn đề cần
                                    ưu tiên xử lý.
                                </h2>
                                <p>
                                    Dashboard này tổng hợp nhanh người dùng, bác
                                    sĩ, lịch hẹn, đơn thuốc, kho thuốc và các
                                    cảnh báo giúp quản trị viên điều phối hệ
                                    thống hiệu quả hơn.
                                </p>
                            </div>

                            <div className={styles.pulseCard}>
                                <strong>{warningCount}</strong>
                                <span>cảnh báo vận hành</span>
                            </div>
                        </section>

                        <section className={styles.metricGrid}>
                            <Card className={styles.metricCard}>
                                <Statistic
                                    title="Người dùng"
                                    value={numberValue(overview?.totalUsers)}
                                    prefix={<UserOutlined />}
                                />
                                <p>Tổng tài khoản trong hệ thống.</p>
                            </Card>

                            <Card className={styles.metricCard}>
                                <Statistic
                                    title="Bác sĩ"
                                    value={numberValue(overview?.totalDoctors)}
                                    prefix={<TeamOutlined />}
                                />
                                <p>Nhân sự y tế đang được quản lý.</p>
                            </Card>

                            <Card className={styles.metricCard}>
                                <Statistic
                                    title="Lịch hẹn"
                                    value={totalAppointments}
                                    prefix={<CalendarOutlined />}
                                />
                                <p>Lịch hẹn đã ghi nhận trên hệ thống.</p>
                            </Card>

                            <Card className={styles.metricCard}>
                                <Statistic
                                    title="Danh mục thuốc"
                                    value={numberValue(overview?.totalMedications)}
                                    prefix={<MedicineBoxOutlined />}
                                />
                                <p>Thuốc sẵn sàng phục vụ kê đơn.</p>
                            </Card>
                        </section>

                        <section className={styles.detailGrid}>
                            <Card
                                className={styles.detailCard}
                                title="Tình trạng vận hành"
                                extra={
                                    <Tag
                                        color={
                                            warningCount > 0 ? 'orange' : 'green'
                                        }
                                    >
                                        {warningCount > 0
                                            ? 'Cần theo dõi'
                                            : 'Ổn định'}
                                    </Tag>
                                }
                            >
                                <List
                                    dataSource={operationalItems}
                                    renderItem={(item) => (
                                        <List.Item
                                            className={styles.cleanListItem}
                                        >
                                            <List.Item.Meta
                                                avatar={
                                                    item.tone === 'danger' ? (
                                                        <ExclamationCircleOutlined
                                                            style={{
                                                                color: '#ef4444',
                                                                fontSize: 22,
                                                            }}
                                                        />
                                                    ) : item.tone ===
                                                        'warning' ? (
                                                        <AlertOutlined
                                                            style={{
                                                                color: '#f59e0b',
                                                                fontSize: 22,
                                                            }}
                                                        />
                                                    ) : (
                                                        <CheckCircleOutlined
                                                            style={{
                                                                color: '#10b981',
                                                                fontSize: 22,
                                                            }}
                                                        />
                                                    )
                                                }
                                                title={
                                                    <div
                                                        className={
                                                            styles.listTitle
                                                        }
                                                    >
                                                        <strong>
                                                            {item.label}
                                                        </strong>
                                                        <Tag
                                                            color={getToneColor(
                                                                item.tone,
                                                            )}
                                                        >
                                                            {item.value}
                                                        </Tag>
                                                    </div>
                                                }
                                                description={item.description}
                                            />

                                            {item.href && (
                                                <Link href={item.href}>
                                                    <Button type="link">
                                                        Xem
                                                    </Button>
                                                </Link>
                                            )}
                                        </List.Item>
                                    )}
                                />
                            </Card>

                            <Card
                                className={styles.detailCard}
                                title="Chất lượng dữ liệu"
                                extra={
                                    <Link href="/dashboard/admin/doctors">
                                        <Button type="link">Rà soát</Button>
                                    </Link>
                                }
                            >
                                <List
                                    dataSource={dataQualityItems}
                                    renderItem={(item) => (
                                        <List.Item
                                            className={styles.cleanListItem}
                                        >
                                            <List.Item.Meta
                                                title={
                                                    <div
                                                        className={
                                                            styles.listTitle
                                                        }
                                                    >
                                                        <strong>
                                                            {item.label}
                                                        </strong>
                                                        <Tag
                                                            color={getToneColor(
                                                                item.tone,
                                                            )}
                                                        >
                                                            {item.value}
                                                        </Tag>
                                                    </div>
                                                }
                                                description={item.description}
                                            />

                                            {item.href && (
                                                <Link href={item.href}>
                                                    <Button type="link">
                                                        Xem
                                                    </Button>
                                                </Link>
                                            )}
                                        </List.Item>
                                    )}
                                />
                            </Card>
                        </section>

                        <section className={styles.detailGrid}>
                            <Card
                                className={styles.detailCard}
                                title="Hiệu suất lịch hẹn"
                            >
                                <Space
                                    direction="vertical"
                                    size={20}
                                    style={{ width: '100%' }}
                                >
                                    <div>
                                        <div className={styles.listTitle}>
                                            <strong>Tỷ lệ hoàn tất lịch hẹn</strong>
                                            <Tag color="green">
                                                {appointmentCompletionRate}%
                                            </Tag>
                                        </div>

                                        <Progress
                                            percent={appointmentCompletionRate}
                                            strokeColor="#19b6a4"
                                        />
                                    </div>

                                    <div className={styles.quickActionGrid}>
                                        <Card size="small">
                                            <Statistic
                                                title="Đã hoàn tất"
                                                value={completedAppointments}
                                                prefix={<CheckCircleOutlined />}
                                            />
                                        </Card>

                                        <Card size="small">
                                            <Statistic
                                                title="Đã hủy"
                                                value={cancelledAppointments}
                                                prefix={<CalendarOutlined />}
                                            />
                                        </Card>

                                        <Card size="small">
                                            <Statistic
                                                title="Vắng mặt"
                                                value={noShowAppointments}
                                                prefix={<ClockCircleOutlined />}
                                            />
                                        </Card>

                                        <Card size="small">
                                            <Statistic
                                                title="Đang chờ"
                                                value={numberValue(
                                                    appointmentBreakdown?.scheduled,
                                                )}
                                                prefix={<CalendarOutlined />}
                                            />
                                        </Card>
                                    </div>
                                </Space>
                            </Card>

                            <Card
                                className={styles.detailCard}
                                title="Tác vụ quản trị nhanh"
                            >
                                <div className={styles.quickActionGrid}>
                                    <Link href="/dashboard/admin/users">
                                        <Button block icon={<UserOutlined />}>
                                            Người dùng
                                        </Button>
                                    </Link>

                                    <Link href="/dashboard/admin/doctors">
                                        <Button block icon={<TeamOutlined />}>
                                            Hồ sơ bác sĩ
                                        </Button>
                                    </Link>

                                    <Link href="/dashboard/admin/access-control">
                                        <Button
                                            block
                                            icon={<SafetyCertificateOutlined />}
                                        >
                                            Phân quyền
                                        </Button>
                                    </Link>

                                    <Link href="/dashboard/admin/specialties">
                                        <Button block icon={<AppstoreOutlined />}>
                                            Chuyên khoa
                                        </Button>
                                    </Link>

                                    <Link href="/dashboard/admin/inventory">
                                        <Button block icon={<MedicineBoxOutlined />}>
                                            Kho thuốc
                                        </Button>
                                    </Link>

                                    <Link href="/dashboard/admin/audit-logs">
                                        <Button block icon={<AuditOutlined />}>
                                            Audit Logs
                                        </Button>
                                    </Link>
                                </div>
                            </Card>
                        </section>

                        <section className={styles.detailGrid}>
                            <Card
                                className={styles.detailCard}
                                title="Đơn thuốc"
                            >
                                <div className={styles.quickActionGrid}>
                                    <Card size="small">
                                        <Statistic
                                            title="Bản nháp"
                                            value={numberValue(
                                                prescriptionBreakdown?.draft,
                                            )}
                                            prefix={<FileProtectOutlined />}
                                        />
                                    </Card>

                                    <Card size="small">
                                        <Statistic
                                            title="Đã phát hành"
                                            value={numberValue(
                                                prescriptionBreakdown?.finalized,
                                            )}
                                            prefix={<CheckCircleOutlined />}
                                        />
                                    </Card>

                                    <Card size="small">
                                        <Statistic
                                            title="Đã hủy"
                                            value={numberValue(
                                                prescriptionBreakdown?.cancelled,
                                            )}
                                            prefix={<ExclamationCircleOutlined />}
                                        />
                                    </Card>
                                </div>
                            </Card>

                            <Card
                                className={styles.detailCard}
                                title="Kho thuốc"
                            >
                                <div className={styles.quickActionGrid}>
                                    <Card size="small">
                                        <Statistic
                                            title="Tổng tồn kho"
                                            value={numberValue(
                                                inventorySummary?.totalStock,
                                            )}
                                            prefix={<MedicineBoxOutlined />}
                                        />
                                    </Card>

                                    <Card size="small">
                                        <Statistic
                                            title="Thuốc sắp hết"
                                            value={numberValue(
                                                inventorySummary?.lowStockItems,
                                            )}
                                            prefix={<AlertOutlined />}
                                        />
                                    </Card>

                                    <Card size="small">
                                        <Statistic
                                            title="Lô sắp hết hạn"
                                            value={numberValue(
                                                inventorySummary?.expiringBatches,
                                            )}
                                            prefix={<ClockCircleOutlined />}
                                        />
                                    </Card>
                                </div>
                            </Card>
                        </section>
                    </div>
                )}
            </RoleGuardState>
        </DashboardFrame>
    );
}