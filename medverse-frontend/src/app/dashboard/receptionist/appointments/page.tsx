'use client';

import {
    CalendarOutlined,
    ClockCircleOutlined,
    CloseCircleOutlined,
    EyeOutlined,
    FieldTimeOutlined,
    ReloadOutlined,
    SearchOutlined,
    StopOutlined,
    SwapOutlined,
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
    Form,
    Input,
    List,
    Modal,
    Popconfirm,
    Select,
    Space,
    Statistic,
    Tag,
    message,
} from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { useEffect, useMemo, useState } from 'react';
import DashboardFrame from '../../_components/DashboardFrame';
import ClinicalEmptyState from '../../_components/ClinicalEmptyState';
import ClinicalPageState from '../../_components/ClinicalPageState';
import RoleGuardState from '../../_components/RoleGuardState';
import StatusTag from '../../_components/StatusTag';
import { hasAnyPermission } from '@/lib/auth/roles';
import { useAuthSession } from '@/lib/auth/use-auth-session';
import {
    cancelAppointment,
    getAppointments,
    markAppointmentNoShow,
    rescheduleAppointment,
} from '@/services/appointment.service';
import { getAvailableWorkSlots } from '@/services/work-slot.service';
import type {
    Appointment,
    AppointmentStatus,
    WorkSlot,
} from '@/types/clinical';
import styles from '../../dashboard.module.scss';

type AppointmentStatusFilter = AppointmentStatus | 'ALL' | string;

type AppointmentView = Appointment & {
    patientName?: string;
    patientEmail?: string;
    patientPhone?: string;

    doctorId?: string;
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

    cancelReason?: string;
    cancellationReason?: string;

    createdAt?: string;
    updatedAt?: string;
};

type CancelFormValues = {
    reason: string;
};

