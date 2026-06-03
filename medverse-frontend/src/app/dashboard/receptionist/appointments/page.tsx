'use client';

import { Card, List, Skeleton, Tag } from 'antd';
import { useEffect, useState } from 'react';
import DashboardFrame from '../../_components/DashboardFrame';
import ClinicalEmptyState from '../../_components/ClinicalEmptyState';
import { useAuthSession } from '@/lib/auth/use-auth-session';
import { getAppointments } from '@/services/appointment.service';
import type { Appointment } from '@/types/clinical';
import styles from '../../dashboard.module.scss';

const appointmentStatusColor: Record<string, string> = {
    SCHEDULED: 'blue',
    CONFIRMED: 'cyan',
    COMPLETED: 'green',
    CANCELLED: 'red',
    NO_SHOW: 'orange',
};

export default function ReceptionistAppointmentsPage() {
    const { session, loading: authLoading } = useAuthSession();

    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            const page = await getAppointments();
            setAppointments(page.content || []);
            setLoading(false);
        }

        if (session?.role === 'RECEPTIONIST') {
            load();
        }
    }, [session]);

    if (authLoading || !session || loading) {
        return <Skeleton active paragraph={{ rows: 8 }} />;
    }

    return (
        <DashboardFrame
            session={session}
            title="Lịch hẹn"
            subtitle="Theo dõi các appointment đã được tạo"
        >
            <Card className={styles.detailCard}>
                {appointments.length === 0 ? (
                    <ClinicalEmptyState
                        title="Chưa có lịch hẹn"
                        description="Sau khi duyệt request, appointment sẽ xuất hiện tại đây."
                    />
                ) : (
                    <List
                        dataSource={appointments}
                        renderItem={(appointment) => (
                            <List.Item className={styles.cleanListItem}>
                                <List.Item.Meta
                                    title={
                                        <div className={styles.listTitle}>
                                            <strong>{appointment.patientName || 'Bệnh nhân'}</strong>
                                            <Tag
                                                color={
                                                    appointmentStatusColor[appointment.status] || 'default'
                                                }
                                            >
                                                {appointment.status}
                                            </Tag>
                                        </div>
                                    }
                                    description={
                                        <div>
                                            <p>
                                                Bác sĩ: <b>{appointment.doctorName || 'Chưa rõ'}</b>
                                            </p>
                                            <p>
                                                {new Date(appointment.startTime).toLocaleString('vi-VN')} →{' '}
                                                {new Date(appointment.endTime).toLocaleTimeString('vi-VN')}
                                            </p>
                                            <p>{appointment.diagnosis || 'Chưa có chẩn đoán sơ bộ.'}</p>
                                        </div>
                                    }
                                />
                            </List.Item>
                        )}
                    />
                )}
            </Card>
        </DashboardFrame>
    );
}