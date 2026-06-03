'use client';

import {
    Alert,
    Button,
    Card,
    Collapse,
    Modal,
    Space,
    Statistic,
    Tag,
    Timeline,
    message,
} from 'antd';
import Link from 'next/link';
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

function formatDateTime(value?: string) {
    if (!value) return 'Chưa rõ';

    return new Date(value).toLocaleString('vi-VN');
}

function formatTime(value?: string) {
    if (!value) return 'Chưa rõ';

    return new Date(value).toLocaleTimeString('vi-VN');
}

function isUpcomingAppointment(appointment: Appointment) {
    const appointmentEnd = appointment.endTime
        ? new Date(appointment.endTime).getTime()
        : 0;

    return (
        ['SCHEDULED', 'CONFIRMED'].includes(appointment.status) &&
        appointmentEnd >= Date.now()
    );
}

function isHistoryAppointment(appointment: Appointment) {
    const appointmentEnd = appointment.endTime
        ? new Date(appointment.endTime).getTime()
        : 0;

    return (
        ['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(appointment.status) ||
        appointmentEnd < Date.now()
    );
}

function canCancelAppointment(appointment: Appointment) {
    return ['SCHEDULED', 'CONFIRMED'].includes(appointment.status);
}

function getPatientStatusInfo(appointment: Appointment) {
    switch (appointment.status) {
        case 'SCHEDULED':
            return {
                type: 'info' as const,
                title: 'Lịch hẹn đã được tạo',
                description:
                    'Bạn nên đến đúng giờ. Nếu không thể tham gia, hãy hủy lịch sớm để phòng khám sắp xếp lại.',
            };

        case 'CONFIRMED':
            return {
                type: 'success' as const,
                title: 'Lịch hẹn đã được xác nhận',
                description:
                    'Lịch khám đã được xác nhận. Hãy chuẩn bị giấy tờ cần thiết và đến đúng giờ.',
            };

        case 'COMPLETED':
            return {
                type: 'success' as const,
                title: 'Ca khám đã hoàn tất',
                description:
                    'Bạn có thể xem kết quả khám và đơn thuốc trong khu vực hồ sơ y tế.',
            };

        case 'CANCELLED':
            return {
                type: 'warning' as const,
                title: 'Lịch hẹn đã bị hủy',
                description:
                    'Lịch hẹn này không còn hiệu lực. Bạn có thể đặt lịch khám mới nếu cần.',
            };

        case 'NO_SHOW':
            return {
                type: 'warning' as const,
                title: 'Không đến khám',
                description:
                    'Lịch hẹn được ghi nhận là không đến khám. Hãy đặt lịch mới nếu vẫn cần tư vấn.',
            };

        default:
            return {
                type: 'info' as const,
                title: 'Trạng thái lịch hẹn',
                description: 'Theo dõi trạng thái lịch hẹn của bạn tại đây.',
            };
    }
}

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

            const page = await getMyAppointments(100);

            const sorted = [...(page.content || [])].sort((a, b) =>
                String(a.startTime).localeCompare(String(b.startTime)),
            );

            setAppointments(sorted);
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session]);

    const upcoming = useMemo(
        () => appointments.filter(isUpcomingAppointment),
        [appointments],
    );

    const history = useMemo(
        () => appointments.filter(isHistoryAppointment).reverse(),
        [appointments],
    );

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
            upcoming: upcoming.length,
            history: history.length,
            scheduled,
            confirmed,
            completed,
            cancelled,
            noShow,
        };
    }, [appointments, upcoming.length, history.length]);

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
                        Theo dõi lịch khám đã được xác nhận, trạng thái từng
                        cuộc hẹn và xem kết quả sau khi bác sĩ hoàn tất khám.
                    </p>
                </div>

                <article className={styles.heroCard}>
                    <span>Lịch sắp tới</span>
                    <strong>{metrics.upcoming}</strong>
                    <p>
                        Lịch SCHEDULED hoặc CONFIRMED sẽ hiển thị trong nhóm sắp
                        tới.
                    </p>
                </article>
            </section>

            <section className={styles.contentGrid}>
                <Card className={styles.portalPanel} style={{ marginTop: 24 }}>
                    <Statistic title="Tổng lịch" value={metrics.total} />
                </Card>

                <Card className={styles.portalPanel} style={{ marginTop: 24 }}>
                    <Statistic title="Đã xác nhận" value={metrics.confirmed} />
                </Card>

                <Card className={styles.portalPanel} style={{ marginTop: 24 }}>
                    <Statistic title="Đã hoàn tất" value={metrics.completed} />
                </Card>
            </section>

            <section className={styles.contentGrid} style={{ marginTop: 24 }}>
                <article className={styles.portalPanel}>
                    <div className={styles.panelHeader}>
                        <div>
                            <span>Upcoming</span>
                            <h2>Lịch khám sắp tới</h2>
                            <p>
                                Hãy đến đúng giờ. Nếu không thể tham gia, bạn nên
                                hủy lịch sớm để phòng khám hỗ trợ sắp xếp lại.
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
                            items={upcoming.map((appointment) => {
                                const statusInfo =
                                    getPatientStatusInfo(appointment);

                                return {
                                    color:
                                        appointment.status === 'CONFIRMED'
                                            ? 'green'
                                            : 'blue',
                                    children: (
                                        <article className={styles.listCard}>
                                            <div className={styles.listTitle}>
                                                <strong>
                                                    {formatDateTime(
                                                        appointment.startTime,
                                                    )}
                                                </strong>

                                                <Space wrap>
                                                    <StatusTag
                                                        value={
                                                            appointment.status
                                                        }
                                                    />

                                                    <Tag color="cyan">
                                                        {appointment.type ||
                                                            'OFFLINE'}
                                                    </Tag>
                                                </Space>
                                            </div>

                                            <Alert
                                                type={statusInfo.type}
                                                showIcon
                                                message={statusInfo.title}
                                                description={
                                                    statusInfo.description
                                                }
                                                style={{ marginBottom: 14 }}
                                            />

                                            <p className={styles.muted}>
                                                Bác sĩ:{' '}
                                                <b>
                                                    {appointment.doctorName ||
                                                        'Chưa rõ bác sĩ'}
                                                </b>
                                            </p>

                                            <p className={styles.muted}>
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

                                            <p className={styles.muted}>
                                                Hình thức khám:{' '}
                                                <b>
                                                    {appointment.type ||
                                                        'OFFLINE'}
                                                </b>
                                            </p>

                                            <Space wrap>
                                                <Button
                                                    danger
                                                    disabled={
                                                        !canCancelAppointment(
                                                            appointment,
                                                        )
                                                    }
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
                                            </Space>
                                        </article>
                                    ),
                                };
                            })}
                        />
                    </ClinicalPageState>
                </article>

                <article className={styles.portalPanel}>
                    <div className={styles.panelHeader}>
                        <div>
                            <span>History</span>
                            <h2>Lịch sử lịch hẹn</h2>
                            <p>
                                Các lịch đã hoàn tất, đã hủy hoặc no-show sẽ
                                hiển thị ở đây.
                            </p>
                        </div>
                    </div>

                    <ClinicalPageState
                        loading={loading}
                        error={error}
                        empty={history.length === 0}
                        emptyTitle="Chưa có lịch sử"
                        emptyDescription="Các lịch đã hoàn tất, đã hủy hoặc no-show sẽ hiển thị ở đây."
                    >
                        <Collapse
                            bordered={false}
                            items={history.map((appointment) => {
                                const statusInfo =
                                    getPatientStatusInfo(appointment);

                                return {
                                    key: appointment.id,
                                    label: (
                                        <div className={styles.listTitle}>
                                            <strong>
                                                {formatDateTime(
                                                    appointment.startTime,
                                                )}
                                            </strong>

                                            <StatusTag
                                                value={appointment.status}
                                            />
                                        </div>
                                    ),
                                    children: (
                                        <div>
                                            <Alert
                                                type={statusInfo.type}
                                                showIcon
                                                message={statusInfo.title}
                                                description={
                                                    statusInfo.description
                                                }
                                                style={{ marginBottom: 16 }}
                                            />

                                            <p className={styles.muted}>
                                                Bác sĩ:{' '}
                                                <b>
                                                    {appointment.doctorName ||
                                                        'Chưa rõ bác sĩ'}
                                                </b>
                                            </p>

                                            <p className={styles.muted}>
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

                                            <p className={styles.muted}>
                                                Ghi chú:{' '}
                                                {appointment.diagnosis ||
                                                    'Không có ghi chú.'}
                                            </p>

                                            {appointment.status ===
                                                'COMPLETED' && (
                                                    <Space wrap>
                                                        <Link href="/dashboard/patient/medical-records">
                                                            <Button type="primary">
                                                                Xem kết quả khám
                                                            </Button>
                                                        </Link>

                                                        <Link href="/dashboard/patient/prescriptions">
                                                            <Button>
                                                                Xem đơn thuốc
                                                            </Button>
                                                        </Link>
                                                    </Space>
                                                )}

                                            {appointment.status ===
                                                'CANCELLED' && (
                                                    <Link href="/dashboard/patient/book-appointment">
                                                        <Button type="primary">
                                                            Đặt lịch mới
                                                        </Button>
                                                    </Link>
                                                )}
                                        </div>
                                    ),
                                };
                            })}
                        />
                    </ClinicalPageState>
                </article>
            </section>
        </PatientPortalFrame>
    );
}