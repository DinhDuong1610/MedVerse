'use client';

import {
    Button,
    Card,
    Form,
    Input,
    List,
    Modal,
    Select,
    Space,
    message,
} from 'antd';
import { useEffect, useState } from 'react';
import DashboardFrame from '../../_components/DashboardFrame';
import ClinicalEmptyState from '../../_components/ClinicalEmptyState';
import ClinicalPageState from '../../_components/ClinicalPageState';
import RoleGuardState from '../../_components/RoleGuardState';
import StatusTag from '../../_components/StatusTag';
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

type RejectFormValues = {
    reason: string;
};

export default function ReceptionistRequestsPage() {
    const { session, loading: authLoading } = useAuthSession();

    const [rejectForm] = Form.useForm<RejectFormValues>();

    const [requests, setRequests] = useState<AppointmentRequest[]>([]);
    const [status, setStatus] = useState<AppointmentRequestStatus | 'ALL'>(
        'PENDING',
    );
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [approveOpen, setApproveOpen] = useState(false);
    const [rejectOpen, setRejectOpen] = useState(false);

    const [selectedRequest, setSelectedRequest] =
        useState<AppointmentRequest | null>(null);
    const [availableSlots, setAvailableSlots] = useState<WorkSlot[]>([]);
    const [selectedSlotId, setSelectedSlotId] = useState<string | undefined>();

    const loadRequests = async (nextStatus = status) => {
        try {
            setLoading(true);
            setError(null);

            const page = await getAppointmentRequests(nextStatus);
            setRequests(page.content || []);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Không thể tải danh sách yêu cầu đặt lịch.',
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!session) return;

        if (session.role !== 'RECEPTIONIST') {
            setLoading(false);
            return;
        }

        loadRequests();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session]);

    const handleStatusChange = (value: AppointmentRequestStatus | 'ALL') => {
        setStatus(value);
        loadRequests(value);
    };

    const openApproveModal = async (request: AppointmentRequest) => {
        if (!request.doctorId) {
            message.warning(
                'Yêu cầu này chưa có bác sĩ cụ thể. Hãy chọn request có doctorId để duyệt slot.',
            );
            return;
        }

        try {
            setSelectedRequest(request);
            setSelectedSlotId(undefined);
            setAvailableSlots([]);
            setApproveOpen(true);
            setActionLoading(request.id);

            const slots = await getAvailableWorkSlots(request.doctorId);
            setAvailableSlots(slots);
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

    const handleApprove = async () => {
        if (!selectedRequest || !selectedSlotId) {
            message.warning('Vui lòng chọn slot khám.');
            return;
        }

        try {
            setActionLoading(selectedRequest.id);

            await approveAppointmentRequest(selectedRequest.id, selectedSlotId);

            message.success('Đã duyệt yêu cầu và tạo lịch hẹn.');
            setApproveOpen(false);
            setSelectedRequest(null);
            setSelectedSlotId(undefined);
            setAvailableSlots([]);
            await loadRequests();
        } catch (err) {
            message.error(
                err instanceof Error
                    ? err.message
                    : 'Không thể duyệt yêu cầu.',
            );
        } finally {
            setActionLoading(null);
        }
    };

    const openRejectModal = (request: AppointmentRequest) => {
        setSelectedRequest(request);
        rejectForm.resetFields();
        setRejectOpen(true);
    };

    const handleReject = async (values: RejectFormValues) => {
        if (!selectedRequest) return;

        try {
            setActionLoading(selectedRequest.id);

            await rejectAppointmentRequest(selectedRequest.id, values.reason);

            message.success('Đã từ chối yêu cầu.');
            setRejectOpen(false);
            setSelectedRequest(null);
            await loadRequests();
        } catch (err) {
            message.error(
                err instanceof Error
                    ? err.message
                    : 'Không thể từ chối yêu cầu.',
            );
        } finally {
            setActionLoading(null);
        }
    };

    if (authLoading || !session) {
        return <ClinicalPageState loading>Loading</ClinicalPageState>;
    }

    return (
        <DashboardFrame
            session={session}
            title="Yêu cầu đặt lịch"
            subtitle="Duyệt hoặc từ chối yêu cầu khám của bệnh nhân"
        >
            <RoleGuardState session={session} allow={['RECEPTIONIST']}>
                <ClinicalPageState loading={loading} error={error}>
                    <Card className={styles.detailCard}>
                        <div className={styles.panelHeader}>
                            <div>
                                <span>Appointment requests</span>
                                <h2>Danh sách yêu cầu đặt lịch</h2>
                            </div>

                            <Select
                                value={status}
                                onChange={handleStatusChange}
                                style={{ width: 180 }}
                                options={[
                                    { value: 'ALL', label: 'Tất cả' },
                                    { value: 'PENDING', label: 'PENDING' },
                                    { value: 'APPROVED', label: 'APPROVED' },
                                    { value: 'REJECTED', label: 'REJECTED' },
                                    { value: 'CANCELLED', label: 'CANCELLED' },
                                ]}
                            />
                        </div>

                        {requests.length === 0 ? (
                            <ClinicalEmptyState
                                title="Chưa có yêu cầu"
                                description="Các yêu cầu đặt lịch của bệnh nhân sẽ xuất hiện ở đây."
                            />
                        ) : (
                            <List
                                dataSource={requests}
                                renderItem={(request) => (
                                    <List.Item className={styles.cleanListItem}>
                                        <List.Item.Meta
                                            title={
                                                <div className={styles.listTitle}>
                                                    <strong>
                                                        {request.patientName ||
                                                            'Bệnh nhân'}
                                                    </strong>

                                                    <StatusTag
                                                        value={request.status}
                                                    />
                                                </div>
                                            }
                                            description={
                                                <div>
                                                    <p>
                                                        Chuyên khoa:{' '}
                                                        <b>
                                                            {request.specialtyName ||
                                                                'Chưa rõ'}
                                                        </b>
                                                    </p>

                                                    <p>
                                                        Bác sĩ:{' '}
                                                        <b>
                                                            {request.doctorName ||
                                                                'Chưa chọn bác sĩ'}
                                                        </b>
                                                    </p>

                                                    <p>
                                                        Thời gian mong muốn:{' '}
                                                        <b>
                                                            {request.desiredDate ||
                                                                'N/A'}{' '}
                                                            {request.desiredTime ||
                                                                ''}
                                                        </b>
                                                    </p>

                                                    <p>
                                                        Hình thức:{' '}
                                                        <b>
                                                            {request.type ||
                                                                'OFFLINE'}
                                                        </b>
                                                    </p>

                                                    <p>
                                                        Triệu chứng:{' '}
                                                        {request.symptoms ||
                                                            'Không có ghi chú.'}
                                                    </p>

                                                    {request.rejectionReason && (
                                                        <p>
                                                            Lý do từ chối:{' '}
                                                            <b>
                                                                {
                                                                    request.rejectionReason
                                                                }
                                                            </b>
                                                        </p>
                                                    )}
                                                </div>
                                            }
                                        />

                                        {request.status === 'PENDING' && (
                                            <Space>
                                                <Button
                                                    type="primary"
                                                    loading={
                                                        actionLoading ===
                                                        request.id
                                                    }
                                                    onClick={() =>
                                                        openApproveModal(request)
                                                    }
                                                >
                                                    Duyệt
                                                </Button>

                                                <Button
                                                    danger
                                                    loading={
                                                        actionLoading ===
                                                        request.id
                                                    }
                                                    onClick={() =>
                                                        openRejectModal(request)
                                                    }
                                                >
                                                    Từ chối
                                                </Button>
                                            </Space>
                                        )}
                                    </List.Item>
                                )}
                            />
                        )}
                    </Card>

                    <Modal
                        title="Duyệt yêu cầu đặt lịch"
                        open={approveOpen}
                        onCancel={() => setApproveOpen(false)}
                        onOk={handleApprove}
                        okText="Duyệt yêu cầu"
                        cancelText="Đóng"
                        confirmLoading={
                            !!selectedRequest &&
                            actionLoading === selectedRequest.id
                        }
                    >
                        <p>
                            Bệnh nhân:{' '}
                            <b>{selectedRequest?.patientName || 'N/A'}</b>
                        </p>

                        <p>
                            Bác sĩ:{' '}
                            <b>{selectedRequest?.doctorName || 'N/A'}</b>
                        </p>

                        <Select
                            value={selectedSlotId}
                            onChange={setSelectedSlotId}
                            placeholder="Chọn slot khám khả dụng"
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
                                Bác sĩ này chưa có slot khả dụng. Hãy yêu cầu bác sĩ
                                tạo slot ở trang Slot làm việc.
                            </p>
                        )}
                    </Modal>

                    <Modal
                        title="Từ chối yêu cầu đặt lịch"
                        open={rejectOpen}
                        onCancel={() => setRejectOpen(false)}
                        footer={null}
                        destroyOnClose
                    >
                        <Form
                            form={rejectForm}
                            layout="vertical"
                            onFinish={handleReject}
                        >
                            <Form.Item
                                label="Lý do từ chối"
                                name="reason"
                                rules={[
                                    {
                                        required: true,
                                        message: 'Nhập lý do từ chối',
                                    },
                                ]}
                            >
                                <Input.TextArea
                                    rows={4}
                                    placeholder="Ví dụ: Bác sĩ không còn slot phù hợp trong ngày này."
                                />
                            </Form.Item>

                            <Button
                                danger
                                htmlType="submit"
                                loading={
                                    !!selectedRequest &&
                                    actionLoading === selectedRequest.id
                                }
                                block
                            >
                                Xác nhận từ chối
                            </Button>
                        </Form>
                    </Modal>
                </ClinicalPageState>
            </RoleGuardState>
        </DashboardFrame>
    );
}