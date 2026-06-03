'use client';

import { Button, Card, List, Modal, Skeleton, Tag, message } from 'antd';
import { useEffect, useState } from 'react';
import DashboardFrame from '../../_components/DashboardFrame';
import ClinicalEmptyState from '../../_components/ClinicalEmptyState';
import { useAuthSession } from '@/lib/auth/use-auth-session';
import {
    cancelMyAppointmentRequest,
    getMyAppointmentRequests,
} from '@/services/appointment-request.service';
import type { AppointmentRequest } from '@/types/clinical';
import styles from '../../dashboard.module.scss';

const statusColor: Record<string, string> = {
    PENDING: 'gold',
    APPROVED: 'green',
    REJECTED: 'red',
    CANCELLED: 'default',
};

export default function PatientAppointmentRequestsPage() {
    const { session, loading: authLoading } = useAuthSession();

    const [requests, setRequests] = useState<AppointmentRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [cancellingId, setCancellingId] = useState<string | null>(null);

    const loadRequests = async () => {
        try {
            setLoading(true);

            const page = await getMyAppointmentRequests();
            setRequests(page.content || []);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (session?.role === 'PATIENT') {
            loadRequests();
        }
    }, [session]);

    const handleCancel = async (request: AppointmentRequest) => {
        Modal.confirm({
            title: 'Hủy yêu cầu đặt lịch?',
            content: 'Bạn chỉ nên hủy nếu không còn nhu cầu khám theo yêu cầu này.',
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
                } catch (error) {
                    message.error(
                        error instanceof Error
                            ? error.message
                            : 'Không thể hủy yêu cầu.',
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
            title="Yêu cầu đặt lịch của tôi"
            subtitle="Theo dõi trạng thái duyệt lịch từ lễ tân"
        >
            <Card className={styles.detailCard}>
                {requests.length === 0 ? (
                    <ClinicalEmptyState
                        title="Chưa có yêu cầu đặt lịch"
                        description="Hãy tạo yêu cầu đặt lịch để lễ tân hỗ trợ xác nhận."
                    />
                ) : (
                    <List
                        dataSource={requests}
                        renderItem={(request) => (
                            <List.Item className={styles.caseItem}>
                                <div className={styles.caseContent}>
                                    <div>
                                        <div className={styles.listTitle}>
                                            <strong>
                                                {request.specialtyName ||
                                                    request.doctorName ||
                                                    'Yêu cầu khám'}
                                            </strong>

                                            <Tag color={statusColor[request.status] || 'default'}>
                                                {request.status}
                                            </Tag>
                                        </div>

                                        <p>
                                            Bác sĩ: <b>{request.doctorName || 'Chưa chỉ định'}</b>
                                        </p>

                                        <div className={styles.caseMeta}>
                                            <span>
                                                Ngày mong muốn:{' '}
                                                <b>{request.desiredDate || 'Chưa chọn'}</b>
                                            </span>
                                            <span>
                                                Khung giờ: <b>{request.desiredTime || 'Chưa chọn'}</b>
                                            </span>
                                            <span>
                                                Loại khám: <b>{request.type || 'OFFLINE'}</b>
                                            </span>
                                        </div>

                                        {request.symptoms && (
                                            <p style={{ marginTop: 12 }}>
                                                Triệu chứng: {request.symptoms}
                                            </p>
                                        )}

                                        {request.rejectionReason && (
                                            <p style={{ marginTop: 12, color: '#ef4444' }}>
                                                Lý do từ chối: {request.rejectionReason}
                                            </p>
                                        )}
                                    </div>

                                    <Button
                                        danger
                                        disabled={request.status !== 'PENDING'}
                                        loading={cancellingId === request.id}
                                        onClick={() => handleCancel(request)}
                                    >
                                        Hủy yêu cầu
                                    </Button>
                                </div>
                            </List.Item>
                        )}
                    />
                )}
            </Card>
        </DashboardFrame>
    );
}