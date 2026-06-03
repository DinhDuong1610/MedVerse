'use client';

import {
    Button,
    Card,
    List,
    Modal,
    Timeline,
    Typography,
    message,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';
import DashboardFrame from '../../_components/DashboardFrame';
import ClinicalEmptyState from '../../_components/ClinicalEmptyState';
import ClinicalPageState from '../../_components/ClinicalPageState';
import RoleGuardState from '../../_components/RoleGuardState';
import StatusTag from '../../_components/StatusTag';
import { useAuthSession } from '@/lib/auth/use-auth-session';
import {
    cancelAppointment,
    getAppointments,
} from '@/services/appointment.service';
import type { AuthSession } from '@/types/auth';
import type { Appointment } from '@/types/clinical';
import styles from '../../dashboard.module.scss';

type SessionWithUserId = AuthSession & {
    userId?: string;
};

export default function PatientAppointmentsPage() {
    const { session, loading: authLoading } = useAuthSession();

    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [cancellingId, setCancellingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const loadAppointments = async () => {
        if (!session) return;

        try {
            setLoading(true);
            setError(null);

            const currentSession = session as SessionWithUserId;

            const page = await getAppointments(
                currentSession.userId
                    ? {
                        patientId: currentSession.userId,
                        size: 50,
                    }
                    : {
                        size: 50,
                    },
            );

            setAppointments(page.content || []);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Không thể tải lịch hẹn. Nếu lỗi 403, backend cần endpoint /v1/appointments/me hoặc cấp quyền đọc phù hợp cho Patient.',
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!session) return;

        if (session.role !== 'PATIENT') {
            setError('Trang này chỉ dành cho bệnh nhân.');
            setLoading(false);
            return;
        }

        loadAppointments();
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
                } catch (err) {
                    message.error(
                        err instanceof Error
                            ? err.message
                            : 'Không thể hủy lịch hẹn.',
                    );
                } finally {
                    setCancellingId(null);
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
            title="Lịch hẹn của tôi"
            subtitle="Theo dõi timeline khám bệnh và trạng thái appointment"
        >
            <RoleGuardState session={session} allow={['PATIENT']}>
                <ClinicalPageState loading={loading} error={error}>
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
                                            appointment.status === 'CONFIRMED'
                                                ? 'cyan'
                                                : 'blue',
                                        children: (
                                            <div>
                                                <div className={styles.listTitle}>
                                                    <strong>
                                                        {new Date(
                                                            appointment.startTime,
                                                        ).toLocaleString('vi-VN')}
                                                    </strong>

                                                    <StatusTag
                                                        value={appointment.status}
                                                    />
                                                </div>

                                                <Typography.Paragraph>
                                                    Bác sĩ:{' '}
                                                    <b>
                                                        {appointment.doctorName ||
                                                            'Chưa rõ bác sĩ'}
                                                    </b>
                                                </Typography.Paragraph>

                                                <Typography.Paragraph>
                                                    Loại khám:{' '}
                                                    <b>
                                                        {appointment.type || 'OFFLINE'}
                                                    </b>
                                                </Typography.Paragraph>

                                                <Button
                                                    danger
                                                    loading={
                                                        cancellingId ===
                                                        appointment.id
                                                    }
                                                    onClick={() =>
                                                        handleCancel(appointment)
                                                    }
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
                                        <List.Item
                                            className={styles.cleanListItem}
                                        >
                                            <List.Item.Meta
                                                title={
                                                    <div className={styles.listTitle}>
                                                        <strong>
                                                            {new Date(
                                                                appointment.startTime,
                                                            ).toLocaleString(
                                                                'vi-VN',
                                                            )}
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
                                                                    'Chưa rõ bác sĩ'}
                                                            </b>
                                                        </p>
                                                        <p>
                                                            {appointment.diagnosis ||
                                                                'Không có ghi chú.'}
                                                        </p>
                                                    </div>
                                                }
                                            />
                                        </List.Item>
                                    )}
                                />
                            )}
                        </Card>
                    </div>
                </ClinicalPageState>
            </RoleGuardState>
        </DashboardFrame>
    );
}