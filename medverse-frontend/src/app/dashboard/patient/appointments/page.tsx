'use client';

import { Button, Modal, Timeline, message } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import ClinicalPageState from '../../_components/ClinicalPageState';
import PatientPortalFrame from '../../_components/PatientPortalFrame';
import StatusTag from '../../_components/StatusTag';
import { hasRole } from '@/lib/auth/roles';
import { useAuthSession } from '@/lib/auth/use-auth-session';
import {
    cancelAppointment,
    getMyAppointments,
} from '@/services/appointment.service';
import type { Appointment } from '@/types/clinical';
import styles from '../../_components/patient-portal.module.scss';

export default function PatientAppointmentsPage() {
    const { session, loading: authLoading } = useAuthSession();

    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [cancellingId, setCancellingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const loadAppointments = async () => {
        try {
            setLoading(true);
            setError(null);

            const page = await getMyAppointments(50);
            setAppointments(page.content || []);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Không thể tải lịch hẹn của bạn.',
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
                        'Patient cancelled from MedVerse patient portal.',
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
        <PatientPortalFrame session={session}>
            <section className={styles.hero}>
                <div>
                    <div className={styles.heroKicker}>Appointments</div>
                    <h1 className={styles.heroTitle}>Lịch hẹn của tôi</h1>
                    <p className={styles.heroDescription}>
                        Theo dõi các lịch khám đã được lễ tân xác nhận, xem thời
                        gian khám và hủy lịch khi không còn nhu cầu.
                    </p>
                </div>

                <article className={styles.heroCard}>
                    <span>Lịch sắp tới</span>
                    <strong>{upcoming.length}</strong>
                    <p>
                        Lịch hẹn có trạng thái SCHEDULED hoặc CONFIRMED sẽ hiển
                        thị trong nhóm sắp tới.
                    </p>
                </article>
            </section>

            <section className={styles.contentGrid}>
                <article className={styles.portalPanel}>
                    <div className={styles.panelHeader}>
                        <div>
                            <span>Upcoming</span>
                            <h2>Lịch khám sắp tới</h2>
                            <p>
                                Hãy đến đúng giờ và mang theo giấy tờ cần thiết
                                nếu khám trực tiếp.
                            </p>
                        </div>
                    </div>

                    <ClinicalPageState
                        loading={loading}
                        error={error}
                        empty={upcoming.length === 0}
                        emptyTitle="Chưa có lịch hẹn sắp tới"
                        emptyDescription="Sau khi lễ tân duyệt yêu cầu, lịch hẹn sẽ xuất hiện tại đây."
                        actionText="Đặt lịch khám"
                        actionHref="/dashboard/patient/book-appointment"
                    >
                        <Timeline
                            items={upcoming.map((appointment) => ({
                                color:
                                    appointment.status === 'CONFIRMED'
                                        ? 'cyan'
                                        : 'blue',
                                children: (
                                    <article className={styles.listCard}>
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

                                        <p className={styles.muted}>
                                            Bác sĩ:{' '}
                                            <b>
                                                {appointment.doctorName ||
                                                    'Chưa rõ bác sĩ'}
                                            </b>
                                        </p>

                                        <p className={styles.muted}>
                                            Kết thúc:{' '}
                                            {new Date(
                                                appointment.endTime,
                                            ).toLocaleString('vi-VN')}
                                        </p>

                                        <p className={styles.muted}>
                                            Hình thức khám:{' '}
                                            <b>{appointment.type || 'OFFLINE'}</b>
                                        </p>

                                        <Button
                                            danger
                                            loading={
                                                cancellingId === appointment.id
                                            }
                                            onClick={() =>
                                                handleCancel(appointment)
                                            }
                                        >
                                            Hủy lịch hẹn
                                        </Button>
                                    </article>
                                ),
                            }))}
                        />
                    </ClinicalPageState>
                </article>

                <article className={styles.portalPanel}>
                    <div className={styles.panelHeader}>
                        <div>
                            <span>History</span>
                            <h2>Lịch sử lịch hẹn</h2>
                        </div>
                    </div>

                    <ClinicalPageState
                        loading={loading}
                        error={error}
                        empty={past.length === 0}
                        emptyTitle="Chưa có lịch sử"
                        emptyDescription="Các lịch đã hoàn tất, đã hủy hoặc no-show sẽ hiển thị ở đây."
                    >
                        {past.map((appointment) => (
                            <article
                                key={appointment.id}
                                className={styles.listCard}
                            >
                                <div className={styles.listTitle}>
                                    <strong>
                                        {new Date(
                                            appointment.startTime,
                                        ).toLocaleString('vi-VN')}
                                    </strong>

                                    <StatusTag value={appointment.status} />
                                </div>

                                <p className={styles.muted}>
                                    Bác sĩ:{' '}
                                    <b>
                                        {appointment.doctorName ||
                                            'Chưa rõ bác sĩ'}
                                    </b>
                                </p>

                                <p className={styles.muted}>
                                    {appointment.diagnosis ||
                                        'Không có ghi chú.'}
                                </p>
                            </article>
                        ))}
                    </ClinicalPageState>
                </article>
            </section>
        </PatientPortalFrame>
    );
}