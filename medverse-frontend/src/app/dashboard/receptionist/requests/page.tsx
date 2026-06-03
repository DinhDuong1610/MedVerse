'use client';

import {
    Alert,
    Button,
    Card,
    DatePicker,
    Form,
    Input,
    List,
    Modal,
    Select,
    Space,
    Statistic,
    Tag,
    message,
} from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { useEffect, useMemo, useState } from 'react';
import DashboardFrame from '../../_components/DashboardFrame';
import ClinicalEmptyState from '../../_components/ClinicalEmptyState';
import ClinicalPageState from '../../_components/ClinicalPageState';
import RoleGuardState from '../../_components/RoleGuardState';
import StatusTag from '../../_components/StatusTag';
import { hasAnyPermission } from '@/lib/auth/roles';
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

type RequestStatusFilter = AppointmentRequestStatus | 'ALL';

const statusOptions: Array<{
    value: RequestStatusFilter;
    label: string;
}> = [
        { value: 'ALL', label: 'Tất cả' },
        { value: 'PENDING', label: 'PENDING' },
        { value: 'APPROVED', label: 'APPROVED' },
        { value: 'REJECTED', label: 'REJECTED' },
        { value: 'CANCELLED', label: 'CANCELLED' },
    ];

function formatDate(value?: string) {
    if (!value) return 'Chưa rõ';

    return dayjs(value).format('DD/MM/YYYY');
}

function formatTime(value?: string) {
    if (!value) return '';

    return value;
}

function formatSlotTime(value?: string) {
    if (!value) return 'Chưa rõ';

    return new Date(value).toLocaleString('vi-VN');
}

function isSameDesiredDate(request: AppointmentRequest, selectedDate: Dayjs | null) {
    if (!selectedDate) return true;

    if (!request.desiredDate) return false;

    return dayjs(request.desiredDate).isSame(selectedDate, 'day');
}

function getRequestPriorityTag(request: AppointmentRequest) {
    if (request.status !== 'PENDING') {
        return null;
    }

    if (!request.doctorId) {
        return <Tag color="orange">Cần chọn bác sĩ</Tag>;
    }

    if (!request.desiredDate) {
        return <Tag color="gold">Thiếu ngày mong muốn</Tag>;
    }

    const desired = dayjs(request.desiredDate);

    if (desired.isBefore(dayjs(), 'day')) {
        return <Tag color="red">Quá hạn xử lý</Tag>;
    }

    if (desired.isSame(dayjs(), 'day')) {
        return <Tag color="red">Hôm nay</Tag>;
    }

    if (desired.diff(dayjs(), 'day') <= 2) {
        return <Tag color="gold">Sắp đến ngày</Tag>;
    }

    return <Tag color="blue">Chờ duyệt</Tag>;
}

function sortRequests(a: AppointmentRequest, b: AppointmentRequest) {
    const statusWeight: Record<string, number> = {
        PENDING: 1,
        APPROVED: 2,
        REJECTED: 3,
        CANCELLED: 4,
    };

    const aStatus = statusWeight[a.status] || 99;
    const bStatus = statusWeight[b.status] || 99;

    if (aStatus !== bStatus) {
        return aStatus - bStatus;
    }

    return String(a.desiredDate || '').localeCompare(String(b.desiredDate || ''));
}

