'use client';

import {
    CalendarOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    DeleteOutlined,
    FieldTimeOutlined,
    PlusOutlined,
    ReloadOutlined,
    SearchOutlined,
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
    Select,
    Space,
    Statistic,
    Tag,
    TimePicker,
    message,
} from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { useEffect, useMemo, useState } from 'react';
import DashboardFrame from '../../_components/DashboardFrame';
import ClinicalEmptyState from '../../_components/ClinicalEmptyState';
import ClinicalPageState from '../../_components/ClinicalPageState';
import RoleGuardState from '../../_components/RoleGuardState';
import StatusTag from '../../_components/StatusTag';
import { hasRole } from '@/lib/auth/roles';
import { useAuthSession } from '@/lib/auth/use-auth-session';
import { getDirectoryDoctors } from '@/services/directory.service';
import {
    createWorkSlot,
    deleteWorkSlot,
    getWorkSlots,
} from '@/services/work-slot.service';
import type { WorkSlot } from '@/types/clinical';
import styles from '../../dashboard.module.scss';

type SlotFormValues = {
    date: Dayjs;
    timeRange: [Dayjs, Dayjs];
};

type SlotStatusFilter = 'ALL' | 'AVAILABLE' | 'BOOKED' | 'CANCELLED' | string;

type WorkSlotView = WorkSlot & {
    doctorName?: string;
    doctorEmail?: string;
    appointmentId?: string;
    patientName?: string;
    createdAt?: string;
    updatedAt?: string;
};

type SessionLike = {
    id?: string;
    userId?: string;
    email?: string;
    role?: string;
    user?: {
        id?: string;
        userId?: string;
        email?: string;
        fullName?: string;
        role?: string;
        roles?: string[];
    };
};

const statusOptions = [
    {
        label: 'Tất cả slot',
        value: 'ALL',
    },
    {
        label: 'Còn trống',
        value: 'AVAILABLE',
    },
    {
        label: 'Đã được đặt',
        value: 'BOOKED',
    },
    {
        label: 'Đã hủy',
        value: 'CANCELLED',
    },
];

function getSessionEmail(session: unknown) {
    const current = session as SessionLike;

    return current.user?.email || current.email || '';
}

function getSessionUserId(session: unknown) {
    const current = session as SessionLike;

    return (
        current.userId ||
        current.user?.userId ||
        current.user?.id ||
        current.id ||
        ''
    );
}

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

    const parsed = dayjs(value);

    if (!parsed.isValid()) return value;

    return parsed.format('HH:mm');
}

function formatSlotRange(slot: WorkSlotView) {
    return `${formatDateTime(slot.startTime)} → ${formatTime(slot.endTime)}`;
}

function getSlotDuration(slot: WorkSlotView) {
    const start = dayjs(slot.startTime);
    const end = dayjs(slot.endTime);

    if (!start.isValid() || !end.isValid()) return 'Chưa rõ';

    const minutes = end.diff(start, 'minute');

    if (minutes < 60) return `${minutes} phút`;

    const hours = Math.floor(minutes / 60);
    const remainMinutes = minutes % 60;

    if (remainMinutes === 0) return `${hours} giờ`;

    return `${hours} giờ ${remainMinutes} phút`;
}

function isSameDay(slot: WorkSlotView, date: Dayjs | null) {
    if (!date) return true;

    return dayjs(slot.startTime).isSame(date, 'day');
}

function canDeleteSlot(slot: WorkSlotView) {
    return String(slot.status || '').toUpperCase() === 'AVAILABLE';
}

function isPastSlot(slot: WorkSlotView) {
    return dayjs(slot.endTime).isBefore(dayjs());
}

function getSlotTone(slot: WorkSlotView) {
    const status = String(slot.status || '').toUpperCase();

    if (status === 'BOOKED') {
        return {
            color: '#16a34a',
            label: 'Đã có lịch khám',
        };
    }

    if (status === 'CANCELLED') {
        return {
            color: '#ef4444',
            label: 'Đã hủy',
        };
    }

    if (isPastSlot(slot)) {
        return {
            color: '#64748b',
            label: 'Đã qua giờ',
        };
    }

    return {
        color: '#2563eb',
        label: 'Còn trống',
    };
}

function sortSlots(a: WorkSlotView, b: WorkSlotView) {
    return String(a.startTime || '').localeCompare(String(b.startTime || ''));
}

