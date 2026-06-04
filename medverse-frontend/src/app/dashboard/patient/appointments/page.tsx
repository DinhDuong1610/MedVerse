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
    VideoCameraOutlined,
    WarningOutlined,
} from '@ant-design/icons';
import {
    Button,
    Descriptions,
    Drawer,
    Input,
    Select,
    Space,
    Tag,
} from 'antd';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import ClinicalPageState from '../../_components/ClinicalPageState';
import PatientPortalFrame from '../../_components/PatientPortalFrame';
import StatusTag from '../../_components/StatusTag';
import { hasRole } from '@/lib/auth/roles';
import { useAuthSession } from '@/lib/auth/use-auth-session';
import { getMyAppointments } from '@/services/appointment.service';
import type { Appointment } from '@/types/clinical';
import styles from '../../_components/patient-portal.module.scss';

type PatientAppointmentView = Appointment & {
    appointmentDate?: string;
    appointmentTime?: string;
    date?: string;
    time?: string;
    startTime?: string;
    endTime?: string;
    scheduledAt?: string;

    doctorName?: string;
    doctorEmail?: string;
    specialtyName?: string;

    type?: string;
    roomName?: string;
    location?: string;
    meetingUrl?: string;

    reason?: string;
    symptoms?: string;
    note?: string;

    medicalRecordId?: string;
    prescriptionId?: string;

    cancellationReason?: string;
    cancelReason?: string;

    createdAt?: string;
    updatedAt?: string;
};

const statusOptions = [
    {
        label: 'Tất cả lịch hẹn',
        value: 'ALL',
    },
    {
        label: 'Đã lên lịch',
        value: 'SCHEDULED',
    },
    {
        label: 'Đã xác nhận',
        value: 'CONFIRMED',
    },
    {
        label: 'Đã hoàn thành',
        value: 'COMPLETED',
    },
    {
        label: 'Đã hủy',
        value: 'CANCELLED',
    },
    {
        label: 'Không đến khám',
        value: 'NO_SHOW',
    },
];

function normalizeKeyword(value?: string) {
    return String(value || '')
        .trim()
        .toLowerCase();
}

function formatDate(value?: string) {
    if (!value) return 'Chưa ghi nhận';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleDateString('vi-VN');
}

function formatDateTime(value?: string) {
    if (!value) return 'Chưa ghi nhận';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleString('vi-VN');
}

function getAppointmentStart(appointment: PatientAppointmentView) {
    return (
        appointment.startTime ||
        appointment.scheduledAt ||
        appointment.appointmentDate ||
        appointment.date
    );
}

function getAppointmentEnd(appointment: PatientAppointmentView) {
    return appointment.endTime;
}

function getAppointmentTimeLabel(appointment: PatientAppointmentView) {
    const start = getAppointmentStart(appointment);

    if (appointment.appointmentDate || appointment.date) {
        const date = formatDate(appointment.appointmentDate || appointment.date);
        const time =
            appointment.appointmentTime ||
            appointment.time ||
            appointment.startTime ||
            'Chưa ghi nhận giờ';

        return `${date} · ${time}`;
    }

    if (start) {
        return formatDateTime(start);
    }

    return 'Chưa ghi nhận thời gian';
}

function getAppointmentTitle(appointment: PatientAppointmentView) {
    if (appointment.specialtyName && appointment.doctorName) {
        return `${appointment.specialtyName} · ${appointment.doctorName}`;
    }

    return (
        appointment.specialtyName ||
        appointment.doctorName ||
        appointment.reason ||
        'Lịch hẹn khám'
    );
}

function getAppointmentDescription(appointment: PatientAppointmentView) {
    return (
        appointment.symptoms ||
        appointment.reason ||
        appointment.note ||
        'Chưa có mô tả chi tiết cho lịch hẹn này.'
    );
}

function getAppointmentPlace(appointment: PatientAppointmentView) {
    if (appointment.type === 'ONLINE') {
        return 'Khám trực tuyến';
    }

    return (
        appointment.roomName ||
        appointment.location ||
        'Phòng khám sẽ cập nhật địa điểm'
    );
}

