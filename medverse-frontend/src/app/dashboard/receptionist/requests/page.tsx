'use client';

import {
    Alert,
    Button,
    Card,
    List,
    Modal,
    Select,
    Skeleton,
    Space,
    Tag,
    Typography,
    message,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';
import DashboardFrame from '../../_components/DashboardFrame';
import ClinicalEmptyState from '../../_components/ClinicalEmptyState';
import { useAuthSession } from '@/lib/auth/use-auth-session';
import {
    approveAppointmentRequest,
    getAppointmentRequests,
    rejectAppointmentRequest,
} from '@/services/appointment-request.service';
import { getAvailableWorkSlots } from '@/services/work-slot.service';
import type {
    AppointmentRequest,
    AppointmentRequestStatus,
    WorkSlot,
} from '@/types/clinical';
import styles from '../../dashboard.module.scss';

const statusOptions = [
    { label: 'Tất cả', value: 'ALL' },
    { label: 'Đang chờ', value: 'PENDING' },
    { label: 'Đã duyệt', value: 'APPROVED' },
    { label: 'Đã từ chối', value: 'REJECTED' },
    { label: 'Đã hủy', value: 'CANCELLED' },
];

const statusColor: Record<string, string> = {
    PENDING: 'gold',
    APPROVED: 'green',
    REJECTED: 'red',
    CANCELLED: 'default',
};

export default function ReceptionistRequestsPage() {
    const { session, loading: authLoading } = useAuthSession();

    const [status, setStatus] = useState<AppointmentRequestStatus | 'ALL'>(
        'PENDING',
    );
    const [requests, setRequests] = useState<AppointmentRequest[]>([]);
    const [slots, setSlots] = useState<WorkSlot[]>([]);
    const [selectedRequest, setSelectedRequest] =
        useState<AppointmentRequest | null>(null);
    const [selectedSlotId, setSelectedSlotId] = useState<string>();
    const [rejectingRequest, setRejectingRequest] =
        useState<AppointmentRequest | null>(null);
    const [rejectReason, setRejectReason] = useState('');

    const [loading, setLoading] = useState(true);
    const [slotLoading, setSlotLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const loadRequests = async () => {
        try {
            setLoading(true);

            const page = await getAppointmentRequests(status);
            setRequests(page.content || []);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (session?.role === 'RECEPTIONIST') {
            loadRequests();
        }
    }, [session, status]);

    const openApproveModal = async (request: AppointmentRequest) => {
        setSelectedRequest(request);
        setSelectedSlotId(undefined);
        setSlots([]);

        if (!request.doctorId) {
            message.warning('Request chưa có bác sĩ, không thể lấy slot.');
            return;
        }

        try {
            setSlotLoading(true);

            const data = await getAvailableWorkSlots(request.doctorId);
            setSlots(data);
        } finally {
            setSlotLoading(false);
        }
    };

    const handleApprove = async () => {
        if (!selectedRequest || !selectedSlotId) {
            message.warning('Vui lòng chọn slot khám.');
            return;
        }

        try {
            setSubmitting(true);

            await approveAppointmentRequest(selectedRequest.id, selectedSlotId);
            message.success('Đã duyệt yêu cầu và tạo lịch hẹn.');

            setSelectedRequest(null);
            setSelectedSlotId(undefined);
            await loadRequests();
        } catch (error) {
            message.error(
                error instanceof Error ? error.message : 'Không thể duyệt yêu cầu.',
            );
        } finally {
            setSubmitting(false);
        }
    };

    const handleReject = async () => {
        if (!rejectingRequest) return;

        if (!rejectReason.trim()) {
            message.warning('Vui lòng nhập lý do từ chối.');
            return;
        }

        try {
            setSubmitting(true);

            await rejectAppointmentRequest(rejectingRequest.id, rejectReason);
            message.success('Đã từ chối yêu cầu.');

            setRejectingRequest(null);
            setRejectReason('');
            await loadRequests();
        } catch (error) {
            message.error(
                error instanceof Error ? error.message : 'Không thể từ chối yêu cầu.',
            );
        } finally {
            setSubmitting(false);
        }
    };

    const slotOptions = useMemo(
        () =>
            slots.map((slot) => ({
                value: slot.id,
                label: `${new Date(slot.startTime).toLocaleString('vi-VN')} - ${new Date(
                    slot.endTime,
                ).toLocaleTimeString('vi-VN')}`,
            })),
        [slots],
    );

    if (authLoading || !session || loading) {
        return <Skeleton active paragraph={{ rows: 8 }} />;
    }

    return (
        <DashboardFrame
            session={session}
            title="Yêu cầu đặt lịch"
            subtitle="Duyệt yêu cầu khám và gán slot cho bác sĩ"
        >
            <div className={styles.detailGrid}>
                <Card className={styles.detailCard}>
                    <div className={styles.panelHeader}>
                        <div>
                            <span>Reception desk</span>
                            <h2>Danh sách request</h2>
                        </div>

                        <Select
                            value={status}
                            onChange={setStatus}
                            options={statusOptions}
                            style={{ minWidth: 180 }}
                        />
                    </div>

                    {requests.length === 0 ? (
                        <ClinicalEmptyState
                            title="Không có yêu cầu"
                            description="Không có appointment request phù hợp với bộ lọc hiện tại."
                        />
                    ) : (
                        <List
                            dataSource={requests}
                            renderItem={(request) => (
                                <List.Item className={styles.caseItem}>
                                    <div className={styles.caseContent}>
                                        <div>
                                            <div className={styles.listTitle}>
                                                <strong>{request.patientName || 'Bệnh nhân'}</strong>
                                                <Tag color={statusColor[request.status]}>
                                                    {request.status}
                                                </Tag>
                                            </div>

                                            <p>
                                                {request.specialtyName || 'Chưa rõ chuyên khoa'} ·{' '}
                                                {request.doctorName || 'Chưa rõ bác sĩ'}
                                            </p>

                                            <div className={styles.caseMeta}>
                                                <span>
                                                    Ngày mong muốn:{' '}
                                                    <b>{request.desiredDate || 'Chưa chọn'}</b>
                                                </span>
                                                <span>
                                                    Khung giờ:{' '}
                                                    <b>{request.desiredTime || 'Chưa chọn'}</b>
                                                </span>
                                                <span>
                                                    Loại khám: <b>{request.type || 'OFFLINE'}</b>
                                                </span>
                                            </div>

                                            {request.symptoms && (
                                                <Typography.Paragraph style={{ marginTop: 12 }}>
                                                    Triệu chứng: {request.symptoms}
                                                </Typography.Paragraph>
                                            )}
                                        </div>

                                        <Space>
                                            <Button
                                                type="primary"
                                                disabled={request.status !== 'PENDING'}
                                                onClick={() => openApproveModal(request)}
                                            >
                                                Duyệt
                                            </Button>

                                            <Button
                                                danger
                                                disabled={request.status !== 'PENDING'}
                                                onClick={() => setRejectingRequest(request)}
                                            >
                                                Từ chối
                                            </Button>
                                        </Space>
                                    </div>
                                </List.Item>
                            )}
                        />
                    )}
                </Card>
            </div>

            <Modal
                title="Duyệt yêu cầu đặt lịch"
                open={!!selectedRequest}
                onCancel={() => setSelectedRequest(null)}
                onOk={handleApprove}
                okText="Duyệt và tạo lịch hẹn"
                confirmLoading={submitting}
            >
                {selectedRequest && (
                    <div>
                        <Alert
                            type="info"
                            showIcon
                            message={selectedRequest.patientName || 'Bệnh nhân'}
                            description={selectedRequest.symptoms || 'Không có triệu chứng'}
                            style={{ marginBottom: 16 }}
                        />

                        <Select
                            loading={slotLoading}
                            value={selectedSlotId}
                            onChange={setSelectedSlotId}
                            placeholder="Chọn slot khám còn trống"
                            options={slotOptions}
                            style={{ width: '100%' }}
                        />
                    </div>
                )}
            </Modal>

            <Modal
                title="Từ chối yêu cầu"
                open={!!rejectingRequest}
                onCancel={() => {
                    setRejectingRequest(null);
                    setRejectReason('');
                }}
                onOk={handleReject}
                okText="Xác nhận từ chối"
                okButtonProps={{ danger: true }}
                confirmLoading={submitting}
            >
                <Typography.Paragraph>
                    Nhập lý do để bệnh nhân biết vì sao yêu cầu bị từ chối.
                </Typography.Paragraph>

                <textarea
                    value={rejectReason}
                    onChange={(event) => setRejectReason(event.target.value)}
                    placeholder="Ví dụ: Bác sĩ đã kín lịch trong ngày mong muốn."
                    style={{
                        width: '100%',
                        minHeight: 100,
                        borderRadius: 12,
                        border: '1px solid rgba(16, 32, 31, 0.16)',
                        padding: 12,
                        resize: 'vertical',
                    }}
                />
            </Modal>
        </DashboardFrame>
    );
}