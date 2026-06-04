'use client';

import {
    CalendarOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    EyeOutlined,
    ReloadOutlined,
    SearchOutlined,
    StopOutlined,
} from '@ant-design/icons';
import {
    Button,
    Descriptions,
    Drawer,
    Input,
    Modal,
    Select,
    Space,
    Tag,
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
    cancelMyAppointmentRequest,
    getMyAppointmentRequests,
} from '@/services/appointment-request.service';
import type { AppointmentRequest } from '@/types/clinical';
import styles from '../../_components/patient-portal.module.scss';

type AppointmentRequestView = AppointmentRequest & {
    reason?: string;
    note?: string;
    appointmentId?: string;
    createdAt?: string;
    updatedAt?: string;
    approvedAt?: string;
    rejectedAt?: string;
    cancelledAt?: string;
    cancelReason?: string;
    cancellationReason?: string;
};

const statusOptions = [
    {
        label: 'Tất cả yêu cầu',
        value: 'ALL',
    },
    {
        label: 'Chờ xác nhận',
        value: 'PENDING',
    },
    {
        label: 'Đã duyệt',
        value: 'APPROVED',
    },
    {
        label: 'Bị từ chối',
        value: 'REJECTED',
    },
    {
        label: 'Đã hủy',
        value: 'CANCELLED',
    },
];

function normalizeKeyword(value?: string) {
    return String(value || '')
        .trim()
        .toLowerCase();
}

function formatDate(value?: string) {
    if (!value) return 'Chưa chọn';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleDateString('vi-VN');
}

function formatDateTime(value?: string) {
    if (!value) return 'Chưa ghi nhận';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleString('vi-VN');
}

function getRequestTitle(request: AppointmentRequestView) {
    return (
        request.specialtyName ||
        request.doctorName ||
        request.reason ||
        'Yêu cầu khám'
    );
}

function getRequestDescription(request: AppointmentRequestView) {
    return (
        request.symptoms ||
        request.reason ||
        request.note ||
        'Bạn chưa nhập mô tả triệu chứng cho yêu cầu này.'
    );
}

function canCancel(request: AppointmentRequestView) {
    return String(request.status || '').toUpperCase() === 'PENDING';
}

function getStatusColor(status?: string) {
    const normalized = String(status || '').toUpperCase();

    if (normalized === 'APPROVED') return '#16a34a';
    if (normalized === 'REJECTED') return '#ef4444';
    if (normalized === 'CANCELLED') return '#64748b';

    return '#2563eb';
}

function getStatusIcon(status?: string) {
    const normalized = String(status || '').toUpperCase();

    if (normalized === 'APPROVED') return <CheckCircleOutlined />;
    if (normalized === 'REJECTED') return <CloseCircleOutlined />;
    if (normalized === 'CANCELLED') return <StopOutlined />;

    return <CalendarOutlined />;
}