const statusOptions: Array<{
    value: AppointmentStatusFilter;
    label: string;
}> = [
        { value: 'ALL', label: 'Tất cả lịch hẹn' },
        { value: 'SCHEDULED', label: 'Đã lên lịch' },
        { value: 'CONFIRMED', label: 'Đã xác nhận' },
        { value: 'COMPLETED', label: 'Đã hoàn thành' },
        { value: 'CANCELLED', label: 'Đã hủy' },
        { value: 'NO_SHOW', label: 'Không đến khám' },
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

function getAppointmentStart(appointment: AppointmentView) {
    return (
        appointment.startTime ||
        appointment.scheduledAt ||
        appointment.appointmentDate ||
        appointment.createdAt
    );
}

function getAppointmentEnd(appointment: AppointmentView) {
    return appointment.endTime;
}

function getAppointmentTimeLabel(appointment: AppointmentView) {
    if (appointment.appointmentDate) {
        return `${formatDateTime(appointment.appointmentDate).split(' ')[0]} · ${appointment.appointmentTime || 'Chưa rõ giờ'
            }`;
    }

    return formatDateTime(getAppointmentStart(appointment));
}

function getAppointmentPlace(appointment: AppointmentView) {
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

function getAppointmentTitle(appointment: AppointmentView) {
    if (appointment.patientName && appointment.doctorName) {
        return `${appointment.patientName} · ${appointment.doctorName}`;
    }

    return (
        appointment.patientName ||
        appointment.doctorName ||
        appointment.specialtyName ||
        'Lịch hẹn khám'
    );
}

function getAppointmentSummary(appointment: AppointmentView) {
    return (
        appointment.symptoms ||
        appointment.reason ||
        appointment.note ||
        'Chưa có mô tả triệu chứng.'
    );
}

function canModifyAppointment(appointment: AppointmentView) {
    return ['SCHEDULED', 'CONFIRMED'].includes(
        String(appointment.status || '').toUpperCase(),
    );
}

function isUpcomingAppointment(appointment: AppointmentView) {
    return (
        canModifyAppointment(appointment) &&
        dayjs(getAppointmentStart(appointment)).isAfter(dayjs())
    );
}

function isPastActiveAppointment(appointment: AppointmentView) {
    return (
        canModifyAppointment(appointment) &&
        dayjs(getAppointmentStart(appointment)).isBefore(dayjs())
    );
}

function getOperationalTag(appointment: AppointmentView) {
    const status = String(appointment.status || '').toUpperCase();

    if (status === 'COMPLETED') return <Tag color="green">Đã khám xong</Tag>;
    if (status === 'CANCELLED') return <Tag color="red">Đã hủy</Tag>;
    if (status === 'NO_SHOW') return <Tag color="orange">Không đến khám</Tag>;

    if (isPastActiveAppointment(appointment)) {
        return <Tag color="gold">Đã qua giờ</Tag>;
    }

    if (status === 'CONFIRMED') {
        return <Tag color="cyan">Sẵn sàng khám</Tag>;
    }

    return <Tag color="blue">Đang chờ khám</Tag>;
}

function getSlotLabel(slot: WorkSlot) {
    return `${formatDateTime(slot.startTime)} → ${formatTime(slot.endTime)}`;
}

function getDayRange(date: Dayjs | null) {
    if (!date) return {};

    return {
        from: date.startOf('day').toISOString(),
        to: date.endOf('day').toISOString(),
    };
}

export default function ReceptionistAppointmentsPage() {
    const { session, loading: authLoading } = useAuthSession();

    const [cancelForm] = Form.useForm<CancelFormValues>();

    const [appointments, setAppointments] = useState<AppointmentView[]>([]);
    const [keyword, setKeyword] = useState('');
    const [status, setStatus] = useState<AppointmentStatusFilter>('ALL');
    const [selectedDate, setSelectedDate] = useState<Dayjs | null>(dayjs());

    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [slotLoading, setSlotLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [detailOpen, setDetailOpen] = useState(false);
    const [cancelOpen, setCancelOpen] = useState(false);
    const [rescheduleOpen, setRescheduleOpen] = useState(false);

    const [selectedAppointment, setSelectedAppointment] =
        useState<AppointmentView | null>(null);
    const [availableSlots, setAvailableSlots] = useState<WorkSlot[]>([]);
    const [selectedSlotId, setSelectedSlotId] = useState<string | undefined>();

    const canReadAppointments = session
        ? hasAnyPermission(session, ['APPOINTMENT:READ_ANY'])
        : false;

    const canWriteAppointments = session
        ? hasAnyPermission(session, ['APPOINTMENT:WRITE_ANY'])
        : false;

    const loadAppointments = async (
        nextDate = selectedDate,
        nextStatus = status,
    ) => {
        try {
            setLoading(true);
            setError(null);

            const range = getDayRange(nextDate);

            const page = await getAppointments({
                from: range.from,
                to: range.to,
                status: nextStatus === 'ALL' ? undefined : nextStatus,
                size: 100,
            });

            const sorted = [...((page.content || []) as AppointmentView[])].sort(
                (a, b) =>
                    String(getAppointmentStart(a) || '').localeCompare(
                        String(getAppointmentStart(b) || ''),
                    ),
            );

            setAppointments(sorted);
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

        if (!canReadAppointments) {
            setError('Tài khoản hiện tại không có quyền xem lịch hẹn.');
            setLoading(false);
            return;
        }

        loadAppointments();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session]);

    const filteredAppointments = useMemo(() => {
        const search = normalizeKeyword(keyword);

        return appointments.filter((appointment) => {
            const textMatched =
                !search ||
                appointment.patientName?.toLowerCase().includes(search) ||
                appointment.patientEmail?.toLowerCase().includes(search) ||
                appointment.patientPhone?.toLowerCase().includes(search) ||
                appointment.doctorName?.toLowerCase().includes(search) ||
                appointment.specialtyName?.toLowerCase().includes(search) ||
                appointment.reason?.toLowerCase().includes(search) ||
                appointment.symptoms?.toLowerCase().includes(search) ||
                appointment.note?.toLowerCase().includes(search) ||
                appointment.type?.toLowerCase().includes(search);

            return textMatched;
        });
    }, [appointments, keyword]);

    const metrics = useMemo(() => {
        const scheduled = appointments.filter(
            (item) => String(item.status).toUpperCase() === 'SCHEDULED',
        ).length;

        const confirmed = appointments.filter(
            (item) => String(item.status).toUpperCase() === 'CONFIRMED',
        ).length;

        const completed = appointments.filter(
            (item) => String(item.status).toUpperCase() === 'COMPLETED',
        ).length;

        const cancelled = appointments.filter((item) =>
            ['CANCELLED', 'NO_SHOW'].includes(
                String(item.status).toUpperCase(),
            ),
        ).length;

        const overdue = appointments.filter(isPastActiveAppointment).length;

        return {
            total: appointments.length,
            scheduled,
            confirmed,
            completed,
            cancelled,
            overdue,
        };
    }, [appointments]);

    const focusAppointments = useMemo(() => {
        return appointments
            .filter((item) => canModifyAppointment(item))
            .slice(0, 4);
    }, [appointments]);

    const openDetail = (appointment: AppointmentView) => {
        setSelectedAppointment(appointment);
        setDetailOpen(true);
    };

    const openCancelModal = (appointment: AppointmentView) => {
        if (!canWriteAppointments) {
            message.warning('Tài khoản hiện tại không có quyền hủy lịch hẹn.');
            return;
        }

        setSelectedAppointment(appointment);
        cancelForm.resetFields();
        setCancelOpen(true);
    };

    const handleCancelAppointment = async (values: CancelFormValues) => {
        if (!selectedAppointment) return;

        try {
            setActionLoading(selectedAppointment.id);

            await cancelAppointment(selectedAppointment.id, values.reason.trim());

            message.success('Đã hủy lịch hẹn.');
            setCancelOpen(false);
            setDetailOpen(false);
            setSelectedAppointment(null);

            await loadAppointments();
        } catch (err) {
            message.error(
                err instanceof Error
                    ? err.message
                    : 'Không thể hủy lịch hẹn.',
            );
        } finally {
            setActionLoading(null);
        }
    };

    const handleNoShow = async (appointment: AppointmentView) => {
        if (!canWriteAppointments) {
            message.warning(
                'Tài khoản hiện tại không có quyền đánh dấu không đến khám.',
            );
            return;
        }

        try {
            setActionLoading(appointment.id);

            await markAppointmentNoShow(appointment.id);

            message.success('Đã đánh dấu bệnh nhân không đến khám.');
            setDetailOpen(false);
            setSelectedAppointment(null);

            await loadAppointments();
        } catch (err) {
            message.error(
                err instanceof Error
                    ? err.message
                    : 'Không thể đánh dấu không đến khám.',
            );
        } finally {
            setActionLoading(null);
        }
    };

    const openRescheduleModal = async (appointment: AppointmentView) => {
        if (!canWriteAppointments) {
            message.warning('Tài khoản hiện tại không có quyền đổi lịch hẹn.');
            return;
        }

        if (!appointment.doctorId) {
            message.warning('Lịch hẹn này chưa có bác sĩ nên không thể tải slot.');
            return;
        }

        try {
            setSelectedAppointment(appointment);
            setSelectedSlotId(undefined);
            setAvailableSlots([]);
            setRescheduleOpen(true);
            setSlotLoading(true);

            const slots = await getAvailableWorkSlots(appointment.doctorId);

            const sortedSlots = [...slots].sort((a, b) =>
                String(a.startTime).localeCompare(String(b.startTime)),
            );

            setAvailableSlots(sortedSlots);
        } catch (err) {
            message.error(
                err instanceof Error
                    ? err.message
                    : 'Không thể tải slot khả dụng.',
            );
        } finally {
            setSlotLoading(false);
        }
    };

    const handleReschedule = async () => {
        if (!selectedAppointment || !selectedSlotId) {
            message.warning('Vui lòng chọn slot mới.');
            return;
        }

        try {
            setActionLoading(selectedAppointment.id);

            await rescheduleAppointment(selectedAppointment.id, selectedSlotId);

            message.success('Đã đổi lịch hẹn.');
            setRescheduleOpen(false);
            setDetailOpen(false);
            setSelectedAppointment(null);
            setSelectedSlotId(undefined);
            setAvailableSlots([]);

            await loadAppointments();
        } catch (err) {
            message.error(
                err instanceof Error
                    ? err.message
                    : 'Không thể đổi lịch hẹn.',
            );
        } finally {
            setActionLoading(null);
        }
    };

    const handleFilterChange = (
        nextDate = selectedDate,
        nextStatus = status,
    ) => {
        setSelectedDate(nextDate);
        setStatus(nextStatus);
        loadAppointments(nextDate, nextStatus);
    };

    const handleResetFilter = () => {
        setKeyword('');
        setStatus('ALL');
        setSelectedDate(dayjs());
        loadAppointments(dayjs(), 'ALL');
    };

    if (authLoading || !session) {
        return <ClinicalPageState loading>Loading</ClinicalPageState>;
    }

    return (
        <DashboardFrame
            session={session}
            title="Lịch hẹn"
            subtitle="Lễ tân theo dõi, đổi lịch, hủy lịch và đánh dấu no-show"
        >
            <RoleGuardState
                session={session}
                anyPermissions={['APPOINTMENT:READ_ANY', 'APPOINTMENT:WRITE_ANY']}
            >
                <div className={styles.roleDashboard}>
                    <section className={styles.heroCard}>
                        <div>
                            <span>Receptionist Appointment Board</span>
                            <h2>Theo dõi lịch hẹn chính thức trong ngày.</h2>
                            <p>
                                Trang này giúp lễ tân kiểm tra lịch khám, xử lý đổi
                                lịch, hủy lịch và ghi nhận trường hợp bệnh nhân không
                                đến khám.
                            </p>
                        </div>

                        <div className={styles.pulseCard}>
                            <strong>{metrics.total}</strong>
                            <span>lịch hẹn theo bộ lọc hiện tại</span>
                        </div>
                    </section>

                    <section className={styles.metricGrid}>
                        <Card className={styles.metricCard}>
                            <Statistic
                                title="Tổng lịch hẹn"
                                value={metrics.total}
                                prefix={<CalendarOutlined />}
                            />
                            <p>Lịch hẹn theo ngày và trạng thái đang lọc.</p>
                        </Card>

                        <Card className={styles.metricCard}>
                            <Statistic
                                title="Đã lên lịch"
                                value={metrics.scheduled}
                                prefix={<ClockCircleOutlined />}
                            />
                            <p>Cần theo dõi và xác nhận quy trình tiếp nhận.</p>
                        </Card>

                        <Card className={styles.metricCard}>
                            <Statistic
                                title="Đã xác nhận"
                                value={metrics.confirmed}
                                prefix={<FieldTimeOutlined />}
                            />
                            <p>Bệnh nhân đã sẵn sàng cho buổi khám.</p>
                        </Card>

                        <Card className={styles.metricCard}>
                            <Statistic
                                title="Cần chú ý"
                                value={metrics.overdue + metrics.cancelled}
                                prefix={<WarningOutlined />}
                            />
                            <p>Bao gồm lịch đã qua giờ, đã hủy hoặc no-show.</p>
                        </Card>
                    </section>

                    <section className={styles.detailGrid}>
                        <Card
                            className={styles.detailCard}
                            title="Lịch cần theo dõi"
                        >
                            {focusAppointments.length === 0 ? (
                                <ClinicalEmptyState
                                    title="Không có lịch đang hoạt động"
                                    description="Hiện không có lịch SCHEDULED hoặc CONFIRMED theo bộ lọc hiện tại."
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
                                                    {getOperationalTag(
                                                        appointment,
                                                    )}
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
                                                Địa điểm:{' '}
                                                <b>
                                                    {getAppointmentPlace(
                                                        appointment,
                                                    )}
                                                </b>
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

                                                <Button
                                                    size="small"
                                                    icon={<SwapOutlined />}
                                                    disabled={
                                                        !canWriteAppointments ||
                                                        !canModifyAppointment(
                                                            appointment,
                                                        )
                                                    }
                                                    onClick={() =>
                                                        openRescheduleModal(
                                                            appointment,
                                                        )
                                                    }
                                                >
                                                    Đổi lịch
                                                </Button>
                                            </Space>
                                        </article>
                                    ))}
                                </Space>
                            )}
                        </Card>

                        <Card
                            className={styles.detailCard}
                            title="Tổng quan vận hành"
                        >
                            <Space
                                direction="vertical"
                                size={12}
                                style={{ width: '100%' }}
                            >
                                <Alert
                                    type="info"
                                    showIcon
                                    message={`${metrics.scheduled + metrics.confirmed} lịch đang hoạt động`}
                                    description="Các lịch này có thể được đổi lịch, hủy hoặc đánh dấu no-show nếu cần."
                                />

                                <Alert
                                    type="success"
                                    showIcon
                                    message={`${metrics.completed} lịch đã hoàn thành`}
                                    description="Các lịch đã được bác sĩ hoàn tất sau buổi khám."
                                />

                                <Alert
                                    type="warning"
                                    showIcon
                                    message={`${metrics.overdue} lịch đã qua giờ`}
                                    description="Kiểm tra để cập nhật no-show hoặc xử lý theo quy trình phòng khám."
                                />
                            </Space>
                        </Card>
                    </section>

                    <Card className={styles.detailCard}>
                        <div className={styles.panelHeader}>
                            <div>
                                <span>Appointment board</span>
                                <h2>Danh sách lịch hẹn</h2>
                                <p>
                                    Lọc theo ngày, trạng thái và tìm nhanh theo bệnh
                                    nhân, bác sĩ hoặc chuyên khoa.
                                </p>
                            </div>

                            <Button
                                icon={<ReloadOutlined />}
                                onClick={() => loadAppointments()}
                                loading={loading}
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
                                placeholder="Tìm bệnh nhân, bác sĩ, chuyên khoa, triệu chứng"
                                value={keyword}
                                onChange={(event) =>
                                    setKeyword(event.target.value)
                                }
                            />

                            <DatePicker
                                allowClear
                                value={selectedDate}
                                placeholder="Ngày khám"
                                onChange={(value) =>
                                    handleFilterChange(value, status)
                                }
                            />

                            <Select
                                value={status}
                                options={statusOptions}
                                onChange={(value) =>
                                    handleFilterChange(selectedDate, value)
                                }
                            />

                            <Button onClick={handleResetFilter}>Đặt lại</Button>
                        </div>

                        {error && (
                            <Alert
                                type="error"
                                showIcon
                                message="Không thể tải lịch hẹn"
                                description={error}
                                style={{ marginBottom: 16 }}
                            />
                        )}

                        <ClinicalPageState loading={loading}>
                            {filteredAppointments.length === 0 ? (
                                <ClinicalEmptyState
                                    title="Không có lịch hẹn phù hợp"
                                    description="Không tìm thấy lịch hẹn nào theo bộ lọc hiện tại."
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
                                                            {getOperationalTag(
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
                                                            Bác sĩ:{' '}
                                                            <b>
                                                                {appointment.doctorName ||
                                                                    'Chưa rõ'}
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
                                                            Ghi chú:{' '}
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

                                                {canModifyAppointment(
                                                    appointment,
                                                ) && (
                                                        <>
                                                            <Button
                                                                icon={<SwapOutlined />}
                                                                disabled={
                                                                    !canWriteAppointments
                                                                }
                                                                onClick={() =>
                                                                    openRescheduleModal(
                                                                        appointment,
                                                                    )
                                                                }
                                                            >
                                                                Đổi lịch
                                                            </Button>

                                                            <Button
                                                                danger
                                                                icon={<StopOutlined />}
                                                                disabled={
                                                                    !canWriteAppointments
                                                                }
                                                                onClick={() =>
                                                                    openCancelModal(
                                                                        appointment,
                                                                    )
                                                                }
                                                            >
                                                                Hủy
                                                            </Button>

                                                            <Popconfirm
                                                                title="Đánh dấu không đến khám?"
                                                                description="Chỉ dùng khi bệnh nhân không đến buổi hẹn."
                                                                okText="Xác nhận"
                                                                cancelText="Đóng"
                                                                onConfirm={() =>
                                                                    handleNoShow(
                                                                        appointment,
                                                                    )
                                                                }
                                                            >
                                                                <Button
                                                                    icon={
                                                                        <CloseCircleOutlined />
                                                                    }
                                                                    disabled={
                                                                        !canWriteAppointments
                                                                    }
                                                                    loading={
                                                                        actionLoading ===
                                                                        appointment.id
                                                                    }
                                                                >
                                                                    No-show
                                                                </Button>
                                                            </Popconfirm>
                                                        </>
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
                    title="Chi tiết lịch hẹn"
                    open={detailOpen}
                    width={680}
                    onClose={() => setDetailOpen(false)}
                    extra={
                        selectedAppointment &&
                        canModifyAppointment(selectedAppointment) && (
                            <Space>
                                <Button
                                    icon={<SwapOutlined />}
                                    disabled={!canWriteAppointments}
                                    onClick={() =>
                                        openRescheduleModal(selectedAppointment)
                                    }
                                >
                                    Đổi lịch
                                </Button>

                                <Button
                                    danger
                                    icon={<StopOutlined />}
                                    disabled={!canWriteAppointments}
                                    onClick={() =>
                                        openCancelModal(selectedAppointment)
                                    }
                                >
                                    Hủy lịch
                                </Button>
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
                                <Space wrap>
                                    <StatusTag
                                        value={selectedAppointment.status}
                                    />
                                    {getOperationalTag(selectedAppointment)}
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

                            <Descriptions.Item label="Bác sĩ">
                                {selectedAppointment.doctorName || 'Chưa cập nhật'}
                            </Descriptions.Item>

                            <Descriptions.Item label="Email bác sĩ">
                                {selectedAppointment.doctorEmail ||
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

                            <Descriptions.Item label="Triệu chứng / lý do khám">
                                {getAppointmentSummary(selectedAppointment)}
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

                <Modal
                    title="Hủy lịch hẹn"
                    open={cancelOpen}
                    onCancel={() => {
                        setCancelOpen(false);
                        setSelectedAppointment(null);
                    }}
                    footer={null}
                    destroyOnClose
                >
                    <Form
                        form={cancelForm}
                        layout="vertical"
                        onFinish={handleCancelAppointment}
                        requiredMark={false}
                    >
                        <Alert
                            type="warning"
                            showIcon
                            message="Lịch hẹn sẽ bị hủy"
                            description="Lý do hủy sẽ được lưu để bệnh nhân và bác sĩ nắm được."
                            style={{ marginBottom: 16 }}
                        />

                        <Form.Item label="Lịch hẹn">
                            <Input
                                value={
                                    selectedAppointment
                                        ? getAppointmentTitle(selectedAppointment)
                                        : ''
                                }
                                disabled
                            />
                        </Form.Item>

                        <Form.Item
                            label="Lý do hủy"
                            name="reason"
                            rules={[
                                {
                                    required: true,
                                    message: 'Nhập lý do hủy lịch hẹn.',
                                },
                                {
                                    max: 500,
                                    message: 'Lý do tối đa 500 ký tự.',
                                },
                            ]}
                        >
                            <Input.TextArea
                                rows={4}
                                placeholder="Ví dụ: Bác sĩ bận đột xuất, bệnh nhân yêu cầu hủy..."
                            />
                        </Form.Item>

                        <Button
                            danger
                            htmlType="submit"
                            loading={
                                !!selectedAppointment &&
                                actionLoading === selectedAppointment.id
                            }
                            block
                        >
                            Xác nhận hủy lịch
                        </Button>
                    </Form>
                </Modal>

                <Modal
                    title="Đổi lịch hẹn"
                    open={rescheduleOpen}
                    onCancel={() => {
                        setRescheduleOpen(false);
                        setSelectedAppointment(null);
                        setSelectedSlotId(undefined);
                        setAvailableSlots([]);
                    }}
                    onOk={handleReschedule}
                    okText="Xác nhận đổi lịch"
                    cancelText="Đóng"
                    confirmLoading={
                        !!selectedAppointment &&
                        actionLoading === selectedAppointment.id
                    }
                    okButtonProps={{
                        disabled: !selectedSlotId,
                    }}
                    width={640}
                >
                    <Alert
                        type="info"
                        showIcon
                        message="Chọn slot mới cho lịch hẹn"
                        description="Sau khi đổi lịch, hệ thống sẽ cập nhật appointment sang slot mới."
                        style={{ marginBottom: 16 }}
                    />

                    <Descriptions bordered column={1} size="small">
                        <Descriptions.Item label="Bệnh nhân">
                            {selectedAppointment?.patientName || 'N/A'}
                        </Descriptions.Item>

                        <Descriptions.Item label="Bác sĩ">
                            {selectedAppointment?.doctorName || 'N/A'}
                        </Descriptions.Item>

                        <Descriptions.Item label="Thời gian hiện tại">
                            {selectedAppointment
                                ? getAppointmentTimeLabel(selectedAppointment)
                                : 'N/A'}
                        </Descriptions.Item>
                    </Descriptions>

                    <Select
                        value={selectedSlotId}
                        onChange={setSelectedSlotId}
                        placeholder="Chọn slot mới"
                        loading={slotLoading}
                        style={{ width: '100%', marginTop: 16 }}
                        options={availableSlots.map((slot) => ({
                            value: slot.id,
                            label: getSlotLabel(slot),
                        }))}
                    />

                    {availableSlots.length === 0 && !slotLoading && (
                        <Alert
                            type="warning"
                            showIcon
                            message="Chưa có slot khả dụng"
                            description="Bác sĩ này chưa có slot trống để đổi lịch."
                            style={{ marginTop: 12 }}
                        />
                    )}
                </Modal>
            </RoleGuardState>
        </DashboardFrame>
    );
}