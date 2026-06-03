'use client';

import { Button, Modal, message } from 'antd';
import { useEffect, useState } from 'react';
import ClinicalPageState from '../../_components/ClinicalPageState';
import PatientPortalFrame from '../../_components/PatientPortalFrame';
import StatusTag from '../../_components/StatusTag';
import { hasRole } from '@/lib/auth/roles';
import { useAuthSession } from '@/lib/auth/use-auth-session';
import {
    cancelMyAppointmentRequest,
    getMyAppointmentRequests,
} from '@/services/appointment-request.service';
import type { AppointmentRequest } from '@/types/clinical';
import styles from '../../_components/patient-portal.module.scss';

export default function PatientAppointmentRequestsPage() {
    const { session, loading: authLoading } = useAuthSession();

    const [requests, setRequests] = useState<AppointmentRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [cancellingId, setCancellingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const loadRequests = async () => {
        try {
            setLoading(true);
            setError(null);

            const page = await getMyAppointmentRequests();
            setRequests(page.content || []);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Không thể tải yêu cầu đặt lịch.',
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

        loadRequests();
    }, [session]);

    const handleCancel = async (request: AppointmentRequest) => {
        Modal.confirm({
            title: 'Hủy yêu cầu đặt lịch?',
            content:
                'Bạn chỉ nên hủy nếu không còn nhu cầu khám theo yêu cầu này.',
            okText: 'Hủy yêu cầu',
            cancelText: 'Đóng',
            okButtonProps: {
                danger: true,
            },
            onOk: async () => {
                try {
                    setCancellingId(request.id);

                    await cancelMyAppointmentRequest(request.id);
                    message.success('Đã hủy yêu cầu đặt lịch.');

                    await loadRequests();
                } catch (err) {
                    message.error(
                        err instanceof Error
                            ? err.message
                            : 'Không thể hủy yêu cầu.',
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
                    <div className={styles.heroKicker}>Appointment requests</div>
                    <h1 className={styles.heroTitle}>
                        Theo dõi yêu cầu đặt lịch của bạn
                    </h1>
                    <p className={styles.heroDescription}>
                        Mỗi yêu cầu sẽ được lễ tân kiểm tra slot bác sĩ và phản
                        hồi trạng thái tại đây.
                    </p>
                </div>

                <article className={styles.heroCard}>
                    <span>Tổng yêu cầu</span>
                    <strong>{requests.length}</strong>
                    <p>
                        Yêu cầu đang chờ duyệt có thể được hủy trước khi lễ tân
                        xác nhận.
                    </p>
                </article>
            </section>

            <section className={styles.portalPanel} style={{ marginTop: 24 }}>
                <div className={styles.panelHeader}>
                    <div>
                        <span>My booking requests</span>
                        <h2>Danh sách yêu cầu</h2>
                    </div>
                </div>

                <ClinicalPageState
                    loading={loading}
                    error={error}
                    empty={requests.length === 0}
                    emptyTitle="Chưa có yêu cầu đặt lịch"
                    emptyDescription="Hãy tạo yêu cầu đặt lịch để lễ tân hỗ trợ xác nhận."
                    actionText="Đặt lịch khám"
                    actionHref="/dashboard/patient/book-appointment"
                >
                    {requests.map((request) => (
                        <article key={request.id} className={styles.listCard}>
                            <div className={styles.listTitle}>
                                <strong>
                                    {request.specialtyName ||
                                        request.doctorName ||
                                        'Yêu cầu khám'}
                                </strong>

                                <StatusTag value={request.status} />
                            </div>

                            <p className={styles.muted}>
                                Bác sĩ:{' '}
                                <b>{request.doctorName || 'Chưa chỉ định'}</b>
                            </p>

                            <p className={styles.muted}>
                                Ngày mong muốn:{' '}
                                <b>{request.desiredDate || 'Chưa chọn'}</b> ·
                                Khung giờ:{' '}
                                <b>{request.desiredTime || 'Chưa chọn'}</b> ·
                                Loại khám: <b>{request.type || 'OFFLINE'}</b>
                            </p>

                            {request.symptoms && (
                                <p className={styles.muted}>
                                    Triệu chứng: {request.symptoms}
                                </p>
                            )}

                            {request.rejectionReason && (
                                <p style={{ color: '#ef4444', lineHeight: 1.6 }}>
                                    Lý do từ chối: {request.rejectionReason}
                                </p>
                            )}

                            <Button
                                danger
                                disabled={request.status !== 'PENDING'}
                                loading={cancellingId === request.id}
                                onClick={() => handleCancel(request)}
                            >
                                Hủy yêu cầu
                            </Button>
                        </article>
                    ))}
                </ClinicalPageState>
            </section>
        </PatientPortalFrame>
    );
}