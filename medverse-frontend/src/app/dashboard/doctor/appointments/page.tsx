'use client';

import {
    CalendarOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    EyeOutlined,
    FileProtectOutlined,
    MedicineBoxOutlined,
    ReloadOutlined,
    SearchOutlined,
    StethoscopeOutlined,
    UserOutlined,
    WarningOutlined,
} from '@ant-design/icons';
import {
    Alert,
    Button,
    Card,
    DatePicker,
    Descriptions,
    Drawer,
    Input,
    List,
    Select,
    Space,
    Statistic,
    Tag,
} from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import DashboardFrame from '../../_components/DashboardFrame';
import ClinicalEmptyState from '../../_components/ClinicalEmptyState';
import ClinicalPageState from '../../_components/ClinicalPageState';
import RoleGuardState from '../../_components/RoleGuardState';
import StatusTag from '../../_components/StatusTag';
import { useAuthSession } from '@/lib/auth/use-auth-session';
import { getMyAppointments } from '@/services/appointment.service';
import type { Appointment, AppointmentStatus } from '@/types/clinical';
import styles from '../../dashboard.module.scss';

type DoctorAppointmentView = Appointment & {
    patientId?: string;
    patientName?: string;
    patientEmail?: string;
    patientPhone?: string;

    doctorName?: string;
    doctorEmail?: string;

    specialtyName?: string;

    startTime?: string;
    endTime?: string;
    scheduledAt?: string;
    appointmentDate?: string;
    appointmentTime?: string;

    type?: string;
    roomName?: string;
    location?: string;
    meetingUrl?: string;

    reason?: string;
    symptoms?: string;
    note?: string;

    medicalRecordId?: string;
    prescriptionId?: string;

    cancelReason?: string;
    cancellationReason?: string;

    createdAt?: string;
    updatedAt?: string;
};

type AppointmentStatusFilter = AppointmentStatus | 'ALL' | string;

const statusOptions: Array<{
    label: string;
    value: AppointmentStatusFilter;
}> = [
        { label: 'Tất cả lịch khám', value: 'ALL' },
        { label: 'Đã lên lịch', value: 'SCHEDULED' },
        { label: 'Đã xác nhận', value: 'CONFIRMED' },
        { label: 'Đã hoàn thành', value: 'COMPLETED' },
        { label: 'Đã hủy', value: 'CANCELLED' },
        { label: 'Không đến khám', value: 'NO_SHOW' },
    ];

function normalizeKeyword(value?: string) {
    return String(value || '')
        .trim()
        .toLowerCase();
}

function formatDateTime(value?: string) {
    if (!value) return 'Chưa ghi nhận';

    const parsed = dayjs(value);

    if (!parsed.isValid()) return value;

    return parsed.format('DD/MM/YYYY HH:mm');
}

function formatTime(value?: string) {
    if (!value) return 'Chưa rõ';

    if (/^\d{2}:\d{2}/.test(value)) {
        return value.slice(0, 5);
    }

    const parsed = dayjs(value);

    if (!parsed.isValid()) return value;

    return parsed.format('HH:mm');
}

function getAppointmentStart(appointment: DoctorAppointmentView) {
    return (
        appointment.startTime ||
        appointment.scheduledAt ||
        appointment.appointmentDate ||
        appointment.createdAt
    );
}

function getAppointmentEnd(appointment: DoctorAppointmentView) {
    return appointment.endTime;
}

function getAppointmentTimeLabel(appointment: DoctorAppointmentView) {
    if (appointment.appointmentDate) {
        const date = dayjs(appointment.appointmentDate);

        return `${date.isValid() ? date.format('DD/MM/YYYY') : appointment.appointmentDate} · ${appointment.appointmentTime || 'Chưa rõ giờ'
            }`;
    }

    return formatDateTime(getAppointmentStart(appointment));
}

function getAppointmentPlace(appointment: DoctorAppointmentView) {
    const type = String(appointment.type || 'OFFLINE').toUpperCase();

    if (type === 'ONLINE') {
        return appointment.meetingUrl || 'Khám trực tuyến';
    }

    return appointment.roomName || appointment.location || 'Phòng khám';
}