function hasOverlap(slots: WorkSlotView[], start: Dayjs, end: Dayjs) {
    return slots.some((slot) => {
        const slotStatus = String(slot.status || '').toUpperCase();

        if (slotStatus === 'CANCELLED') return false;

        const slotStart = dayjs(slot.startTime);
        const slotEnd = dayjs(slot.endTime);

        if (!slotStart.isValid() || !slotEnd.isValid()) return false;

        return start.isBefore(slotEnd) && end.isAfter(slotStart);
    });
}

function getStatusCount(slots: WorkSlotView[], status: string) {
    return slots.filter(
        (slot) => String(slot.status || '').toUpperCase() === status,
    ).length;
}

function ActionButton({
    children,
    type = 'default',
    onClick,
    disabled,
}: {
    children: string;
    type?: 'primary' | 'default';
    onClick: () => void;
    disabled?: boolean;
}) {
    const isPrimary = type === 'primary';

    return (
        <button
            type="button"
            disabled={disabled}
            onClick={onClick}
            style={{
                minHeight: 42,
                minWidth: 132,
                padding: '0 20px',
                borderRadius: 999,
                border: isPrimary ? 'none' : '1px solid #dbe4f0',
                background: isPrimary ? '#14b8a6' : '#ffffff',
                color: isPrimary ? '#ffffff' : '#0f766e',
                fontWeight: 800,
                fontSize: 13,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.6 : 1,
                boxShadow: isPrimary
                    ? '0 14px 28px rgba(20, 184, 166, 0.28)'
                    : '0 10px 24px rgba(15, 23, 42, 0.06)',
            }}
        >
            {children}
        </button>
    );
}

