'use client';

import {
    Button,
    Card,
    List,
    Modal,
    Skeleton,
    Tag,
    Timeline,
    Typography,
    message,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';
import DashboardFrame from '../../_components/DashboardFrame';
import ClinicalEmptyState from '../../_components/ClinicalEmptyState';
import { useAuthSession } from '@/lib/auth/use-auth-session';
import {
    cancelAppointment,
    getAppointments,
} from '@/services/appointment.service';
import type { Appointment } from '@/types/clinical';
import styles from '../../dashboard.module.scss';

const statusColor: Record<string, string> = {
    SCHEDULED: 'blue',
    CONFIRMED: 'cyan',
    COMPLETED: 'green',
    CANCELLED: 'red',
    NO_SHOW: 'orange',
};

export default function PatientAppointmentsPage() {
    const { session, loading: authLoading } = useAuthSession();

    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [cancellingId, setCancellingId] = useState<string | null>(null);

    const loadAppointments = async () => {
        try {
            setLoading(true);

            const page = await getAppointments({
                patientId: session?.userId,
                size: 50,
            });

            setAppointments(page.content || []);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (session?.role === 'PATIENT') {
            loadAppointments();
        }
    }, [session]);

    const upcoming = useMemo(
        () =>
            appointments.filter((item) =>
                ['SCHEDULED', 'CONFIRMED'].includes(item.status),
            ),
        [appointments],
    );

    const past = useMemo(
        () =>
            appointments.filter((item) =>
                ['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(item.status),
            ),
        [appointments],
    );

    const handleCancel = async (appointment: Appointment) => {
        Modal.confirm({
            title: 'Hủy lịch hẹn?',
            content:
                'Lịch hẹn sau khi hủy sẽ không còn hiệu lực. Bạn có thể gửi yêu cầu đặt lịch mới nếu cần.',
            okText: 'Hủy lịch hẹn',
            cancelText: 'Đóng',
            okButtonProps: { danger: true },
            onOk: async () => {
                try {
                    setCancellingId(appointment.id);

                    await cancelAppointment(
                        appointment.id,
                        'Patient cancelled from MedVerse portal.',
                    );

                    message.success('Đã hủy lịch hẹn.');
                    await loadAppointments();
                } catch (error) {
                    message.error(
                        error instanceof Error
                            ? error.message
                            : 'Không thể hủy lịch hẹn.',
                    );
                } finally {
                    setCancellingId(null);
                }
            },
        });
    };

    if (authLoading || !session || loading) {
        return <Skeleton active paragraph={{ rows: 8 }} />;
    }

    return (
        <DashboardFrame
            session={session}
            title="Lịch hẹn của tôi"
            subtitle="Theo dõi timeline khám bệnh và trạng thái appointment"
        >
            <div className={styles.detailGrid}>
                <Card className={styles.detailCard} title="Timeline sắp tới">
                    {upcoming.length === 0 ? (
                        <ClinicalEmptyState
                            title="Chưa có lịch hẹn sắp tới"
                            description="Sau khi lễ tân duyệt yêu cầu, lịch hẹn sẽ xuất hiện tại đây."
                        />
                    ) : (
                        <Timeline
                            items={upcoming.map((appointment) => ({
                                color:
                                    appointment.status === 'CONFIRMED' ? 'cyan' : 'blue',
                                children: (
                                    <div>
                                        <div className={styles.listTitle}>
                                            <strong>
                                                {new Date(appointment.startTime).toLocaleString('vi-VN')}
                                            </strong>
                                            <Tag color={statusColor[appointment.status]}>
                                                {appointment.status}
                                            </Tag>
                                        </div>

                                        <Typography.Paragraph>
                                            Bác sĩ:{' '}
                                            <b>{appointment.doctorName || 'Chưa rõ bác sĩ'}</b>
                                        </Typography.Paragraph>

                                        <Typography.Paragraph>
                                            Loại khám: <b>{appointment.type || 'OFFLINE'}</b>
                                        </Typography.Paragraph>

                                        <Button
                                            danger
                                            loading={cancellingId === appointment.id}
                                            onClick={() => handleCancel(appointment)}
                                        >
                                            Hủy lịch hẹn
                                        </Button>
                                    </div>
                                ),
                            }))}
                        />
                    )}
                </Card>

                <Card className={styles.detailCard} title="Lịch sử lịch hẹn">
                    {past.length === 0 ? (
                        <ClinicalEmptyState
                            title="Chưa có lịch sử"
                            description="Các lịch đã hoàn tất hoặc đã hủy sẽ hiển thị ở đây."
                        />
                    ) : (
                        <List
                            dataSource={past}
                            renderItem={(appointment) => (
                                <List.Item className={styles.cleanListItem}>
                                    <List.Item.Meta
                                        title={
                                            <div className={styles.listTitle}>
                                                <strong>
                                                    {new Date(appointment.startTime).toLocaleString('vi-VN')}
                                                </strong>
                                                <Tag color={statusColor[appointment.status] || 'default'}>
                                                    {appointment.status}
                                                </Tag>
                                            </div>
                                        }
                                        description={
                                            <div>
                                                <p>
                                                    Bác sĩ:{' '}
                                                    <b>{appointment.doctorName || 'Chưa rõ bác sĩ'}</b>
                                                </p>
                                                <p>{appointment.diagnosis || 'Không có ghi chú.'}</p>
                                            </div>
                                        }
                                    />
                                </List.Item>
                            )}
                        />
                    )}
                </Card>
            </div>
        </DashboardFrame>
    );
}