export default function ReceptionistRequestsPage() {
    const { session, loading: authLoading } = useAuthSession();

    const [rejectForm] = Form.useForm<RejectFormValues>();

    const [requests, setRequests] = useState<AppointmentRequest[]>([]);
    const [status, setStatus] = useState<RequestStatusFilter>('PENDING');
    const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null);

    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [approveOpen, setApproveOpen] = useState(false);
    const [rejectOpen, setRejectOpen] = useState(false);

    const [selectedRequest, setSelectedRequest] =
        useState<AppointmentRequest | null>(null);
    const [availableSlots, setAvailableSlots] = useState<WorkSlot[]>([]);
    const [selectedSlotId, setSelectedSlotId] = useState<string | undefined>();

    const canReadRequests = hasAnyPermission(session, [
        'APPOINTMENT:READ_ANY',
        'APPOINTMENT:WRITE_ANY',
    ]);

    const canWriteRequests = hasAnyPermission(session, [
        'APPOINTMENT:WRITE_ANY',
    ]);

    const loadRequests = async () => {
        try {
            setLoading(true);
            setError(null);

            const page = await getAppointmentRequests('ALL', 100);
            const sorted = [...(page.content || [])].sort(sortRequests);

            setRequests(sorted);
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

        if (!canReadRequests) {
            setError('Tài khoản hiện tại không có quyền xem yêu cầu đặt lịch.');
            setLoading(false);
            return;
        }

        loadRequests();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session]);

    const filteredRequests = useMemo(() => {
        return requests.filter((request) => {
            const statusMatched = status === 'ALL' || request.status === status;
            const dateMatched = isSameDesiredDate(request, selectedDate);

            return statusMatched && dateMatched;
        });
    }, [requests, status, selectedDate]);

    const metrics = useMemo(() => {
        const pending = requests.filter((item) => item.status === 'PENDING').length;
        const approved = requests.filter((item) => item.status === 'APPROVED').length;
        const rejected = requests.filter((item) => item.status === 'REJECTED').length;
        const cancelled = requests.filter(
            (item) => item.status === 'CANCELLED',
        ).length;

        const needDoctor = requests.filter(
            (item) => item.status === 'PENDING' && !item.doctorId,
        ).length;

        const urgent = requests.filter((item) => {
            if (item.status !== 'PENDING' || !item.desiredDate) return false;

            return dayjs(item.desiredDate).diff(dayjs(), 'day') <= 2;
        }).length;

        return {
            total: requests.length,
            pending,
            approved,
            rejected,
            cancelled,
            needDoctor,
            urgent,
        };
    }, [requests]);

    const openApproveModal = async (request: AppointmentRequest) => {
        if (!canWriteRequests) {
            message.warning('Tài khoản hiện tại không có quyền duyệt lịch.');
            return;
        }

        if (!request.doctorId) {
            message.warning(
                'Yêu cầu này chưa có bác sĩ cụ thể. Hãy yêu cầu bệnh nhân chọn bác sĩ hoặc bổ sung luồng gán bác sĩ ở task sau.',
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

            const sortedSlots = [...slots].sort((a, b) =>
                String(a.startTime).localeCompare(String(b.startTime)),
            );

            setAvailableSlots(sortedSlots);
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
        if (!canWriteRequests) {
            message.warning('Tài khoản hiện tại không có quyền từ chối lịch.');
            return;
        }

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
            subtitle="Duyệt yêu cầu, chọn slot khám và tạo lịch hẹn cho bệnh nhân"
        >
            <RoleGuardState
                session={session}
                anyPermissions={['APPOINTMENT:READ_ANY', 'APPOINTMENT:WRITE_ANY']}
            >
                <section className={styles.metricGrid}>
                    <Card className={styles.metricCard}>
                        <Statistic title="Tổng yêu cầu" value={metrics.total} />
                    </Card>

                    <Card className={styles.metricCard}>
                        <Statistic title="Chờ duyệt" value={metrics.pending} />
                    </Card>

                    <Card className={styles.metricCard}>
                        <Statistic title="Sắp đến ngày" value={metrics.urgent} />
                    </Card>

                    <Card className={styles.metricCard}>
                        <Statistic
                            title="Cần bác sĩ"
                            value={metrics.needDoctor}
                        />
                    </Card>
                </section>

                <Card className={styles.detailCard} style={{ marginTop: 24 }}>
                    <div className={styles.panelHeader}>
                        <div>
                            <span>Appointment request board</span>
                            <h2>Danh sách yêu cầu đặt lịch</h2>
                            <p>
                                Lễ tân kiểm tra yêu cầu, chọn slot phù hợp và
                                duyệt để tạo appointment chính thức.
                            </p>
                        </div>

                        <Space wrap>
                            <DatePicker
                                value={selectedDate}
                                onChange={setSelectedDate}
                                allowClear
                                placeholder="Lọc ngày mong muốn"
                            />

                            <Select
                                value={status}
                                onChange={setStatus}
                                style={{ width: 180 }}
                                options={statusOptions}
                            />

                            <Button onClick={loadRequests}>Làm mới</Button>
                        </Space>
                    </div>

                    {error && (
                        <Alert
                            type="error"
                            showIcon
                            message="Không thể tải request board"
                            description={error}
                            style={{ marginBottom: 16 }}
                        />
                    )}

                    <ClinicalPageState loading={loading}>
                        {filteredRequests.length === 0 ? (
                            <ClinicalEmptyState
                                title="Chưa có yêu cầu"
                                description="Không tìm thấy yêu cầu đặt lịch nào theo bộ lọc hiện tại."
                            />
                        ) : (
                            <List
                                dataSource={filteredRequests}
                                renderItem={(request) => (
                                    <List.Item className={styles.cleanListItem}>
                                        <List.Item.Meta
                                            title={
                                                <div className={styles.listTitle}>
                                                    <strong>
                                                        {request.patientName ||
                                                            'Bệnh nhân'}
                                                    </strong>

                                                    <Space wrap>
                                                        <StatusTag
                                                            value={request.status}
                                                        />

                                                        {getRequestPriorityTag(
                                                            request,
                                                        )}

                                                        <Tag color="cyan">
                                                            {request.type ||
                                                                'OFFLINE'}
                                                        </Tag>
                                                    </Space>
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
                                                            {formatDate(
                                                                request.desiredDate,
                                                            )}{' '}
                                                            {formatTime(
                                                                request.desiredTime,
                                                            )}
                                                        </b>
                                                    </p>

                                                    <p>
                                                        Triệu chứng:{' '}
                                                        {request.symptoms ||
                                                            'Không có ghi chú.'}
                                                    </p>

                                                    {request.rejectionReason && (
                                                        <Alert
                                                            type="warning"
                                                            showIcon
                                                            message="Lý do từ chối"
                                                            description={
                                                                request.rejectionReason
                                                            }
                                                            style={{
                                                                marginTop: 12,
                                                            }}
                                                        />
                                                    )}
                                                </div>
                                            }
                                        />

                                        {request.status === 'PENDING' ? (
                                            <Space wrap>
                                                <Button
                                                    type="primary"
                                                    disabled={
                                                        !canWriteRequests ||
                                                        !request.doctorId
                                                    }
                                                    loading={
                                                        actionLoading ===
                                                        request.id
                                                    }
                                                    onClick={() =>
                                                        openApproveModal(request)
                                                    }
                                                >
                                                    Duyệt & chọn slot
                                                </Button>

                                                <Button
                                                    danger
                                                    disabled={!canWriteRequests}
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
                                        ) : (
                                            <StatusTag value={request.status} />
                                        )}
                                    </List.Item>
                                )}
                            />
                        )}
                    </ClinicalPageState>
                </Card>

                <Modal
                    title="Duyệt yêu cầu đặt lịch"
                    open={approveOpen}
                    onCancel={() => {
                        setApproveOpen(false);
                        setSelectedRequest(null);
                        setSelectedSlotId(undefined);
                        setAvailableSlots([]);
                    }}
                    onOk={handleApprove}
                    okText="Duyệt và tạo lịch hẹn"
                    cancelText="Đóng"
                    confirmLoading={
                        !!selectedRequest &&
                        actionLoading === selectedRequest.id
                    }
                    okButtonProps={{
                        disabled: !selectedSlotId,
                    }}
                >
                    <Alert
                        type="info"
                        showIcon
                        message="Chọn slot khám chính thức"
                        description="Sau khi duyệt, hệ thống sẽ tạo appointment, đổi slot thành BOOKED và gửi thông báo cho bệnh nhân/bác sĩ."
                        style={{ marginBottom: 16 }}
                    />

                    <p>
                        Bệnh nhân:{' '}
                        <b>{selectedRequest?.patientName || 'N/A'}</b>
                    </p>

                    <p>
                        Bác sĩ: <b>{selectedRequest?.doctorName || 'N/A'}</b>
                    </p>

                    <p>
                        Ngày mong muốn:{' '}
                        <b>
                            {formatDate(selectedRequest?.desiredDate)}{' '}
                            {formatTime(selectedRequest?.desiredTime)}
                        </b>
                    </p>

                    <Select
                        value={selectedSlotId}
                        onChange={setSelectedSlotId}
                        placeholder="Chọn slot khám khả dụng"
                        style={{ width: '100%', marginTop: 12 }}
                        options={availableSlots.map((slot) => {
                            const isDesiredDay =
                                selectedRequest?.desiredDate &&
                                dayjs(slot.startTime).isSame(
                                    dayjs(selectedRequest.desiredDate),
                                    'day',
                                );

                            return {
                                value: slot.id,
                                label: `${formatSlotTime(slot.startTime)} → ${new Date(
                                    slot.endTime,
                                ).toLocaleTimeString('vi-VN')}${isDesiredDay
                                        ? ' · Khớp ngày mong muốn'
                                        : ''
                                    }`,
                            };
                        })}
                    />

                    {availableSlots.length === 0 && (
                        <Alert
                            type="warning"
                            showIcon
                            message="Chưa có slot khả dụng"
                            description="Bác sĩ này chưa có slot khả dụng. Hãy yêu cầu bác sĩ tạo slot ở trang Slot làm việc hoặc từ chối yêu cầu với lý do phù hợp."
                            style={{ marginTop: 12 }}
                        />
                    )}
                </Modal>

                <Modal
                    title="Từ chối yêu cầu đặt lịch"
                    open={rejectOpen}
                    onCancel={() => {
                        setRejectOpen(false);
                        setSelectedRequest(null);
                    }}
                    footer={null}
                    destroyOnClose
                >
                    <Form
                        form={rejectForm}
                        layout="vertical"
                        onFinish={handleReject}
                    >
                        <Alert
                            type="warning"
                            showIcon
                            message="Yêu cầu sẽ bị từ chối"
                            description="Lý do từ chối sẽ được lưu và hiển thị cho bệnh nhân."
                            style={{ marginBottom: 16 }}
                        />

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
            </RoleGuardState>
        </DashboardFrame>
    );
}