export default function DoctorWorkSlotsPage() {
    const { session, loading: authLoading } = useAuthSession();

    const [form] = Form.useForm<SlotFormValues>();

    const [doctorId, setDoctorId] = useState<string | null>(null);
    const [slots, setSlots] = useState<WorkSlotView[]>([]);
    const [keyword, setKeyword] = useState('');
    const [status, setStatus] = useState<SlotStatusFilter>('ALL');
    const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null);

    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [openCreate, setOpenCreate] = useState(false);
    const [openDetail, setOpenDetail] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState<WorkSlotView | null>(null);
    const [error, setError] = useState<string | null>(null);

    const from = useMemo(() => dayjs().startOf('day').toISOString(), []);
    const to = useMemo(
        () => dayjs().add(30, 'day').endOf('day').toISOString(),
        [],
    );

    const resolveDoctorId = async () => {
        if (!session) return null;

        const currentUserId = getSessionUserId(session);

        if (currentUserId) {
            return currentUserId;
        }

        const email = getSessionEmail(session);

        const doctors = await getDirectoryDoctors();

        const matchedDoctor =
            doctors.find((doctor) => doctor.email === email) || doctors[0];

        return matchedDoctor?.userId || null;
    };

    const loadSlots = async () => {
        if (!session) return;

        try {
            setLoading(true);
            setError(null);

            let currentDoctorId = doctorId;

            if (!currentDoctorId) {
                currentDoctorId = await resolveDoctorId();
                setDoctorId(currentDoctorId);
            }

            if (!currentDoctorId) {
                setSlots([]);
                setError(
                    'Không tìm thấy hồ sơ bác sĩ của tài khoản hiện tại. Hãy kiểm tra tài khoản bác sĩ hoặc dữ liệu doctor profile.',
                );
                return;
            }

            const data = await getWorkSlots({
                doctorId: currentDoctorId,
                from,
                to,
            });

            setSlots([...(data as WorkSlotView[])].sort(sortSlots));
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Không thể tải danh sách slot làm việc.',
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!session) return;

        if (!hasRole(session, 'DOCTOR')) {
            setError('Trang này chỉ dành cho bác sĩ.');
            setLoading(false);
            return;
        }

        loadSlots();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session]);

    const filteredSlots = useMemo(() => {
        const search = normalizeKeyword(keyword);

        return slots.filter((slot) => {
            const slotStatus = String(slot.status || '').toUpperCase();

            const matchStatus = status === 'ALL' || slotStatus === status;
            const matchDate = isSameDay(slot, selectedDate);

            const matchKeyword =
                !search ||
                slot.doctorName?.toLowerCase().includes(search) ||
                slot.doctorEmail?.toLowerCase().includes(search) ||
                slot.patientName?.toLowerCase().includes(search) ||
                slot.status?.toLowerCase().includes(search);

            return matchStatus && matchDate && matchKeyword;
        });
    }, [slots, keyword, status, selectedDate]);

    const metrics = useMemo(() => {
        const available = getStatusCount(slots, 'AVAILABLE');
        const booked = getStatusCount(slots, 'BOOKED');
        const cancelled = getStatusCount(slots, 'CANCELLED');

        const pastAvailable = slots.filter(
            (slot) =>
                String(slot.status).toUpperCase() === 'AVAILABLE' &&
                isPastSlot(slot),
        ).length;

        return {
            total: slots.length,
            available,
            booked,
            cancelled,
            pastAvailable,
        };
    }, [slots]);

    const upcomingAvailableSlots = useMemo(() => {
        return slots
            .filter(
                (slot) =>
                    String(slot.status).toUpperCase() === 'AVAILABLE' &&
                    !isPastSlot(slot),
            )
            .slice(0, 4);
    }, [slots]);

    const handleCreate = async (values: SlotFormValues) => {
        try {
            setCreating(true);

            const date = values.date;
            const [startTime, endTime] = values.timeRange;

            const start = date
                .hour(startTime.hour())
                .minute(startTime.minute())
                .second(0)
                .millisecond(0);

            const end = date
                .hour(endTime.hour())
                .minute(endTime.minute())
                .second(0)
                .millisecond(0);

            if (!end.isAfter(start)) {
                message.warning('Giờ kết thúc phải sau giờ bắt đầu.');
                return;
            }

            if (start.isBefore(dayjs())) {
                message.warning('Không thể tạo slot trong quá khứ.');
                return;
            }

            if (hasOverlap(slots, start, end)) {
                message.warning(
                    'Khung giờ này đang bị trùng với một slot đã có. Hãy chọn khoảng giờ khác.',
                );
                return;
            }

            await createWorkSlot({
                startTime: start.format(),
                endTime: end.format(),
            });

            message.success('Đã tạo slot làm việc.');
            form.resetFields();
            setOpenCreate(false);
            await loadSlots();
        } catch (err) {
            message.error(
                err instanceof Error ? err.message : 'Không thể tạo slot.',
            );
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async (slot: WorkSlotView) => {
        Modal.confirm({
            title: 'Xóa slot làm việc?',
            content:
                'Chỉ có thể xóa slot còn trống. Slot đã được đặt lịch sẽ không thể xóa.',
            okText: 'Xóa slot',
            cancelText: 'Đóng',
            okButtonProps: { danger: true },
            onOk: async () => {
                try {
                    setDeletingId(slot.id);

                    await deleteWorkSlot(slot.id);
                    message.success('Đã xóa slot.');

                    await loadSlots();
                } catch (err) {
                    message.error(
                        err instanceof Error ? err.message : 'Không thể xóa slot.',
                    );
                } finally {
                    setDeletingId(null);
                }
            },
        });
    };

    const handleOpenDetail = (slot: WorkSlotView) => {
        setSelectedSlot(slot);
        setOpenDetail(true);
    };

    const handleResetFilter = () => {
        setKeyword('');
        setStatus('ALL');
        setSelectedDate(null);
    };

    if (authLoading || !session) {
        return <ClinicalPageState loading>Loading</ClinicalPageState>;
    }

    return (
        <DashboardFrame
            session={session}
            title="Slot làm việc"
            subtitle="Tạo và quản lý khung giờ khám để lễ tân có thể duyệt lịch"
        >
            <RoleGuardState session={session} allow={['DOCTOR']}>
                <ClinicalPageState loading={loading} error={error}>
                    <div className={styles.roleDashboard}>
                        <section className={styles.heroCard}>
                            <div>
                                <span>Bảng lịch làm việc</span>
                                <h2>Quản lý khung giờ khám trong 30 ngày tới.</h2>
                                <p>
                                    Bác sĩ tạo các slot còn trống để lễ tân có thể
                                    duyệt yêu cầu đặt lịch. Slot đã có bệnh nhân sẽ
                                    chuyển sang trạng thái đã được đặt.
                                </p>

                                <Space wrap style={{ marginTop: 20 }}>
                                    <ActionButton
                                        type="primary"
                                        onClick={() => setOpenCreate(true)}
                                    >
                                        Tạo slot mới
                                    </ActionButton>

                                    <ActionButton onClick={loadSlots}>
                                        Làm mới
                                    </ActionButton>
                                </Space>
                            </div>

                            <div className={styles.pulseCard}>
                                <strong>{metrics.available}</strong>
                                <span>slot còn trống</span>
                            </div>
                        </section>

                        <section className={styles.metricGrid}>
                            <Card className={styles.metricCard}>
                                <Statistic
                                    title="Tổng slot"
                                    value={metrics.total}
                                    prefix={<CalendarOutlined />}
                                />
                                <p>Slot trong 30 ngày tới.</p>
                            </Card>

                            <Card className={styles.metricCard}>
                                <Statistic
                                    title="Còn trống"
                                    value={metrics.available}
                                    prefix={<ClockCircleOutlined />}
                                />
                                <p>Lễ tân có thể dùng để duyệt lịch.</p>
                            </Card>

                            <Card className={styles.metricCard}>
                                <Statistic
                                    title="Đã đặt"
                                    value={metrics.booked}
                                    prefix={<CheckCircleOutlined />}
                                />
                                <p>Đã được gắn với lịch hẹn.</p>
                            </Card>

                            <Card className={styles.metricCard}>
                                <Statistic
                                    title="Cần chú ý"
                                    value={metrics.cancelled + metrics.pastAvailable}
                                    prefix={<WarningOutlined />}
                                />
                                <p>Slot đã hủy hoặc slot trống đã qua giờ.</p>
                            </Card>
                        </section>

                        <section className={styles.detailGrid}>
                            <Card
                                className={styles.detailCard}
                                title="Slot trống sắp tới"
                            >
                                {upcomingAvailableSlots.length === 0 ? (
                                    <ClinicalEmptyState
                                        title="Chưa có slot trống sắp tới"
                                        description="Tạo thêm slot để lễ tân có thể duyệt yêu cầu đặt lịch."
                                    />
                                ) : (
                                    <Space
                                        direction="vertical"
                                        size={12}
                                        style={{ width: '100%' }}
                                    >
                                        {upcomingAvailableSlots.map((slot) => {
                                            const tone = getSlotTone(slot);

                                            return (
                                                <article
                                                    key={slot.id}
                                                    className={styles.cleanListItem}
                                                    style={{
                                                        borderRadius: 18,
                                                        padding: 16,
                                                        border: '1px solid #e5e7eb',
                                                    }}
                                                >
                                                    <div className={styles.listTitle}>
                                                        <Space wrap>
                                                            <span
                                                                style={{
                                                                    width: 36,
                                                                    height: 36,
                                                                    borderRadius: 999,
                                                                    display:
                                                                        'inline-flex',
                                                                    alignItems:
                                                                        'center',
                                                                    justifyContent:
                                                                        'center',
                                                                    color: tone.color,
                                                                    background:
                                                                        '#f8fafc',
                                                                    border:
                                                                        '1px solid #e2e8f0',
                                                                }}
                                                            >
                                                                <FieldTimeOutlined />
                                                            </span>

                                                            <strong>
                                                                {formatSlotRange(slot)}
                                                            </strong>
                                                        </Space>

                                                        <StatusTag
                                                            value={slot.status}
                                                        />
                                                    </div>

                                                    <p>
                                                        Thời lượng:{' '}
                                                        <b>{getSlotDuration(slot)}</b>
                                                    </p>

                                                    <Space wrap>
                                                        <Button
                                                            size="small"
                                                            onClick={() =>
                                                                handleOpenDetail(
                                                                    slot,
                                                                )
                                                            }
                                                        >
                                                            Chi tiết
                                                        </Button>

                                                        <Button
                                                            size="small"
                                                            danger
                                                            icon={<DeleteOutlined />}
                                                            disabled={
                                                                !canDeleteSlot(slot)
                                                            }
                                                            loading={
                                                                deletingId === slot.id
                                                            }
                                                            onClick={() =>
                                                                handleDelete(slot)
                                                            }
                                                        >
                                                            Xóa
                                                        </Button>
                                                    </Space>
                                                </article>
                                            );
                                        })}
                                    </Space>
                                )}
                            </Card>

                            <Card
                                className={styles.detailCard}
                                title="Gợi ý quản lý slot"
                            >
                                <Space
                                    direction="vertical"
                                    size={12}
                                    style={{ width: '100%' }}
                                >
                                    <Alert
                                        type="info"
                                        showIcon
                                        message="Tạo slot trước nhiều ngày"
                                        description="Nên tạo lịch làm việc trước để lễ tân có đủ slot khi duyệt yêu cầu đặt lịch."
                                    />

                                    <Alert
                                        type="success"
                                        showIcon
                                        message="Slot còn trống có thể được đặt"
                                        description="Chỉ các slot còn trống mới được dùng để tạo lịch hẹn chính thức."
                                    />

                                    <Alert
                                        type="warning"
                                        showIcon
                                        message="Không xóa slot đã được đặt"
                                        description="Slot đã có lịch hẹn nên xử lý bằng đổi lịch hoặc hủy lịch ở trang lịch hẹn."
                                    />
                                </Space>
                            </Card>
                        </section>

                        <Card className={styles.detailCard}>
                            <div className={styles.panelHeader}>
                                <div>
                                    <span>Bảng slot làm việc</span>
                                    <h2>Danh sách slot làm việc</h2>
                                    <p>
                                        Còn trống: <b>{metrics.available}</b> · Đã
                                        đặt: <b>{metrics.booked}</b> · Đã hủy:{' '}
                                        <b>{metrics.cancelled}</b>
                                    </p>
                                </div>

                                <Space wrap>
                                    <ActionButton
                                        type="primary"
                                        onClick={() => setOpenCreate(true)}
                                    >
                                        Tạo slot mới
                                    </ActionButton>

                                    <ActionButton onClick={loadSlots}>
                                        Làm mới
                                    </ActionButton>
                                </Space>
                            </div>

                            <div
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns:
                                        'minmax(260px, 1fr) 190px 200px auto',
                                    gap: 12,
                                    marginTop: 20,
                                    marginBottom: 20,
                                }}
                            >
                                <Input
                                    allowClear
                                    prefix={<SearchOutlined />}
                                    placeholder="Tìm theo bệnh nhân hoặc trạng thái"
                                    value={keyword}
                                    onChange={(event) =>
                                        setKeyword(event.target.value)
                                    }
                                />

                                <DatePicker
                                    allowClear
                                    value={selectedDate}
                                    placeholder="Lọc theo ngày"
                                    onChange={setSelectedDate}
                                />

                                <Select
                                    value={status}
                                    options={statusOptions}
                                    onChange={setStatus}
                                />

                                <Button onClick={handleResetFilter}>Đặt lại</Button>
                            </div>

                            {filteredSlots.length === 0 ? (
                                <ClinicalEmptyState
                                    title="Không có slot phù hợp"
                                    description="Bạn có thể thay đổi bộ lọc hoặc tạo slot làm việc mới."
                                />
                            ) : (
                                <List
                                    dataSource={filteredSlots}
                                    renderItem={(slot) => {
                                        const tone = getSlotTone(slot);

                                        return (
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
                                                                <span
                                                                    style={{
                                                                        width: 36,
                                                                        height: 36,
                                                                        borderRadius:
                                                                            999,
                                                                        display:
                                                                            'inline-flex',
                                                                        alignItems:
                                                                            'center',
                                                                        justifyContent:
                                                                            'center',
                                                                        color:
                                                                            tone.color,
                                                                        background:
                                                                            '#f8fafc',
                                                                        border:
                                                                            '1px solid #e2e8f0',
                                                                    }}
                                                                >
                                                                    <ClockCircleOutlined />
                                                                </span>

                                                                <strong>
                                                                    {formatSlotRange(
                                                                        slot,
                                                                    )}
                                                                </strong>
                                                            </Space>

                                                            <Space wrap>
                                                                <StatusTag
                                                                    value={
                                                                        slot.status
                                                                    }
                                                                />

                                                                <Tag color="blue">
                                                                    {getSlotDuration(
                                                                        slot,
                                                                    )}
                                                                </Tag>

                                                                {isPastSlot(slot) && (
                                                                    <Tag color="default">
                                                                        Đã qua giờ
                                                                    </Tag>
                                                                )}
                                                            </Space>
                                                        </div>
                                                    }
                                                    description={
                                                        <div>
                                                            <p>
                                                                Trạng thái vận hành:{' '}
                                                                <b>{tone.label}</b>
                                                            </p>

                                                            {slot.patientName && (
                                                                <p>
                                                                    Bệnh nhân:{' '}
                                                                    <b>
                                                                        {
                                                                            slot.patientName
                                                                        }
                                                                    </b>
                                                                </p>
                                                            )}

                                                            {slot.appointmentId && (
                                                                <p>
                                                                    Mã lịch hẹn:{' '}
                                                                    <b>
                                                                        {
                                                                            slot.appointmentId
                                                                        }
                                                                    </b>
                                                                </p>
                                                            )}
                                                        </div>
                                                    }
                                                />

                                                <Space wrap>
                                                    <Button
                                                        onClick={() =>
                                                            handleOpenDetail(slot)
                                                        }
                                                    >
                                                        Chi tiết
                                                    </Button>

                                                    <Button
                                                        danger
                                                        icon={<DeleteOutlined />}
                                                        disabled={!canDeleteSlot(slot)}
                                                        loading={
                                                            deletingId === slot.id
                                                        }
                                                        onClick={() =>
                                                            handleDelete(slot)
                                                        }
                                                    >
                                                        Xóa
                                                    </Button>
                                                </Space>
                                            </List.Item>
                                        );
                                    }}
                                />
                            )}
                        </Card>
                    </div>

                    <Drawer
                        title="Chi tiết slot làm việc"
                        open={openDetail}
                        width={560}
                        onClose={() => setOpenDetail(false)}
                        extra={
                            selectedSlot &&
                            canDeleteSlot(selectedSlot) && (
                                <Button
                                    danger
                                    icon={<DeleteOutlined />}
                                    loading={deletingId === selectedSlot.id}
                                    onClick={() => handleDelete(selectedSlot)}
                                >
                                    Xóa slot
                                </Button>
                            )
                        }
                    >
                        {selectedSlot && (
                            <Descriptions
                                bordered
                                column={1}
                                size="small"
                                title={formatSlotRange(selectedSlot)}
                            >
                                <Descriptions.Item label="Trạng thái">
                                    <StatusTag value={selectedSlot.status} />
                                </Descriptions.Item>

                                <Descriptions.Item label="Bắt đầu">
                                    {formatDateTime(selectedSlot.startTime)}
                                </Descriptions.Item>

                                <Descriptions.Item label="Kết thúc">
                                    {formatDateTime(selectedSlot.endTime)}
                                </Descriptions.Item>

                                <Descriptions.Item label="Thời lượng">
                                    {getSlotDuration(selectedSlot)}
                                </Descriptions.Item>

                                <Descriptions.Item label="Trạng thái vận hành">
                                    {getSlotTone(selectedSlot).label}
                                </Descriptions.Item>

                                <Descriptions.Item label="Bệnh nhân">
                                    {selectedSlot.patientName ||
                                        'Chưa có bệnh nhân đặt lịch'}
                                </Descriptions.Item>

                                <Descriptions.Item label="Mã lịch hẹn">
                                    {selectedSlot.appointmentId ||
                                        'Chưa gắn lịch hẹn'}
                                </Descriptions.Item>

                                <Descriptions.Item label="Ngày tạo">
                                    {formatDateTime(selectedSlot.createdAt)}
                                </Descriptions.Item>

                                <Descriptions.Item label="Cập nhật gần nhất">
                                    {formatDateTime(selectedSlot.updatedAt)}
                                </Descriptions.Item>
                            </Descriptions>
                        )}
                    </Drawer>

                    <Modal
                        title="Tạo slot làm việc"
                        open={openCreate}
                        onCancel={() => setOpenCreate(false)}
                        footer={null}
                        destroyOnClose
                    >
                        <Form
                            form={form}
                            layout="vertical"
                            onFinish={handleCreate}
                            requiredMark={false}
                            initialValues={{
                                date: dayjs().add(1, 'day'),
                            }}
                        >
                            <Alert
                                type="info"
                                showIcon
                                message="Tạo slot khám mới"
                                description="Slot sau khi tạo sẽ ở trạng thái còn trống và có thể được lễ tân dùng để duyệt lịch."
                                style={{ marginBottom: 16 }}
                            />

                            <Form.Item
                                label="Ngày khám"
                                name="date"
                                rules={[{ required: true, message: 'Chọn ngày' }]}
                            >
                                <DatePicker
                                    style={{ width: '100%' }}
                                    disabledDate={(current) =>
                                        current
                                            ? current <= dayjs().endOf('day')
                                            : false
                                    }
                                />
                            </Form.Item>

                            <Form.Item
                                label="Khoảng giờ"
                                name="timeRange"
                                rules={[
                                    {
                                        required: true,
                                        message: 'Chọn khoảng giờ',
                                    },
                                ]}
                            >
                                <TimePicker.RangePicker
                                    format="HH:mm"
                                    minuteStep={5}
                                    style={{ width: '100%' }}
                                />
                            </Form.Item>

                            <Button
                                type="primary"
                                htmlType="submit"
                                loading={creating}
                                block
                                icon={<PlusOutlined />}
                            >
                                Tạo slot
                            </Button>
                        </Form>
                    </Modal>
                </ClinicalPageState>
            </RoleGuardState>
        </DashboardFrame>
    );
}