'use client';

import {
    Button,
    Card,
    DatePicker,
    Form,
    Input,
    List,
    Modal,
    Select,
    Space,
    Statistic,
    message,
} from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { useEffect, useMemo, useState } from 'react';
import ClinicalEmptyState from '../../_components/ClinicalEmptyState';
import ClinicalPageState from '../../_components/ClinicalPageState';
import DashboardFrame from '../../_components/DashboardFrame';
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
import type { Appointment, AppointmentStatus, WorkSlot } from '@/types/clinical';
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

function canChangeAppointment(appointment: Appointment) {
    return ['SCHEDULED', 'CONFIRMED'].includes(appointment.status);
}

function getDayRange(date: Dayjs) {
    return {
        from: date.startOf('day').toISOString(),
        to: date.endOf('day').toISOString(),
    };
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

    const [rescheduleOpen, setRescheduleOpen] = useState(false);
    const [cancelOpen, setCancelOpen] = useState(false);

    const [selectedAppointment, setSelectedAppointment] =
        useState<Appointment | null>(null);
    const [availableSlots, setAvailableSlots] = useState<WorkSlot[]>([]);
    const [selectedSlotId, setSelectedSlotId] = useState<string | undefined>();

    const canWriteAppointment = hasAnyPermission(session, [
        'APPOINTMENT:WRITE_ANY',
    ]);

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
                status: nextStatus,
                size: 100,
            });

            setAppointments(page.content || []);
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

        if (!hasAnyPermission(session, ['APPOINTMENT:READ_ANY'])) {
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

    const openRescheduleModal = async (appointment: Appointment) => {
        if (!appointment.doctorId) {
            message.warning('Lịch hẹn chưa có bác sĩ để tải slot.');
            return;
        }

        try {
            setSelectedAppointment(appointment);
            setAvailableSlots([]);
            setSelectedSlotId(undefined);
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

    const openCancelModal = (appointment: Appointment) => {
        setSelectedAppointment(appointment);
        cancelForm.resetFields();
        setCancelOpen(true);
    };

    const handleCancel = async (values: CancelFormValues) => {
        if (!selectedAppointment) return;

        try {
            setActionLoading(selectedAppointment.id);

            await cancelAppointment(selectedAppointment.id, values.reason);

            message.success('Đã hủy lịch hẹn.');
            setCancelOpen(false);
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

    const handleNoShow = (appointment: Appointment) => {
        Modal.confirm({
            title: 'Đánh dấu bệnh nhân không đến?',
            content:
                'Trạng thái lịch hẹn sẽ được chuyển thành NO_SHOW. Thao tác này nên dùng khi đã quá giờ khám và bệnh nhân không xuất hiện.',
            okText: 'Đánh dấu NO_SHOW',
            cancelText: 'Đóng',
            okButtonProps: {
                danger: true,
            },
            onOk: async () => {
                try {
                    setActionLoading(appointment.id);

                    await markAppointmentNoShow(appointment.id);

                    message.success('Đã đánh dấu NO_SHOW.');
                    await loadAppointments();
                } catch (err) {
                    message.error(
                        err instanceof Error
                            ? err.message
                            : 'Không thể đánh dấu NO_SHOW.',
                    );
                } finally {
                    setActionLoading(null);
                }
            },
        });
    };

    if (authLoading || !session) {
        return <ClinicalPageState loading>Loading</ClinicalPageState>;
    }

    return (
        <DashboardFrame
            session={session}
            title="Điều phối lịch hẹn"
            subtitle="Theo dõi, đổi lịch, hủy lịch và xử lý no-show"
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
                        <Statistic
                            title="Đang chờ"
                            value={metrics.scheduled}
                        />
                    </Card>

                    <Card className={styles.metricCard}>
                        <Statistic
                            title="Đã xác nhận"
                            value={metrics.confirmed}
                        />
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

                    <ClinicalPageState loading={loading} error={error}>
                        {appointments.length === 0 ? (
                            <ClinicalEmptyState
                                title="Chưa có lịch hẹn"
                                description="Không tìm thấy lịch hẹn nào theo bộ lọc hiện tại."
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

                                                    <StatusTag
                                                        value={
                                                            appointment.status
                                                        }
                                                    />
                                                </div>
                                            }
                                            description={
                                                <div>
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
                                                            {new Date(
                                                                appointment.startTime,
                                                            ).toLocaleString(
                                                                'vi-VN',
                                                            )}
                                                        </b>{' '}
                                                        →{' '}
                                                        {new Date(
                                                            appointment.endTime,
                                                        ).toLocaleTimeString(
                                                            'vi-VN',
                                                        )}
                                                    </p>

                                                    <p>
                                                        Hình thức:{' '}
                                                        <b>
                                                            {appointment.type ||
                                                                'OFFLINE'}
                                                        </b>
                                                    </p>

                                                    <p>
                                                        Ghi chú:{' '}
                                                        {appointment.diagnosis ||
                                                            'Chưa có ghi chú.'}
                                                    </p>
                                                </div>
                                            }
                                        />

                                        <Space wrap>
                                            <Button
                                                disabled={
                                                    !canWriteAppointment ||
                                                    !canChangeAppointment(
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
                                                    !canWriteAppointment ||
                                                    !canChangeAppointment(
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

                                            <Button
                                                disabled={
                                                    !canWriteAppointment ||
                                                    !canChangeAppointment(
                                                        appointment,
                                                    )
                                                }
                                                loading={
                                                    actionLoading ===
                                                    appointment.id
                                                }
                                                onClick={() =>
                                                    handleNoShow(appointment)
                                                }
                                            >
                                                No-show
                                            </Button>
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
                    okText="Đổi lịch"
                    cancelText="Đóng"
                    confirmLoading={
                        !!selectedAppointment &&
                        actionLoading === selectedAppointment.id
                    }
                >
                    <p>
                        Bệnh nhân:{' '}
                        <b>{selectedAppointment?.patientName || 'N/A'}</b>
                    </p>

                    <p>
                        Bác sĩ:{' '}
                        <b>{selectedAppointment?.doctorName || 'N/A'}</b>
                    </p>

                    <Select
                        value={selectedSlotId}
                        onChange={setSelectedSlotId}
                        placeholder="Chọn slot mới"
                        style={{ width: '100%', marginTop: 12 }}
                        options={availableSlots.map((slot) => ({
                            value: slot.id,
                            label: `${new Date(
                                slot.startTime,
                            ).toLocaleString('vi-VN')} → ${new Date(
                                slot.endTime,
                            ).toLocaleTimeString('vi-VN')}`,
                        }))}
                    />

                    {availableSlots.length === 0 && (
                        <p style={{ color: '#6a7c7a', marginTop: 12 }}>
                            Bác sĩ này chưa có slot khả dụng để đổi lịch.
                        </p>
                    )}
                </Modal>

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
                        onFinish={handleCancel}
                    >
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
                                placeholder="Ví dụ: bệnh nhân yêu cầu hủy, bác sĩ bận đột xuất..."
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
            </RoleGuardState>
        </DashboardFrame>
    );
}