function isUpcomingAppointment(appointment: PatientAppointmentView) {
    const status = String(appointment.status || '').toUpperCase();

    return ['SCHEDULED', 'CONFIRMED'].includes(status);
}

function isCompletedAppointment(appointment: PatientAppointmentView) {
    return String(appointment.status || '').toUpperCase() === 'COMPLETED';
}

function isProblemAppointment(appointment: PatientAppointmentView) {
    return ['CANCELLED', 'NO_SHOW'].includes(
        String(appointment.status || '').toUpperCase(),
    );
}

function getStatusIcon(status?: string) {
    const normalized = String(status || '').toUpperCase();

    if (normalized === 'COMPLETED') return <CheckCircleOutlined />;
    if (normalized === 'CANCELLED' || normalized === 'NO_SHOW') {
        return <WarningOutlined />;
    }

    return <ClockCircleOutlined />;
}

function getStatusColor(status?: string) {
    const normalized = String(status || '').toUpperCase();

    if (normalized === 'COMPLETED') return '#16a34a';
    if (normalized === 'CANCELLED' || normalized === 'NO_SHOW') return '#ef4444';
    if (normalized === 'CONFIRMED') return '#2563eb';

    return '#7c3aed';
}

export default function PatientAppointmentsPage() {
    const { session, loading: authLoading } = useAuthSession();

    const [appointments, setAppointments] = useState<PatientAppointmentView[]>(
        [],
    );
    const [keyword, setKeyword] = useState('');
    const [status, setStatus] = useState('ALL');

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [selectedAppointment, setSelectedAppointment] =
        useState<PatientAppointmentView | null>(null);
    const [openDetailDrawer, setOpenDetailDrawer] = useState(false);

    const loadAppointments = async () => {
        try {
            setLoading(true);
            setError(null);

            const result = await getMyAppointments();

            const content = Array.isArray(result)
                ? result
                : result?.content || [];

            setAppointments(content as PatientAppointmentView[]);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Không thể tải danh sách lịch hẹn.',
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!session) return;

        if (!hasRole(session, 'PATIENT')) {
            setError('Trang này chỉ dành cho bệnh nhân.');
            setLoading(false);
            return;
        }

        loadAppointments();
    }, [session]);

    const filteredAppointments = useMemo(() => {
        const search = normalizeKeyword(keyword);

        return appointments.filter((appointment) => {
            const appointmentStatus = String(
                appointment.status || '',
            ).toUpperCase();

            const matchStatus =
                status === 'ALL' || appointmentStatus === status;

            const matchKeyword =
                !search ||
                appointment.doctorName?.toLowerCase().includes(search) ||
                appointment.specialtyName?.toLowerCase().includes(search) ||
                appointment.reason?.toLowerCase().includes(search) ||
                appointment.symptoms?.toLowerCase().includes(search) ||
                appointment.note?.toLowerCase().includes(search) ||
                appointment.type?.toLowerCase().includes(search);

            return matchStatus && matchKeyword;
        });
    }, [appointments, keyword, status]);

    const metrics = useMemo(() => {
        const upcoming = appointments.filter(isUpcomingAppointment).length;
        const completed = appointments.filter(isCompletedAppointment).length;
        const problem = appointments.filter(isProblemAppointment).length;

        return {
            total: appointments.length,
            upcoming,
            completed,
            problem,
        };
    }, [appointments]);

    const upcomingAppointments = useMemo(() => {
        return appointments
            .filter(isUpcomingAppointment)
            .sort((a, b) => {
                const timeA = new Date(getAppointmentStart(a) || 0).getTime();
                const timeB = new Date(getAppointmentStart(b) || 0).getTime();

                return timeA - timeB;
            })
            .slice(0, 3);
    }, [appointments]);

    const openDetail = (appointment: PatientAppointmentView) => {
        setSelectedAppointment(appointment);
        setOpenDetailDrawer(true);
    };

    const handleReset = () => {
        setKeyword('');
        setStatus('ALL');
    };

    if (authLoading || !session) {
        return <ClinicalPageState loading>Loading</ClinicalPageState>;
    }

    return (
        <PatientPortalFrame session={session}>
            <section className={styles.hero}>
                <div>
                    <div className={styles.heroKicker}>Lịch hẹn của tôi</div>
                    <h1 className={styles.heroTitle}>
                        Theo dõi các lịch khám đã được xác nhận
                    </h1>
                    <p className={styles.heroDescription}>
                        Những yêu cầu đặt lịch sau khi được lễ tân duyệt sẽ trở
                        thành lịch hẹn chính thức và được hiển thị tại đây.
                    </p>

                    <Space wrap style={{ marginTop: 20 }}>
                        <Link href="/dashboard/patient/book-appointment">
                            <Button type="primary" icon={<CalendarOutlined />}>
                                Đặt lịch mới
                            </Button>
                        </Link>

                        <Link href="/dashboard/patient/appointment-requests">
                            <Button>Yêu cầu đặt lịch</Button>
                        </Link>
                    </Space>
                </div>

                <article className={styles.heroCard}>
                    <span>Lịch hẹn sắp tới</span>
                    <strong>{metrics.upcoming}</strong>
                    <p>
                        Hãy kiểm tra thời gian, hình thức khám và thông tin bác
                        sĩ trước buổi hẹn.
                    </p>
                </article>
            </section>

            <section
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                    gap: 16,
                    marginTop: 24,
                }}
            >
                <article className={styles.listCard}>
                    <div className={styles.listTitle}>
                        <strong>Tổng lịch hẹn</strong>
                        <Tag color="blue">{metrics.total}</Tag>
                    </div>
                    <p className={styles.muted}>
                        Toàn bộ lịch hẹn chính thức của bạn.
                    </p>
                </article>

                <article className={styles.listCard}>
                    <div className={styles.listTitle}>
                        <strong>Đã hoàn thành</strong>
                        <Tag color="green">{metrics.completed}</Tag>
                    </div>
                    <p className={styles.muted}>
                        Các buổi khám đã hoàn tất trong hệ thống.
                    </p>
                </article>

                <article className={styles.listCard}>
                    <div className={styles.listTitle}>
                        <strong>Cần chú ý</strong>
                        <Tag color="orange">{metrics.problem}</Tag>
                    </div>
                    <p className={styles.muted}>
                        Lịch hẹn đã hủy hoặc ghi nhận không đến khám.
                    </p>
                </article>
            </section>

            <section className={styles.portalPanel} style={{ marginTop: 24 }}>
                <div className={styles.panelHeader}>
                    <div>
                        <span>Sắp tới</span>
                        <h2>Lịch hẹn cần chuẩn bị</h2>
                    </div>

                    <Button icon={<ReloadOutlined />} onClick={loadAppointments}>
                        Làm mới
                    </Button>
                </div>

                <ClinicalPageState
                    loading={loading}
                    error={error}
                    empty={upcomingAppointments.length === 0}
                    emptyTitle="Chưa có lịch hẹn sắp tới"
                    emptyDescription="Khi yêu cầu đặt lịch được duyệt, lịch hẹn sẽ xuất hiện tại đây."
                    actionText="Đặt lịch khám"
                    actionHref="/dashboard/patient/book-appointment"
                >
                    {upcomingAppointments.map((appointment) => (
                        <article
                            key={appointment.id}
                            className={styles.listCard}
                        >
                            <div className={styles.listTitle}>
                                <Space size={10} wrap>
                                    <span
                                        style={{
                                            width: 36,
                                            height: 36,
                                            borderRadius: 999,
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: getStatusColor(
                                                appointment.status,
                                            ),
                                            background: '#f8fafc',
                                            border: `1px solid ${getStatusColor(
                                                appointment.status,
                                            )}22`,
                                        }}
                                    >
                                        {getStatusIcon(appointment.status)}
                                    </span>

                                    <strong>
                                        {getAppointmentTitle(appointment)}
                                    </strong>
                                </Space>

                                <StatusTag value={appointment.status} />
                            </div>

                            <p className={styles.muted}>
                                Thời gian:{' '}
                                <b>{getAppointmentTimeLabel(appointment)}</b>
                            </p>

                            <p className={styles.muted}>
                                Địa điểm / hình thức:{' '}
                                <b>{getAppointmentPlace(appointment)}</b>
                            </p>

                            <Space wrap>
                                <Button
                                    icon={<EyeOutlined />}
                                    onClick={() => openDetail(appointment)}
                                >
                                    Xem chi tiết
                                </Button>

                                {appointment.meetingUrl && (
                                    <Button
                                        type="primary"
                                        icon={<VideoCameraOutlined />}
                                        href={appointment.meetingUrl}
                                        target="_blank"
                                    >
                                        Vào phòng khám
                                    </Button>
                                )}
                            </Space>
                        </article>
                    ))}
                </ClinicalPageState>
            </section>

            <section className={styles.portalPanel} style={{ marginTop: 24 }}>
                <div className={styles.panelHeader}>
                    <div>
                        <span>Bộ lọc</span>
                        <h2>Tìm lịch hẹn</h2>
                    </div>
                </div>

                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 220px auto',
                        gap: 12,
                        marginTop: 16,
                    }}
                >
                    <Input
                        allowClear
                        prefix={<SearchOutlined />}
                        placeholder="Tìm theo bác sĩ, chuyên khoa, triệu chứng hoặc loại khám"
                        value={keyword}
                        onChange={(event) => setKeyword(event.target.value)}
                    />

                    <Select
                        value={status}
                        options={statusOptions}
                        onChange={setStatus}
                    />

                    <Button onClick={handleReset}>Đặt lại</Button>
                </div>
            </section>

            <section className={styles.portalPanel} style={{ marginTop: 24 }}>
                <div className={styles.panelHeader}>
                    <div>
                        <span>Danh sách</span>
                        <h2>Lịch hẹn của tôi</h2>
                    </div>

                    <Tag color="blue">{filteredAppointments.length} lịch hẹn</Tag>
                </div>

                <ClinicalPageState
                    loading={loading}
                    error={error}
                    empty={filteredAppointments.length === 0}
                    emptyTitle="Không có lịch hẹn phù hợp"
                    emptyDescription="Bạn có thể thay đổi bộ lọc hoặc gửi yêu cầu đặt lịch mới."
                    actionText="Đặt lịch khám"
                    actionHref="/dashboard/patient/book-appointment"
                >
                    {filteredAppointments.map((appointment) => (
                        <article
                            key={appointment.id}
                            className={styles.listCard}
                        >
                            <div className={styles.listTitle}>
                                <Space size={10} wrap>
                                    <span
                                        style={{
                                            width: 36,
                                            height: 36,
                                            borderRadius: 999,
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: getStatusColor(
                                                appointment.status,
                                            ),
                                            background: '#f8fafc',
                                            border: `1px solid ${getStatusColor(
                                                appointment.status,
                                            )}22`,
                                        }}
                                    >
                                        {getStatusIcon(appointment.status)}
                                    </span>

                                    <strong>
                                        {getAppointmentTitle(appointment)}
                                    </strong>
                                </Space>

                                <StatusTag value={appointment.status} />
                            </div>

                            <p className={styles.muted}>
                                Bác sĩ:{' '}
                                <b>
                                    {appointment.doctorName ||
                                        'Chưa chỉ định bác sĩ'}
                                </b>
                            </p>

                            <p className={styles.muted}>
                                Thời gian:{' '}
                                <b>{getAppointmentTimeLabel(appointment)}</b> ·
                                Loại khám:{' '}
                                <b>{appointment.type || 'OFFLINE'}</b>
                            </p>

                            <p className={styles.muted}>
                                {getAppointmentDescription(appointment)}
                            </p>

                            {(appointment.cancellationReason ||
                                appointment.cancelReason) && (
                                    <p style={{ color: '#ef4444', lineHeight: 1.6 }}>
                                        Lý do hủy:{' '}
                                        {appointment.cancellationReason ||
                                            appointment.cancelReason}
                                    </p>
                                )}

                            <Space wrap>
                                <Button
                                    icon={<EyeOutlined />}
                                    onClick={() => openDetail(appointment)}
                                >
                                    Xem chi tiết
                                </Button>

                                {appointment.medicalRecordId && (
                                    <Link href="/dashboard/patient/medical-records">
                                        <Button icon={<FileProtectOutlined />}>
                                            Xem bệnh án
                                        </Button>
                                    </Link>
                                )}

                                {appointment.prescriptionId && (
                                    <Link href="/dashboard/patient/prescriptions">
                                        <Button icon={<MedicineBoxOutlined />}>
                                            Xem đơn thuốc
                                        </Button>
                                    </Link>
                                )}

                                {appointment.meetingUrl &&
                                    isUpcomingAppointment(appointment) && (
                                        <Button
                                            type="primary"
                                            icon={<VideoCameraOutlined />}
                                            href={appointment.meetingUrl}
                                            target="_blank"
                                        >
                                            Vào phòng khám
                                        </Button>
                                    )}
                            </Space>
                        </article>
                    ))}
                </ClinicalPageState>
            </section>

            <Drawer
                title="Chi tiết lịch hẹn"
                open={openDetailDrawer}
                width={620}
                onClose={() => setOpenDetailDrawer(false)}
                extra={
                    selectedAppointment && (
                        <Space>
                            {selectedAppointment.meetingUrl &&
                                isUpcomingAppointment(selectedAppointment) && (
                                    <Button
                                        type="primary"
                                        icon={<VideoCameraOutlined />}
                                        href={selectedAppointment.meetingUrl}
                                        target="_blank"
                                    >
                                        Vào phòng khám
                                    </Button>
                                )}
                        </Space>
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
                            <StatusTag value={selectedAppointment.status} />
                        </Descriptions.Item>

                        <Descriptions.Item label="Chuyên khoa">
                            {selectedAppointment.specialtyName || 'Chưa cập nhật'}
                        </Descriptions.Item>

                        <Descriptions.Item label="Bác sĩ">
                            {selectedAppointment.doctorName || 'Chưa chỉ định'}
                        </Descriptions.Item>

                        <Descriptions.Item label="Email bác sĩ">
                            {selectedAppointment.doctorEmail || 'Chưa cập nhật'}
                        </Descriptions.Item>

                        <Descriptions.Item label="Thời gian bắt đầu">
                            {getAppointmentTimeLabel(selectedAppointment)}
                        </Descriptions.Item>

                        <Descriptions.Item label="Thời gian kết thúc">
                            {formatDateTime(getAppointmentEnd(selectedAppointment))}
                        </Descriptions.Item>

                        <Descriptions.Item label="Loại khám">
                            {selectedAppointment.type || 'OFFLINE'}
                        </Descriptions.Item>

                        <Descriptions.Item label="Địa điểm / hình thức">
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

                        <Descriptions.Item label="Lý do hủy">
                            {selectedAppointment.cancellationReason ||
                                selectedAppointment.cancelReason ||
                                'Không có hoặc chưa bị hủy'}
                        </Descriptions.Item>

                        <Descriptions.Item label="Bệnh án">
                            {selectedAppointment.medicalRecordId ? (
                                <Link href="/dashboard/patient/medical-records">
                                    Xem bệnh án liên quan
                                </Link>
                            ) : (
                                'Chưa có bệnh án liên quan'
                            )}
                        </Descriptions.Item>

                        <Descriptions.Item label="Đơn thuốc">
                            {selectedAppointment.prescriptionId ? (
                                <Link href="/dashboard/patient/prescriptions">
                                    Xem đơn thuốc liên quan
                                </Link>
                            ) : (
                                'Chưa có đơn thuốc liên quan'
                            )}
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
        </PatientPortalFrame>
    );
}