export default function PatientAppointmentRequestsPage() {
    const { session, loading: authLoading } = useAuthSession();

    const [requests, setRequests] = useState<AppointmentRequestView[]>([]);
    const [keyword, setKeyword] = useState('');
    const [status, setStatus] = useState('ALL');

    const [loading, setLoading] = useState(true);
    const [cancellingId, setCancellingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [selectedRequest, setSelectedRequest] =
        useState<AppointmentRequestView | null>(null);
    const [openDetailDrawer, setOpenDetailDrawer] = useState(false);

    const loadRequests = async () => {
        try {
            setLoading(true);
            setError(null);

            const page = await getMyAppointmentRequests();
            setRequests((page.content || []) as AppointmentRequestView[]);
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

    const filteredRequests = useMemo(() => {
        const search = normalizeKeyword(keyword);

        return requests.filter((request) => {
            const requestStatus = String(request.status || '').toUpperCase();

            const matchStatus = status === 'ALL' || requestStatus === status;

            const matchKeyword =
                !search ||
                request.specialtyName?.toLowerCase().includes(search) ||
                request.doctorName?.toLowerCase().includes(search) ||
                request.symptoms?.toLowerCase().includes(search) ||
                request.reason?.toLowerCase().includes(search) ||
                request.note?.toLowerCase().includes(search) ||
                request.type?.toLowerCase().includes(search);

            return matchStatus && matchKeyword;
        });
    }, [requests, keyword, status]);

    const metrics = useMemo(() => {
        const pending = requests.filter(
            (request) => String(request.status).toUpperCase() === 'PENDING',
        ).length;

        const approved = requests.filter(
            (request) => String(request.status).toUpperCase() === 'APPROVED',
        ).length;

        const rejectedOrCancelled = requests.filter((request) =>
            ['REJECTED', 'CANCELLED'].includes(
                String(request.status).toUpperCase(),
            ),
        ).length;

        return {
            total: requests.length,
            pending,
            approved,
            rejectedOrCancelled,
        };
    }, [requests]);

    const handleCancel = async (request: AppointmentRequestView) => {
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

    const openDetail = (request: AppointmentRequestView) => {
        setSelectedRequest(request);
        setOpenDetailDrawer(true);
    };

    const handleReset = () => {
        setKeyword('');
        setStatus('ALL');
    };

    if (authLoading || !session) {
        return <ClinicalPageState loading>Loading</ClinicalPageState>;
    }

    return (
        <PatientPortalFrame session={session}>
            <section className={styles.hero}>
                <div>
                    <div className={styles.heroKicker}>Yêu cầu đặt lịch</div>
                    <h1 className={styles.heroTitle}>
                        Theo dõi yêu cầu đặt lịch của bạn
                    </h1>
                    <p className={styles.heroDescription}>
                        Mỗi yêu cầu sẽ được lễ tân kiểm tra lịch trống, bác sĩ
                        phù hợp và phản hồi trạng thái tại đây.
                    </p>

                    <Space wrap style={{ marginTop: 20 }}>
                        <Link href="/dashboard/patient/book-appointment">
                            <Button type="primary" icon={<CalendarOutlined />}>
                                Đặt lịch khám
                            </Button>
                        </Link>

                        <Link href="/dashboard/patient/appointments">
                            <Button>Xem lịch hẹn</Button>
                        </Link>
                    </Space>
                </div>

                <article className={styles.heroCard}>
                    <span>Đang chờ xác nhận</span>
                    <strong>{metrics.pending}</strong>
                    <p>
                        Yêu cầu đang chờ duyệt có thể được hủy trước khi lễ tân
                        xác nhận.
                    </p>
                </article>
            </section>

            <section
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                    gap: 16,
                    marginTop: 24,
                }}
            >
                <article className={styles.listCard}>
                    <div className={styles.listTitle}>
                        <strong>Tổng yêu cầu</strong>
                        <Tag color="blue">{metrics.total}</Tag>
                    </div>
                    <p className={styles.muted}>
                        Tất cả yêu cầu đặt lịch bạn đã gửi.
                    </p>
                </article>

                <article className={styles.listCard}>
                    <div className={styles.listTitle}>
                        <strong>Đã được duyệt</strong>
                        <Tag color="green">{metrics.approved}</Tag>
                    </div>
                    <p className={styles.muted}>
                        Các yêu cầu đã được chuyển thành lịch hẹn.
                    </p>
                </article>

                <article className={styles.listCard}>
                    <div className={styles.listTitle}>
                        <strong>Cần chú ý</strong>
                        <Tag color="orange">{metrics.rejectedOrCancelled}</Tag>
                    </div>
                    <p className={styles.muted}>
                        Yêu cầu bị từ chối hoặc đã được hủy.
                    </p>
                </article>
            </section>

            <section className={styles.portalPanel} style={{ marginTop: 24 }}>
                <div className={styles.panelHeader}>
                    <div>
                        <span>Bộ lọc</span>
                        <h2>Tìm yêu cầu đặt lịch</h2>
                    </div>

                    <Button icon={<ReloadOutlined />} onClick={loadRequests}>
                        Làm mới
                    </Button>
                </div>

                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 220px auto',
                        gap: 12,
                        marginTop: 16,
                    }}
                >
                    <Input
                        allowClear
                        prefix={<SearchOutlined />}
                        placeholder="Tìm theo bác sĩ, chuyên khoa, triệu chứng hoặc loại khám"
                        value={keyword}
                        onChange={(event) => setKeyword(event.target.value)}
                    />

                    <Select
                        value={status}
                        options={statusOptions}
                        onChange={setStatus}
                    />

                    <Button onClick={handleReset}>Đặt lại</Button>
                </div>
            </section>

            <section className={styles.portalPanel} style={{ marginTop: 24 }}>
                <div className={styles.panelHeader}>
                    <div>
                        <span>Danh sách</span>
                        <h2>Yêu cầu đặt lịch của tôi</h2>
                    </div>

                    <Tag color="blue">{filteredRequests.length} yêu cầu</Tag>
                </div>

                <ClinicalPageState
                    loading={loading}
                    error={error}
                    empty={filteredRequests.length === 0}
                    emptyTitle="Không có yêu cầu phù hợp"
                    emptyDescription="Bạn có thể thay đổi bộ lọc hoặc tạo yêu cầu đặt lịch mới."
                    actionText="Đặt lịch khám"
                    actionHref="/dashboard/patient/book-appointment"
                >
                    {filteredRequests.map((request) => (
                        <article key={request.id} className={styles.listCard}>
                            <div className={styles.listTitle}>
                                <Space size={10} wrap>
                                    <span
                                        style={{
                                            width: 36,
                                            height: 36,
                                            borderRadius: 999,
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: getStatusColor(request.status),
                                            background: '#f8fafc',
                                            border: `1px solid ${getStatusColor(
                                                request.status,
                                            )}22`,
                                        }}
                                    >
                                        {getStatusIcon(request.status)}
                                    </span>

                                    <strong>{getRequestTitle(request)}</strong>
                                </Space>

                                <StatusTag value={request.status} />
                            </div>

                            <p className={styles.muted}>
                                Bác sĩ:{' '}
                                <b>{request.doctorName || 'Chưa chỉ định'}</b>
                            </p>

                            <p className={styles.muted}>
                                Ngày mong muốn:{' '}
                                <b>{formatDate(request.desiredDate)}</b> · Khung
                                giờ:{' '}
                                <b>{request.desiredTime || 'Chưa chọn'}</b> · Loại
                                khám: <b>{request.type || 'OFFLINE'}</b>
                            </p>

                            <p className={styles.muted}>
                                {getRequestDescription(request)}
                            </p>

                            {request.rejectionReason && (
                                <p style={{ color: '#ef4444', lineHeight: 1.6 }}>
                                    Lý do từ chối: {request.rejectionReason}
                                </p>
                            )}

                            {(request.cancelReason ||
                                request.cancellationReason) && (
                                    <p style={{ color: '#64748b', lineHeight: 1.6 }}>
                                        Lý do hủy:{' '}
                                        {request.cancelReason ||
                                            request.cancellationReason}
                                    </p>
                                )}

                            <Space wrap>
                                <Button
                                    icon={<EyeOutlined />}
                                    onClick={() => openDetail(request)}
                                >
                                    Xem chi tiết
                                </Button>

                                <Button
                                    danger
                                    icon={<StopOutlined />}
                                    disabled={!canCancel(request)}
                                    loading={cancellingId === request.id}
                                    onClick={() => handleCancel(request)}
                                >
                                    Hủy yêu cầu
                                </Button>
                            </Space>
                        </article>
                    ))}
                </ClinicalPageState>
            </section>

            <Drawer
                title="Chi tiết yêu cầu đặt lịch"
                open={openDetailDrawer}
                width={620}
                onClose={() => setOpenDetailDrawer(false)}
                extra={
                    selectedRequest && (
                        <Space>
                            {selectedRequest.appointmentId && (
                                <Link href="/dashboard/patient/appointments">
                                    <Button icon={<CalendarOutlined />}>
                                        Xem lịch hẹn
                                    </Button>
                                </Link>
                            )}

                            {canCancel(selectedRequest) && (
                                <Button
                                    danger
                                    icon={<StopOutlined />}
                                    loading={cancellingId === selectedRequest.id}
                                    onClick={() => handleCancel(selectedRequest)}
                                >
                                    Hủy yêu cầu
                                </Button>
                            )}
                        </Space>
                    )
                }
            >
                {selectedRequest && (
                    <Descriptions
                        bordered
                        column={1}
                        size="small"
                        title={getRequestTitle(selectedRequest)}
                    >
                        <Descriptions.Item label="Trạng thái">
                            <StatusTag value={selectedRequest.status} />
                        </Descriptions.Item>

                        <Descriptions.Item label="Chuyên khoa">
                            {selectedRequest.specialtyName || 'Chưa chọn'}
                        </Descriptions.Item>

                        <Descriptions.Item label="Bác sĩ">
                            {selectedRequest.doctorName || 'Chưa chỉ định'}
                        </Descriptions.Item>

                        <Descriptions.Item label="Ngày mong muốn">
                            {formatDate(selectedRequest.desiredDate)}
                        </Descriptions.Item>

                        <Descriptions.Item label="Khung giờ">
                            {selectedRequest.desiredTime || 'Chưa chọn'}
                        </Descriptions.Item>

                        <Descriptions.Item label="Loại khám">
                            {selectedRequest.type || 'OFFLINE'}
                        </Descriptions.Item>

                        <Descriptions.Item label="Triệu chứng">
                            {selectedRequest.symptoms || 'Chưa cập nhật'}
                        </Descriptions.Item>

                        <Descriptions.Item label="Lý do khám">
                            {selectedRequest.reason || 'Chưa cập nhật'}
                        </Descriptions.Item>

                        <Descriptions.Item label="Ghi chú">
                            {selectedRequest.note || 'Không có ghi chú'}
                        </Descriptions.Item>

                        <Descriptions.Item label="Lý do từ chối">
                            {selectedRequest.rejectionReason ||
                                'Không có hoặc chưa bị từ chối'}
                        </Descriptions.Item>

                        <Descriptions.Item label="Lý do hủy">
                            {selectedRequest.cancelReason ||
                                selectedRequest.cancellationReason ||
                                'Không có hoặc chưa bị hủy'}
                        </Descriptions.Item>

                        <Descriptions.Item label="Ngày gửi">
                            {formatDateTime(selectedRequest.createdAt)}
                        </Descriptions.Item>

                        <Descriptions.Item label="Cập nhật gần nhất">
                            {formatDateTime(selectedRequest.updatedAt)}
                        </Descriptions.Item>
                    </Descriptions>
                )}
            </Drawer>
        </PatientPortalFrame>
    );
}