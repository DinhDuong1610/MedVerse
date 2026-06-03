'use client';

import {
    Alert,
    Button,
    Card,
    DatePicker,
    Form,
    List,
    Modal,
    Skeleton,
    Space,
    Tag,
    TimePicker,
    message,
} from 'antd';
import dayjs from 'dayjs';
import { useEffect, useMemo, useState } from 'react';
import DashboardFrame from '../../_components/DashboardFrame';
import ClinicalEmptyState from '../../_components/ClinicalEmptyState';
import { useAuthSession } from '@/lib/auth/use-auth-session';
import { getDirectoryDoctors } from '@/services/directory.service';
import {
    createWorkSlot,
    deleteWorkSlot,
    getWorkSlots,
} from '@/services/work-slot.service';
import type { WorkSlot } from '@/types/clinical';
import styles from '../../dashboard.module.scss';
import error from 'next/error';

type SlotFormValues = {
    date: dayjs.Dayjs;
    timeRange: [dayjs.Dayjs, dayjs.Dayjs];
};

const statusColor: Record<string, string> = {
    AVAILABLE: 'green',
    BOOKED: 'blue',
    CANCELLED: 'red',
};

export default function DoctorWorkSlotsPage() {
    const { session, loading: authLoading } = useAuthSession();

    const [form] = Form.useForm<SlotFormValues>();

    const [slots, setSlots] = useState<WorkSlot[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [openCreate, setOpenCreate] = useState(false);
    const [doctorId, setDoctorId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const from = useMemo(() => dayjs().startOf('day').toISOString(), []);
    const to = useMemo(() => dayjs().add(30, 'day').endOf('day').toISOString(), []);

    const resolveDoctorId = async () => {
        if (!session) return null;

        // Nếu sau này AuthSession có userId thì dùng luôn
        if ('userId' in session && session.userId) {
            return session.userId;
        }

        // Hiện tại AuthSession chưa có userId,
        // nên lấy doctorId từ Directory API theo email
        const doctors = await getDirectoryDoctors({
            keyword: session.email,
        });

        const matchedDoctor =
            doctors.find((doctor) => doctor.email === session.email) || doctors[0];

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
                    'Không tìm thấy doctorId cho tài khoản hiện tại. Hãy kiểm tra Directory API hoặc doctor profile.',
                );
                return;
            }

            const data = await getWorkSlots({
                doctorId: currentDoctorId,
                from,
                to,
            });

            setSlots(data);
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

        if (session.role !== 'DOCTOR') {
            setError('Trang này chỉ dành cho bác sĩ.');
            setLoading(false);
            return;
        }

        loadSlots();
    }, [session]);

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

            await createWorkSlot({
                startTime: start.format(),
                endTime: end.format(),
            });

            message.success('Đã tạo slot làm việc.');
            form.resetFields();
            setOpenCreate(false);
            await loadSlots();
        } catch (error) {
            message.error(
                error instanceof Error ? error.message : 'Không thể tạo slot.',
            );
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async (slot: WorkSlot) => {
        Modal.confirm({
            title: 'Xóa slot làm việc?',
            content: 'Chỉ có thể xóa slot chưa được đặt lịch.',
            okText: 'Xóa',
            cancelText: 'Đóng',
            okButtonProps: { danger: true },
            onOk: async () => {
                try {
                    setDeletingId(slot.id);

                    await deleteWorkSlot(slot.id);
                    message.success('Đã xóa slot.');

                    await loadSlots();
                } catch (error) {
                    message.error(
                        error instanceof Error ? error.message : 'Không thể xóa slot.',
                    );
                } finally {
                    setDeletingId(null);
                }
            },
        });
    };

    if (authLoading || !session || loading) {
        return <Skeleton active paragraph={{ rows: 8 }} />;
    }

    const availableCount = slots.filter((slot) => slot.status === 'AVAILABLE').length;
    const bookedCount = slots.filter((slot) => slot.status === 'BOOKED').length;

    return (
        <DashboardFrame
            session={session}
            title="Slot làm việc"
            subtitle="Tạo và quản lý khung giờ khám để lễ tân có thể duyệt lịch"
        >

            <div className={styles.detailGrid}>
                {error && (
                    <Alert
                        type="error"
                        showIcon
                        message="Không thể tải slot làm việc"
                        description={error}
                        style={{ marginBottom: 16 }}
                    />
                )}
                <Card className={styles.detailCard}>
                    <div className={styles.panelHeader}>
                        <div>
                            <span>Doctor availability</span>
                            <h2>Khung giờ trong 30 ngày tới</h2>
                            <p>
                                Available: <b>{availableCount}</b> · Booked:{' '}
                                <b>{bookedCount}</b>
                            </p>
                        </div>

                        <Button type="primary" onClick={() => setOpenCreate(true)}>
                            Tạo slot mới
                        </Button>
                    </div>

                    {slots.length === 0 ? (
                        <ClinicalEmptyState
                            title="Chưa có slot làm việc"
                            description="Tạo slot để lễ tân có thể gán lịch khám cho bệnh nhân."
                        />
                    ) : (
                        <List
                            dataSource={slots}
                            renderItem={(slot) => (
                                <List.Item className={styles.cleanListItem}>
                                    <List.Item.Meta
                                        title={
                                            <div className={styles.listTitle}>
                                                <strong>
                                                    {new Date(slot.startTime).toLocaleString('vi-VN')} →{' '}
                                                    {new Date(slot.endTime).toLocaleTimeString('vi-VN')}
                                                </strong>
                                                <Tag color={statusColor[slot.status] || 'default'}>
                                                    {slot.status}
                                                </Tag>
                                            </div>
                                        }
                                        description={slot.doctorName || session.email}
                                    />

                                    <Button
                                        danger
                                        disabled={slot.status !== 'AVAILABLE'}
                                        loading={deletingId === slot.id}
                                        onClick={() => handleDelete(slot)}
                                    >
                                        Xóa
                                    </Button>
                                </List.Item>
                            )}
                        />
                    )}
                </Card>
            </div>

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
                    initialValues={{
                        date: dayjs().add(1, 'day'),
                    }}
                >
                    <Form.Item
                        label="Ngày khám"
                        name="date"
                        rules={[{ required: true, message: 'Chọn ngày' }]}
                    >
                        <DatePicker
                            style={{ width: '100%' }}
                            disabledDate={(current) =>
                                current ? current <= dayjs().endOf('day') : false
                            }
                        />
                    </Form.Item>

                    <Form.Item
                        label="Khoảng giờ"
                        name="timeRange"
                        rules={[{ required: true, message: 'Chọn khoảng giờ' }]}
                    >
                        <TimePicker.RangePicker
                            format="HH:mm"
                            style={{ width: '100%' }}
                        />
                    </Form.Item>

                    <Button type="primary" htmlType="submit" loading={creating} block>
                        Tạo slot
                    </Button>
                </Form>
            </Modal>
        </DashboardFrame>
    );
}