function getAppointmentTypeLabel(value?: string) {
    const type = String(value || 'OFFLINE').toUpperCase();

    if (type === 'ONLINE') return 'Khám online';

    return 'Khám trực tiếp';
}

function getAppointmentTitle(appointment: DoctorAppointmentView) {
    return (
        appointment.patientName ||
        appointment.specialtyName ||
        appointment.reason ||
        'Lịch khám'
    );
}

function getAppointmentSummary(appointment: DoctorAppointmentView) {
    return (
        appointment.symptoms ||
        appointment.reason ||
        appointment.note ||
        'Chưa có mô tả triệu chứng.'
    );
}

function isSameDay(appointment: DoctorAppointmentView, selectedDate: Dayjs | null) {
    if (!selectedDate) return true;

    const start = getAppointmentStart(appointment);

    if (!start) return false;

    return dayjs(start).isSame(selectedDate, 'day');
}

function canOpenCase(appointment: DoctorAppointmentView) {
    return ['SCHEDULED', 'CONFIRMED', 'COMPLETED'].includes(
        String(appointment.status || '').toUpperCase(),
    );
}

function isActiveAppointment(appointment: DoctorAppointmentView) {
    return ['SCHEDULED', 'CONFIRMED'].includes(
        String(appointment.status || '').toUpperCase(),
    );
}

function isCompletedAppointment(appointment: DoctorAppointmentView) {
    return String(appointment.status || '').toUpperCase() === 'COMPLETED';
}

function isProblemAppointment(appointment: DoctorAppointmentView) {
    return ['CANCELLED', 'NO_SHOW'].includes(
        String(appointment.status || '').toUpperCase(),
    );
}

function isNowOrPastActive(appointment: DoctorAppointmentView) {
    return (
        isActiveAppointment(appointment) &&
        dayjs(getAppointmentStart(appointment)).isBefore(dayjs().add(30, 'minute'))
    );
}

function getClinicalTag(appointment: DoctorAppointmentView) {
    const status = String(appointment.status || '').toUpperCase();

    if (status === 'COMPLETED') {
        return <Tag color="green">Đã hoàn tất hồ sơ</Tag>;
    }

    if (status === 'CANCELLED') {
        return <Tag color="red">Đã hủy</Tag>;
    }

    if (status === 'NO_SHOW') {
        return <Tag color="orange">Bệnh nhân không đến</Tag>;
    }

    if (appointment.medicalRecordId) {
        return <Tag color="cyan">Đã có bệnh án</Tag>;
    }

    if (isNowOrPastActive(appointment)) {
        return <Tag color="blue">Có thể mở ca khám</Tag>;
    }

    return <Tag color="purple">Sắp khám</Tag>;
}

function sortAppointments(
    a: DoctorAppointmentView,
    b: DoctorAppointmentView,
) {
    return String(getAppointmentStart(a) || '').localeCompare(
        String(getAppointmentStart(b) || ''),
    );
}

