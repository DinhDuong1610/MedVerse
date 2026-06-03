'use client';

import {
    Alert,
    Button,
    Card,
    DatePicker,
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

type AppointmentStatusFilter = AppointmentStatus | 'ALL';

type CancelFormValues = {
    reason: string;
};

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

function canModifyAppointment(appointment: Appointment) {
    return ['SCHEDULED', 'CONFIRMED'].includes(appointment.status);
}

function getAppointmentOperationalTag(appointment: Appointment) {
    if (appointment.status === 'CANCELLED') {
        return <Tag color="red">Đã hủy</Tag>;
    }

    if (appointment.status === 'NO_SHOW') {
        return <Tag color="orange">No-show</Tag>;
    }

    if (appointment.status === 'COMPLETED') {
        return <Tag color="green">Đã khám xong</Tag>;
    }

    const start = appointment.startTime
        ? new Date(appointment.startTime).getTime()
        : 0;

    if (start && start < Date.now()) {
        return <Tag color="gold">Đã qua giờ</Tag>;
    }

    if (appointment.status === 'CONFIRMED') {
        return <Tag color="cyan">Sẵn sàng khám</Tag>;
    }

    return <Tag color="blue">Chờ xác nhận</Tag>;
}

export default function ReceptionistAppointmentsPage() {
    const { session, loading: authLoading } = useAuthSession();

    const [cancelForm] = Form.useForm<CancelFormValues>();

    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());
    const [status, setStatus] = useState<AppointmentStatusFilter>('ALL');

    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [cancelOpen, setCancelOpen] = useState(false);
    const [rescheduleOpen, setRescheduleOpen] = useState(false);

    const [selectedAppointment, setSelectedAppointment] =
        useState<Appointment | null>(null);
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

            const { from, to } = getDayRange(nextDate);

            const page = await getAppointments({
                from,
                to,
                status: nextStatus === 'ALL' ? undefined : nextStatus,
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

    const openCancelModal = (appointment: Appointment) => {
        if (!canWriteAppointments) {
            message.warning('Tài khoản hiện tại không có quyền hủy lịch.');
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

            await cancelAppointment(selectedAppointment.id, values.reason);

            message.success('Đã hủy lịch hẹn.');
            setCancelOpen(false);
            setSelectedAppointment(null);
            cancelForm.resetFields();

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

    const handleNoShow = async (appointment: Appointment) => {
        if (!canWriteAppointments) {
            message.warning('Tài khoản hiện tại không có quyền đánh dấu no-show.');
            return;
        }

        try {
            setActionLoading(appointment.id);

            await markAppointmentNoShow(appointment.id);

            message.success('Đã đánh dấu no-show.');
            await loadAppointments();
        } catch (err) {
            message.error(
                err instanceof Error
                    ? err.message
                    : 'Không thể đánh dấu no-show.',
            );
        } finally {
            setActionLoading(null);
        }
    };

    const openRescheduleModal = async (appointment: Appointment) => {
        if (!canWriteAppointments) {
            message.warning('Tài khoản hiện tại không có quyền đổi lịch.');
            return;
        }

        if (!appointment.doctorId) {
            message.warning('Lịch hẹn này chưa có bác sĩ.');
            return;
        }

        try {
            setSelectedAppointment(appointment);
            setSelectedSlotId(undefined);
            setAvailableSlots([]);
            setRescheduleOpen(true);
            setActionLoading(appointment.id);

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
            setActionLoading(null);
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

    if (authLoading || !session) {
        return <ClinicalPageState loading>Loading</ClinicalPageState>;
    }

    return (
        <DashboardFrame
            session={session}
            title="Lịch hẹn"
            subtitle="Quản lý lịch hẹn trong ngày, đổi lịch, hủy lịch và đánh dấu no-show"
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
                        <Statistic title="No-show" value={metrics.noShow} />
                    </Card>
                </section>

                <Card className={styles.detailCard} style={{ marginTop: 24 }}>
                    <div className={styles.panelHeader}>
                        <div>
                            <span>Appointment board</span>
                            <h2>Lịch hẹn theo ngày</h2>
                            <p>
                                Lễ tân theo dõi toàn bộ lịch hẹn, hỗ trợ đổi
                                lịch, hủy lịch hoặc đánh dấu bệnh nhân không đến
                                khám.
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
                            message="Không thể tải appointment board"
                            description={error}
                            style={{ marginBottom: 16 }}
                        />
                    )}

                    <ClinicalPageState loading={loading}>
                        {appointments.length === 0 ? (
                            <ClinicalEmptyState
                                title="Chưa có lịch hẹn"
                                description="Không tìm thấy lịch hẹn nào theo ngày và trạng thái hiện tại."
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
                                                        {appointment.patientName ||
                                                            'Bệnh nhân'}
                                                    </strong>

                                                    <Space wrap>
                                                        <StatusTag
                                                            value={
                                                                appointment.status
                                                            }
                                                        />

                                                        {getAppointmentOperationalTag(
                                                            appointment,
                                                        )}

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
                                                        Bác sĩ:{' '}
                                                        <b>
                                                            {appointment.doctorName ||
                                                                'Chưa rõ bác sĩ'}
                                                        </b>
                                                    </p>

                                                    <p>
                                                        Thời gian:{' '}
                                                        <b>
                                                            {formatDateTime(
                                                                appointment.startTime,
                                                            )}
                                                        </b>{' '}
                                                        →{' '}
                                                        {formatTime(
                                                            appointment.endTime,
                                                        )}
                                                    </p>

                                                    <p>
                                                        Ghi chú:{' '}
                                                        {appointment.diagnosis ||
                                                            'Chưa có ghi chú.'}
                                                    </p>

                                                    <div
                                                        className={
                                                            styles.caseMeta
                                                        }
                                                    >
                                                        <span>
                                                            Patient ID:{' '}
                                                            <b>
                                                                {
                                                                    appointment.patientId
                                                                }
                                                            </b>
                                                        </span>

                                                        <span>
                                                            Doctor ID:{' '}
                                                            <b>
                                                                {
                                                                    appointment.doctorId
                                                                }
                                                            </b>
                                                        </span>
                                                    </div>
                                                </div>
                                            }
                                        />

                                        <Space wrap>
                                            <Button
                                                disabled={
                                                    !canWriteAppointments ||
                                                    !canModifyAppointment(
                                                        appointment,
                                                    )
                                                }
                                                loading={
                                                    actionLoading ===
                                                    appointment.id
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
                                                disabled={
                                                    !canWriteAppointments ||
                                                    !canModifyAppointment(
                                                        appointment,
                                                    )
                                                }
                                                loading={
                                                    actionLoading ===
                                                    appointment.id
                                                }
                                                onClick={() =>
                                                    openCancelModal(appointment)
                                                }
                                            >
                                                Hủy lịch
                                            </Button>

                                            <Popconfirm
                                                title="Đánh dấu no-show?"
                                                description="Chỉ dùng khi bệnh nhân không đến khám theo lịch."
                                                okText="No-show"
                                                cancelText="Đóng"
                                                onConfirm={() =>
                                                    handleNoShow(appointment)
                                                }
                                            >
                                                <Button
                                                    disabled={
                                                        !canWriteAppointments ||
                                                        !canModifyAppointment(
                                                            appointment,
                                                        )
                                                    }
                                                    loading={
                                                        actionLoading ===
                                                        appointment.id
                                                    }
                                                >
                                                    No-show
                                                </Button>
                                            </Popconfirm>
                                        </Space>
                                    </List.Item>
                                )}
                            />
                        )}
                    </ClinicalPageState>
                </Card>

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
                >
                    <Alert
                        type="info"
                        showIcon
                        message="Chọn slot mới cho lịch hẹn"
                        description="Slot cũ sẽ được mở lại, slot mới sẽ được đặt thành BOOKED sau khi đổi lịch."
                        style={{ marginBottom: 16 }}
                    />

                    <p>
                        Bệnh nhân:{' '}
                        <b>{selectedAppointment?.patientName || 'N/A'}</b>
                    </p>

                    <p>
                        Bác sĩ:{' '}
                        <b>{selectedAppointment?.doctorName || 'N/A'}</b>
                    </p>

                    <p>
                        Lịch hiện tại:{' '}
                        <b>
                            {formatDateTime(selectedAppointment?.startTime)} →{' '}
                            {formatTime(selectedAppointment?.endTime)}
                        </b>
                    </p>

                    <Select
                        value={selectedSlotId}
                        onChange={setSelectedSlotId}
                        placeholder="Chọn slot mới"
                        style={{ width: '100%', marginTop: 12 }}
                        options={availableSlots.map((slot) => ({
                            value: slot.id,
                            label: `${formatDateTime(slot.startTime)} → ${formatTime(
                                slot.endTime,
                            )}`,
                        }))}
                    />

                    {availableSlots.length === 0 && (
                        <Alert
                            type="warning"
                            showIcon
                            message="Không có slot khả dụng"
                            description="Bác sĩ này chưa có slot trống để đổi lịch. Hãy yêu cầu bác sĩ tạo thêm slot làm việc."
                            style={{ marginTop: 12 }}
                        />
                    )}
                </Modal>

                <Modal
                    title="Hủy lịch hẹn"
                    open={cancelOpen}
                    onCancel={() => {
                        setCancelOpen(false);
                        setSelectedAppointment(null);
                        cancelForm.resetFields();
                    }}
                    footer={null}
                    destroyOnClose
                >
                    <Form
                        form={cancelForm}
                        layout="vertical"
                        onFinish={handleCancelAppointment}
                    >
                        <Alert
                            type="warning"
                            showIcon
                            message="Lịch hẹn sẽ bị hủy"
                            description="Slot làm việc liên quan sẽ được mở lại nếu lịch hẹn có gắn work slot."
                            style={{ marginBottom: 16 }}
                        />

                        <p>
                            Bệnh nhân:{' '}
                            <b>{selectedAppointment?.patientName || 'N/A'}</b>
                        </p>

                        <p>
                            Thời gian:{' '}
                            <b>
                                {formatDateTime(
                                    selectedAppointment?.startTime,
                                )}{' '}
                                → {formatTime(selectedAppointment?.endTime)}
                            </b>
                        </p>

                        <Form.Item
                            label="Lý do hủy"
                            name="reason"
                            rules={[
                                {
                                    required: true,
                                    message: 'Nhập lý do hủy lịch',
                                },
                            ]}
                        >
                            <Input.TextArea
                                rows={4}
                                placeholder="Ví dụ: Bệnh nhân yêu cầu hủy, bác sĩ bận đột xuất..."
                            />
                        </Form.Item>

                        <Button
                            danger
                            htmlType="submit"
                            block
                            loading={
                                !!selectedAppointment &&
                                actionLoading === selectedAppointment.id
                            }
                        >
                            Xác nhận hủy lịch
                        </Button>
                    </Form>
                </Modal>
            </RoleGuardState>
        </DashboardFrame>
    );
}