export default function DoctorAppointmentsPage() {
    const { session, loading: authLoading } = useAuthSession();

    const [appointments, setAppointments] = useState<DoctorAppointmentView[]>([]);
    const [keyword, setKeyword] = useState('');
    const [status, setStatus] = useState<AppointmentStatusFilter>('ALL');
    const [selectedDate, setSelectedDate] = useState<Dayjs | null>(dayjs());

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [selectedAppointment, setSelectedAppointment] =
        useState<DoctorAppointmentView | null>(null);
    const [detailOpen, setDetailOpen] = useState(false);

    const loadAppointments = async () => {
        try {
            setLoading(true);
            setError(null);

            const page = await getMyAppointments(100);

            const content = Array.isArray(page)
                ? page
                : page?.content || [];

            setAppointments(
                [...(content as DoctorAppointmentView[])].sort(sortAppointments),
            );
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

        loadAppointments();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session]);

    const filteredAppointments = useMemo(() => {
        const search = normalizeKeyword(keyword);

        return appointments.filter((appointment) => {
            const appointmentStatus = String(
                appointment.status || '',
            ).toUpperCase();

            const matchStatus =
                status === 'ALL' || appointmentStatus === status;

            const matchDate = isSameDay(appointment, selectedDate);

            const matchKeyword =
                !search ||
                appointment.patientName?.toLowerCase().includes(search) ||
                appointment.patientEmail?.toLowerCase().includes(search) ||
                appointment.patientPhone?.toLowerCase().includes(search) ||
                appointment.specialtyName?.toLowerCase().includes(search) ||
                appointment.reason?.toLowerCase().includes(search) ||
                appointment.symptoms?.toLowerCase().includes(search) ||
                appointment.note?.toLowerCase().includes(search) ||
                appointment.type?.toLowerCase().includes(search);

            return matchStatus && matchDate && matchKeyword;
        });
    }, [appointments, keyword, status, selectedDate]);

    const metrics = useMemo(() => {
        const active = filteredAppointments.filter(isActiveAppointment).length;
        const completed = filteredAppointments.filter(
            isCompletedAppointment,
        ).length;
        const problem = filteredAppointments.filter(isProblemAppointment).length;
        const canStart = filteredAppointments.filter(isNowOrPastActive).length;

        return {
            total: filteredAppointments.length,
            active,
            completed,
            problem,
            canStart,
        };
    }, [filteredAppointments]);

    const focusAppointments = useMemo(() => {
        return filteredAppointments.filter(isActiveAppointment).slice(0, 4);
    }, [filteredAppointments]);

    const openDetail = (appointment: DoctorAppointmentView) => {
        setSelectedAppointment(appointment);
        setDetailOpen(true);
    };

    const handleResetFilter = () => {
        setKeyword('');
        setStatus('ALL');
        setSelectedDate(dayjs());
    };

    if (authLoading || !session) {
        return <ClinicalPageState loading>Loading</ClinicalPageState>;
    }

    return (
        <DashboardFrame
            session={session}
            title="Lịch khám của tôi"
            subtitle="Bác sĩ theo dõi lịch khám, mở ca khám và hoàn tất hồ sơ bệnh án"
        >
            <RoleGuardState session={session} allow={['DOCTOR']}>
                <div className={styles.roleDashboard}>
                    <section className={styles.heroCard}>
                        <div>
                            <span>Doctor Appointment Board</span>
                            <h2>Theo dõi lịch khám và mở ca lâm sàng.</h2>
                            <p>
                                Danh sách này hiển thị các lịch hẹn được phân cho
                                bác sĩ. Khi đến giờ khám, bác sĩ có thể mở ca khám
                                để cập nhật bệnh án, chẩn đoán và kê đơn thuốc.
                            </p>
                        </div>

                        <div className={styles.pulseCard}>
                            <strong>{metrics.canStart}</strong>
                            <span>ca có thể bắt đầu xử lý</span>
                        </div>
                    </section>

                    <section className={styles.metricGrid}>
                        <Card className={styles.metricCard}>
                            <Statistic
                                title="Tổng lịch theo bộ lọc"
                                value={metrics.total}
                                prefix={<CalendarOutlined />}
                            />
                            <p>Lịch khám theo ngày, trạng thái và từ khóa.</p>
                        </Card>

                        <Card className={styles.metricCard}>
                            <Statistic
                                title="Đang hoạt động"
                                value={metrics.active}
                                prefix={<ClockCircleOutlined />}
                            />
                            <p>Lịch SCHEDULED hoặc CONFIRMED.</p>
                        </Card>

                        <Card className={styles.metricCard}>
                            <Statistic
                                title="Đã hoàn thành"
                                value={metrics.completed}
                                prefix={<CheckCircleOutlined />}
                            />
                            <p>Lịch đã hoàn tất quy trình khám.</p>
                        </Card>

                        <Card className={styles.metricCard}>
                            <Statistic
                                title="Cần chú ý"
                                value={metrics.problem}
                                prefix={<WarningOutlined />}
                            />
                            <p>Lịch đã hủy hoặc bệnh nhân không đến.</p>
                        </Card>
                    </section>

                    <section className={styles.detailGrid}>
                        <Card
                            className={styles.detailCard}
                            title="Ca khám cần theo dõi"
                        >
                            {focusAppointments.length === 0 ? (
                                <ClinicalEmptyState
                                    title="Không có ca khám đang hoạt động"
                                    description="Hiện chưa có lịch khám SCHEDULED hoặc CONFIRMED theo bộ lọc hiện tại."
                                />
                            ) : (
                                <Space
                                    direction="vertical"
                                    size={12}
                                    style={{ width: '100%' }}
                                >
                                    {focusAppointments.map((appointment) => (
                                        <article
                                            key={appointment.id}
                                            className={styles.cleanListItem}
                                            style={{
                                                borderRadius: 18,
                                                padding: 16,
                                                border: '1px solid #e5e7eb',
                                            }}
                                        >
                                            <div className={styles.listTitle}>
                                                <strong>
                                                    {getAppointmentTitle(
                                                        appointment,
                                                    )}
                                                </strong>

                                                <Space wrap>
                                                    <StatusTag
                                                        value={appointment.status}
                                                    />
                                                    {getClinicalTag(appointment)}
                                                </Space>
                                            </div>

                                            <p>
                                                Thời gian:{' '}
                                                <b>
                                                    {getAppointmentTimeLabel(
                                                        appointment,
                                                    )}
                                                </b>
                                            </p>

                                            <p>
                                                Triệu chứng:{' '}
                                                {getAppointmentSummary(appointment)}
                                            </p>

                                            <Space wrap>
                                                <Button
                                                    size="small"
                                                    icon={<EyeOutlined />}
                                                    onClick={() =>
                                                        openDetail(appointment)
                                                    }
                                                >
                                                    Chi tiết
                                                </Button>

                                                {canOpenCase(appointment) && (
                                                    <Link
                                                        href={`/dashboard/doctor/cases/${appointment.id}`}
                                                    >
                                                        <Button
                                                            size="small"
                                                            type="primary"
                                                            icon={
                                                                <StethoscopeOutlined />
                                                            }
                                                        >
                                                            Mở ca khám
                                                        </Button>
                                                    </Link>
                                                )}
                                            </Space>
                                        </article>
                                    ))}
                                </Space>
                            )}
                        </Card>

                        <Card
                            className={styles.detailCard}
                            title="Gợi ý quy trình"
                        >
                            <Space
                                direction="vertical"
                                size={12}
                                style={{ width: '100%' }}
                            >
                                <Alert
                                    type="info"
                                    showIcon
                                    message="1. Kiểm tra thông tin lịch khám"
                                    description="Xem bệnh nhân, thời gian, hình thức khám và triệu chứng trước khi bắt đầu."
                                />

                                <Alert
                                    type="success"
                                    showIcon
                                    message="2. Mở ca khám"
                                    description="Trong ca khám, bác sĩ cập nhật bệnh án, thêm chẩn đoán và tạo đơn thuốc."
                                />

                                <Alert
                                    type="warning"
                                    showIcon
                                    message="3. Hoàn tất hồ sơ"
                                    description="Sau khi hoàn tất, bệnh nhân có thể xem bệnh án và đơn thuốc trong Patient Portal."
                                />
                            </Space>
                        </Card>
                    </section>

                    <Card className={styles.detailCard}>
                        <div className={styles.panelHeader}>
                            <div>
                                <span>Appointment board</span>
                                <h2>Danh sách lịch khám</h2>
                                <p>
                                    Lọc lịch theo ngày, trạng thái và tìm kiếm nhanh
                                    theo bệnh nhân, triệu chứng hoặc chuyên khoa.
                                </p>
                            </div>

                            <Button
                                icon={<ReloadOutlined />}
                                loading={loading}
                                onClick={loadAppointments}
                            >
                                Làm mới
                            </Button>
                        </div>

                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns:
                                    'minmax(260px, 1fr) 190px 220px auto',
                                gap: 12,
                                marginTop: 20,
                                marginBottom: 20,
                            }}
                        >
                            <Input
                                allowClear
                                prefix={<SearchOutlined />}
                                placeholder="Tìm bệnh nhân, chuyên khoa, triệu chứng"
                                value={keyword}
                                onChange={(event) =>
                                    setKeyword(event.target.value)
                                }
                            />

                            <DatePicker
                                allowClear
                                value={selectedDate}
                                placeholder="Ngày khám"
                                onChange={setSelectedDate}
                            />

                            <Select
                                value={status}
                                options={statusOptions}
                                onChange={setStatus}
                            />

                            <Button onClick={handleResetFilter}>Đặt lại</Button>
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
                            {filteredAppointments.length === 0 ? (
                                <ClinicalEmptyState
                                    title="Không có lịch khám phù hợp"
                                    description="Không tìm thấy lịch khám nào theo bộ lọc hiện tại."
                                />
                            ) : (
                                <List
                                    dataSource={filteredAppointments}
                                    renderItem={(appointment) => (
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
                                                        <Space wrap>
                                                            <UserOutlined />
                                                            <strong>
                                                                {getAppointmentTitle(
                                                                    appointment,
                                                                )}
                                                            </strong>
                                                        </Space>

                                                        <Space wrap>
                                                            <StatusTag
                                                                value={
                                                                    appointment.status
                                                                }
                                                            />
                                                            {getClinicalTag(
                                                                appointment,
                                                            )}
                                                            <Tag color="cyan">
                                                                {getAppointmentTypeLabel(
                                                                    appointment.type,
                                                                )}
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
                                                                    'Chưa rõ'}
                                                            </b>
                                                        </p>

                                                        <p>
                                                            Chuyên khoa:{' '}
                                                            <b>
                                                                {appointment.specialtyName ||
                                                                    'Chưa cập nhật'}
                                                            </b>
                                                        </p>

                                                        <p>
                                                            Thời gian:{' '}
                                                            <b>
                                                                {getAppointmentTimeLabel(
                                                                    appointment,
                                                                )}
                                                            </b>
                                                        </p>

                                                        <p>
                                                            Địa điểm / hình thức:{' '}
                                                            <b>
                                                                {getAppointmentPlace(
                                                                    appointment,
                                                                )}
                                                            </b>
                                                        </p>

                                                        <p>
                                                            Triệu chứng:{' '}
                                                            {getAppointmentSummary(
                                                                appointment,
                                                            )}
                                                        </p>

                                                        {(appointment.cancelReason ||
                                                            appointment.cancellationReason) && (
                                                                <Alert
                                                                    type="warning"
                                                                    showIcon
                                                                    message="Lý do hủy"
                                                                    description={
                                                                        appointment.cancelReason ||
                                                                        appointment.cancellationReason
                                                                    }
                                                                    style={{
                                                                        marginTop: 12,
                                                                    }}
                                                                />
                                                            )}
                                                    </div>
                                                }
                                            />

                                            <Space wrap>
                                                <Button
                                                    icon={<EyeOutlined />}
                                                    onClick={() =>
                                                        openDetail(appointment)
                                                    }
                                                >
                                                    Chi tiết
                                                </Button>

                                                {canOpenCase(appointment) && (
                                                    <Link
                                                        href={`/dashboard/doctor/cases/${appointment.id}`}
                                                    >
                                                        <Button
                                                            type="primary"
                                                            icon={
                                                                <StethoscopeOutlined />
                                                            }
                                                        >
                                                            Mở ca khám
                                                        </Button>
                                                    </Link>
                                                )}

                                                {appointment.medicalRecordId && (
                                                    <Link
                                                        href={`/dashboard/doctor/cases/${appointment.id}`}
                                                    >
                                                        <Button
                                                            icon={
                                                                <FileProtectOutlined />
                                                            }
                                                        >
                                                            Bệnh án
                                                        </Button>
                                                    </Link>
                                                )}

                                                {appointment.prescriptionId && (
                                                    <Button
                                                        icon={
                                                            <MedicineBoxOutlined />
                                                        }
                                                    >
                                                        Đã có đơn thuốc
                                                    </Button>
                                                )}
                                            </Space>
                                        </List.Item>
                                    )}
                                />
                            )}
                        </ClinicalPageState>
                    </Card>
                </div>

                <Drawer
                    title="Chi tiết lịch khám"
                    open={detailOpen}
                    width={680}
                    onClose={() => setDetailOpen(false)}
                    extra={
                        selectedAppointment &&
                        canOpenCase(selectedAppointment) && (
                            <Link
                                href={`/dashboard/doctor/cases/${selectedAppointment.id}`}
                            >
                                <Button
                                    type="primary"
                                    icon={<StethoscopeOutlined />}
                                >
                                    Mở ca khám
                                </Button>
                            </Link>
                        )
                    }
                >
                    {selectedAppointment && (
                        <Descriptions
                            bordered
                            column={1}
                            size="small"
                            title={getAppointmentTitle(selectedAppointment)}
                        >
                            <Descriptions.Item label="Trạng thái">
                                <Space wrap>
                                    <StatusTag value={selectedAppointment.status} />
                                    {getClinicalTag(selectedAppointment)}
                                </Space>
                            </Descriptions.Item>

                            <Descriptions.Item label="Bệnh nhân">
                                {selectedAppointment.patientName || 'Chưa rõ'}
                            </Descriptions.Item>

                            <Descriptions.Item label="Email bệnh nhân">
                                {selectedAppointment.patientEmail ||
                                    'Chưa cập nhật'}
                            </Descriptions.Item>

                            <Descriptions.Item label="Số điện thoại">
                                {selectedAppointment.patientPhone ||
                                    'Chưa cập nhật'}
                            </Descriptions.Item>

                            <Descriptions.Item label="Chuyên khoa">
                                {selectedAppointment.specialtyName ||
                                    'Chưa cập nhật'}
                            </Descriptions.Item>

                            <Descriptions.Item label="Thời gian bắt đầu">
                                {getAppointmentTimeLabel(selectedAppointment)}
                            </Descriptions.Item>

                            <Descriptions.Item label="Thời gian kết thúc">
                                {formatDateTime(getAppointmentEnd(selectedAppointment))}
                            </Descriptions.Item>

                            <Descriptions.Item label="Hình thức khám">
                                {getAppointmentTypeLabel(selectedAppointment.type)}
                            </Descriptions.Item>

                            <Descriptions.Item label="Địa điểm / link khám">
                                {getAppointmentPlace(selectedAppointment)}
                            </Descriptions.Item>

                            <Descriptions.Item label="Lý do khám">
                                {selectedAppointment.reason || 'Chưa cập nhật'}
                            </Descriptions.Item>

                            <Descriptions.Item label="Triệu chứng">
                                {selectedAppointment.symptoms || 'Chưa cập nhật'}
                            </Descriptions.Item>

                            <Descriptions.Item label="Ghi chú">
                                {selectedAppointment.note || 'Không có ghi chú'}
                            </Descriptions.Item>

                            <Descriptions.Item label="Bệnh án">
                                {selectedAppointment.medicalRecordId ? (
                                    <Tag color="green">Đã tạo bệnh án</Tag>
                                ) : (
                                    'Chưa có bệnh án'
                                )}
                            </Descriptions.Item>

                            <Descriptions.Item label="Đơn thuốc">
                                {selectedAppointment.prescriptionId ? (
                                    <Tag color="green">Đã tạo đơn thuốc</Tag>
                                ) : (
                                    'Chưa có đơn thuốc'
                                )}
                            </Descriptions.Item>

                            <Descriptions.Item label="Lý do hủy">
                                {selectedAppointment.cancelReason ||
                                    selectedAppointment.cancellationReason ||
                                    'Không có hoặc chưa bị hủy'}
                            </Descriptions.Item>

                            <Descriptions.Item label="Ngày tạo">
                                {formatDateTime(selectedAppointment.createdAt)}
                            </Descriptions.Item>

                            <Descriptions.Item label="Cập nhật gần nhất">
                                {formatDateTime(selectedAppointment.updatedAt)}
                            </Descriptions.Item>
                        </Descriptions>
                    )}
                </Drawer>
            </RoleGuardState>
        </DashboardFrame>
    );
}