'use client';

import {
    CalendarOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    CloseCircleOutlined,
    EyeOutlined,
    ReloadOutlined,
    SearchOutlined,
    TeamOutlined,
    UserOutlined,
    WarningOutlined,
} from '@ant-design/icons';
import {
    Alert,
    Button,
    Card,
    DatePicker,
    Descriptions,
    Drawer,
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

type AppointmentRequestView = AppointmentRequest & {
    patientEmail?: string;
    patientPhone?: string;
    reason?: string;
    note?: string;
    appointmentId?: string;
    createdAt?: string;
    updatedAt?: string;
    approvedAt?: string;
    rejectedAt?: string;
    cancelledAt?: string;
    cancelReason?: string;
};

const statusOptions: Array<{
    value: RequestStatusFilter;
    label: string;
}> = [
        { value: 'ALL', label: 'Tất cả' },
        { value: 'PENDING', label: 'Chờ duyệt' },
        { value: 'APPROVED', label: 'Đã duyệt' },
        { value: 'REJECTED', label: 'Đã từ chối' },
        { value: 'CANCELLED', label: 'Đã hủy' },
    ];

function normalizeKeyword(value?: string) {
    return String(value || '')
        .trim()
        .toLowerCase();
}

function formatDate(value?: string) {
    if (!value) return 'Chưa rõ';

    const parsed = dayjs(value);

    if (!parsed.isValid()) return value;

    return parsed.format('DD/MM/YYYY');
}

function formatTime(value?: string) {
    if (!value) return 'Chưa rõ';

    if (/^\d{2}:\d{2}/.test(value)) {
        return value.slice(0, 5);
    }

    const parsed = dayjs(value);

    if (!parsed.isValid()) return value;

    return parsed.format('HH:mm');
}

function formatDateTime(value?: string) {
    if (!value) return 'Chưa ghi nhận';

    const parsed = dayjs(value);

    if (!parsed.isValid()) return value;

    return parsed.format('DD/MM/YYYY HH:mm');
}

function formatDesiredTime(request?: AppointmentRequestView | null) {
    if (!request) return 'Chưa rõ';

    return `${formatDate(request.desiredDate)} · ${formatTime(
        request.desiredTime,
    )}`;
}

function formatSlotTime(value?: string) {
    return formatDateTime(value);
}

function getAppointmentTypeLabel(value?: string) {
    const type = String(value || 'OFFLINE').toUpperCase();

    if (type === 'ONLINE') return 'Khám online';

    return 'Khám trực tiếp';
}

function getRequestSummary(request: AppointmentRequestView) {
    return (
        request.symptoms ||
        request.reason ||
        request.note ||
        'Bệnh nhân chưa nhập mô tả triệu chứng.'
    );
}

function isSameDesiredDate(
    request: AppointmentRequestView,
    selectedDate: Dayjs | null,
) {
    if (!selectedDate) return true;

    if (!request.desiredDate) return false;

    return dayjs(request.desiredDate).isSame(selectedDate, 'day');
}

function isPending(request: AppointmentRequestView) {
    return String(request.status || '').toUpperCase() === 'PENDING';
}

function isUrgentRequest(request: AppointmentRequestView) {
    if (!isPending(request) || !request.desiredDate) return false;

    return dayjs(request.desiredDate).diff(dayjs(), 'day') <= 2;
}

function getRequestPriorityTag(request: AppointmentRequestView) {
    if (!isPending(request)) {
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

function getRequestPriorityWeight(request: AppointmentRequestView) {
    if (!isPending(request)) return 10;

    if (!request.doctorId) return 1;
    if (!request.desiredDate) return 2;

    const desired = dayjs(request.desiredDate);

    if (desired.isBefore(dayjs(), 'day')) return 0;
    if (desired.isSame(dayjs(), 'day')) return 1;
    if (desired.diff(dayjs(), 'day') <= 2) return 2;

    return 3;
}

function sortRequests(a: AppointmentRequestView, b: AppointmentRequestView) {
    const statusWeight: Record<string, number> = {
        PENDING: 1,
        APPROVED: 2,
        REJECTED: 3,
        CANCELLED: 4,
    };

    const aStatus = statusWeight[String(a.status || '').toUpperCase()] || 99;
    const bStatus = statusWeight[String(b.status || '').toUpperCase()] || 99;

    if (aStatus !== bStatus) {
        return aStatus - bStatus;
    }

    const priorityA = getRequestPriorityWeight(a);
    const priorityB = getRequestPriorityWeight(b);

    if (priorityA !== priorityB) {
        return priorityA - priorityB;
    }

    return String(a.desiredDate || '').localeCompare(String(b.desiredDate || ''));
}

function getSlotLabel(slot: WorkSlot, request?: AppointmentRequestView | null) {
    const isDesiredDay =
        request?.desiredDate &&
        dayjs(slot.startTime).isSame(dayjs(request.desiredDate), 'day');

    return `${formatSlotTime(slot.startTime)} → ${formatTime(slot.endTime)}${isDesiredDay ? ' · Khớp ngày mong muốn' : ''
        }`;
}

export default function ReceptionistRequestsPage() {
    const { session, loading: authLoading } = useAuthSession();

    const [rejectForm] = Form.useForm<RejectFormValues>();

    const [requests, setRequests] = useState<AppointmentRequestView[]>([]);
    const [status, setStatus] = useState<RequestStatusFilter>('PENDING');
    const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null);
    const [keyword, setKeyword] = useState('');

    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [slotLoading, setSlotLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [approveOpen, setApproveOpen] = useState(false);
    const [rejectOpen, setRejectOpen] = useState(false);
    const [detailOpen, setDetailOpen] = useState(false);

    const [selectedRequest, setSelectedRequest] =
        useState<AppointmentRequestView | null>(null);
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
            const sorted = [...((page.content || []) as AppointmentRequestView[])].sort(
                sortRequests,
            );

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
        const search = normalizeKeyword(keyword);

        return requests.filter((request) => {
            const requestStatus = String(request.status || '').toUpperCase();

            const statusMatched = status === 'ALL' || requestStatus === status;
            const dateMatched = isSameDesiredDate(request, selectedDate);

            const textMatched =
                !search ||
                request.patientName?.toLowerCase().includes(search) ||
                request.patientEmail?.toLowerCase().includes(search) ||
                request.patientPhone?.toLowerCase().includes(search) ||
                request.specialtyName?.toLowerCase().includes(search) ||
                request.doctorName?.toLowerCase().includes(search) ||
                request.symptoms?.toLowerCase().includes(search) ||
                request.reason?.toLowerCase().includes(search) ||
                request.note?.toLowerCase().includes(search) ||
                request.type?.toLowerCase().includes(search);

            return statusMatched && dateMatched && textMatched;
        });
    }, [requests, status, selectedDate, keyword]);

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

        const urgent = requests.filter(isUrgentRequest).length;

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

    const pendingFocusRequests = useMemo(() => {
        return requests.filter(isPending).slice(0, 4);
    }, [requests]);

    const openDetail = (request: AppointmentRequestView) => {
        setSelectedRequest(request);
        setDetailOpen(true);
    };

    const openApproveModal = async (request: AppointmentRequestView) => {
        if (!canWriteRequests) {
            message.warning('Tài khoản hiện tại không có quyền duyệt lịch.');
            return;
        }

        if (!request.doctorId) {
            message.warning(
                'Yêu cầu này chưa có bác sĩ cụ thể. Hiện tại cần bệnh nhân chọn bác sĩ trước khi lễ tân duyệt.',
            );
            return;
        }

        try {
            setSelectedRequest(request);
            setSelectedSlotId(undefined);
            setAvailableSlots([]);
            setApproveOpen(true);
            setSlotLoading(true);
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
            setSlotLoading(false);
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
            setDetailOpen(false);
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

    const openRejectModal = (request: AppointmentRequestView) => {
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

            await rejectAppointmentRequest(
                selectedRequest.id,
                values.reason.trim(),
            );

            message.success('Đã từ chối yêu cầu.');
            setRejectOpen(false);
            setDetailOpen(false);
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

    const handleResetFilter = () => {
        setKeyword('');
        setStatus('PENDING');
        setSelectedDate(null);
    };

    if (authLoading || !session) {
        return <ClinicalPageState loading>Loading</ClinicalPageState>;
    }

    return (
        <DashboardFrame
            session={session}
            title="Yêu cầu đặt lịch"
            subtitle="Lễ tân kiểm tra yêu cầu, chọn slot khám và tạo lịch hẹn chính thức"
        >
            <RoleGuardState
                session={session}
                anyPermissions={['APPOINTMENT:READ_ANY', 'APPOINTMENT:WRITE_ANY']}
            >
                <div className={styles.roleDashboard}>
                    <section className={styles.heroCard}>
                        <div>
                            <span>Receptionist Request Board</span>
                            <h2>Xử lý yêu cầu đặt lịch của bệnh nhân.</h2>
                            <p>
                                Ưu tiên các yêu cầu gần ngày khám, yêu cầu thiếu bác
                                sĩ và các request đang chờ duyệt để tránh bệnh nhân
                                phải chờ lâu.
                            </p>
                        </div>

                        <div className={styles.pulseCard}>
                            <strong>{metrics.pending}</strong>
                            <span>yêu cầu đang chờ duyệt</span>
                        </div>
                    </section>

                    <section className={styles.metricGrid}>
                        <Card className={styles.metricCard}>
                            <Statistic
                                title="Tổng yêu cầu"
                                value={metrics.total}
                                prefix={<CalendarOutlined />}
                            />
                            <p>Tất cả request trong hệ thống.</p>
                        </Card>

                        <Card className={styles.metricCard}>
                            <Statistic
                                title="Chờ duyệt"
                                value={metrics.pending}
                                prefix={<ClockCircleOutlined />}
                            />
                            <p>Cần lễ tân xử lý và chọn slot.</p>
                        </Card>

                        <Card className={styles.metricCard}>
                            <Statistic
                                title="Sắp đến ngày"
                                value={metrics.urgent}
                                prefix={<WarningOutlined />}
                            />
                            <p>Ưu tiên xử lý trong hôm nay.</p>
                        </Card>

                        <Card className={styles.metricCard}>
                            <Statistic
                                title="Cần bác sĩ"
                                value={metrics.needDoctor}
                                prefix={<TeamOutlined />}
                            />
                            <p>Request chưa gắn bác sĩ cụ thể.</p>
                        </Card>
                    </section>

                    <section className={styles.detailGrid}>
                        <Card
                            className={styles.detailCard}
                            title="Việc cần ưu tiên"
                        >
                            {pendingFocusRequests.length === 0 ? (
                                <ClinicalEmptyState
                                    title="Không có yêu cầu chờ duyệt"
                                    description="Hiện tại không có request PENDING cần xử lý."
                                />
                            ) : (
                                <Space
                                    direction="vertical"
                                    size={12}
                                    style={{ width: '100%' }}
                                >
                                    {pendingFocusRequests.map((request) => (
                                        <article
                                            key={request.id}
                                            className={styles.cleanListItem}
                                            style={{
                                                borderRadius: 18,
                                                padding: 16,
                                                border: '1px solid #e5e7eb',
                                            }}
                                        >
                                            <div className={styles.listTitle}>
                                                <strong>
                                                    {request.patientName ||
                                                        'Bệnh nhân'}
                                                </strong>

                                                <Space wrap>
                                                    <StatusTag
                                                        value={request.status}
                                                    />
                                                    {getRequestPriorityTag(request)}
                                                </Space>
                                            </div>

                                            <p>
                                                Bác sĩ:{' '}
                                                <b>
                                                    {request.doctorName ||
                                                        'Chưa chọn bác sĩ'}
                                                </b>
                                            </p>

                                            <p>
                                                Thời gian mong muốn:{' '}
                                                <b>{formatDesiredTime(request)}</b>
                                            </p>

                                            <Space wrap>
                                                <Button
                                                    size="small"
                                                    icon={<EyeOutlined />}
                                                    onClick={() =>
                                                        openDetail(request)
                                                    }
                                                >
                                                    Chi tiết
                                                </Button>

                                                <Button
                                                    size="small"
                                                    type="primary"
                                                    disabled={
                                                        !canWriteRequests ||
                                                        !request.doctorId
                                                    }
                                                    onClick={() =>
                                                        openApproveModal(request)
                                                    }
                                                >
                                                    Duyệt
                                                </Button>
                                            </Space>
                                        </article>
                                    ))}
                                </Space>
                            )}
                        </Card>

                        <Card
                            className={styles.detailCard}
                            title="Tổng quan trạng thái"
                        >
                            <Space
                                direction="vertical"
                                size={12}
                                style={{ width: '100%' }}
                            >
                                <Alert
                                    type="info"
                                    showIcon
                                    message={`${metrics.pending} yêu cầu đang chờ duyệt`}
                                    description="Các request này cần được chọn slot hoặc từ chối với lý do rõ ràng."
                                />

                                <Alert
                                    type="success"
                                    showIcon
                                    message={`${metrics.approved} yêu cầu đã duyệt`}
                                    description="Các yêu cầu này đã được chuyển thành lịch hẹn chính thức."
                                />

                                <Alert
                                    type="warning"
                                    showIcon
                                    message={`${metrics.rejected + metrics.cancelled} yêu cầu đã đóng`}
                                    description="Bao gồm request đã bị từ chối hoặc bệnh nhân đã hủy."
                                />
                            </Space>
                        </Card>
                    </section>

                    <Card className={styles.detailCard}>
                        <div className={styles.panelHeader}>
                            <div>
                                <span>Appointment request board</span>
                                <h2>Danh sách yêu cầu đặt lịch</h2>
                                <p>
                                    Lễ tân kiểm tra thông tin, xem chi tiết request,
                                    chọn slot phù hợp và duyệt để tạo lịch hẹn.
                                </p>
                            </div>

                            <Space wrap>
                                <Button
                                    icon={<ReloadOutlined />}
                                    onClick={loadRequests}
                                    loading={loading}
                                >
                                    Làm mới
                                </Button>
                            </Space>
                        </div>

                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns:
                                    'minmax(260px, 1fr) 190px 190px auto',
                                gap: 12,
                                marginTop: 20,
                                marginBottom: 20,
                            }}
                        >
                            <Input
                                allowClear
                                prefix={<SearchOutlined />}
                                placeholder="Tìm theo bệnh nhân, bác sĩ, chuyên khoa, triệu chứng"
                                value={keyword}
                                onChange={(event) =>
                                    setKeyword(event.target.value)
                                }
                            />

                            <DatePicker
                                value={selectedDate}
                                onChange={setSelectedDate}
                                allowClear
                                placeholder="Ngày mong muốn"
                            />

                            <Select
                                value={status}
                                onChange={setStatus}
                                options={statusOptions}
                            />

                            <Button onClick={handleResetFilter}>Đặt lại</Button>
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
                                    title="Không có yêu cầu phù hợp"
                                    description="Không tìm thấy yêu cầu đặt lịch nào theo bộ lọc hiện tại."
                                />
                            ) : (
                                <List
                                    dataSource={filteredRequests}
                                    renderItem={(request) => (
                                        <List.Item
                                            className={styles.cleanListItem}
                                        >
                                            <List.Item.Meta
                                                title={
                                                    <div
                                                        className={
                                                            styles.listTitle
                                                        }
                                                    >
                                                        <Space wrap>
                                                            <UserOutlined />
                                                            <strong>
                                                                {request.patientName ||
                                                                    'Bệnh nhân'}
                                                            </strong>
                                                        </Space>

                                                        <Space wrap>
                                                            <StatusTag
                                                                value={
                                                                    request.status
                                                                }
                                                            />

                                                            {getRequestPriorityTag(
                                                                request,
                                                            )}

                                                            <Tag color="cyan">
                                                                {getAppointmentTypeLabel(
                                                                    request.type,
                                                                )}
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
                                                                {formatDesiredTime(
                                                                    request,
                                                                )}
                                                            </b>
                                                        </p>

                                                        <p>
                                                            Triệu chứng:{' '}
                                                            {getRequestSummary(
                                                                request,
                                                            )}
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

                                            <Space wrap>
                                                <Button
                                                    icon={<EyeOutlined />}
                                                    onClick={() =>
                                                        openDetail(request)
                                                    }
                                                >
                                                    Chi tiết
                                                </Button>

                                                {request.status === 'PENDING' ? (
                                                    <>
                                                        <Button
                                                            type="primary"
                                                            icon={
                                                                <CheckCircleOutlined />
                                                            }
                                                            disabled={
                                                                !canWriteRequests ||
                                                                !request.doctorId
                                                            }
                                                            loading={
                                                                actionLoading ===
                                                                request.id
                                                            }
                                                            onClick={() =>
                                                                openApproveModal(
                                                                    request,
                                                                )
                                                            }
                                                        >
                                                            Duyệt
                                                        </Button>

                                                        <Button
                                                            danger
                                                            icon={
                                                                <CloseCircleOutlined />
                                                            }
                                                            disabled={
                                                                !canWriteRequests
                                                            }
                                                            loading={
                                                                actionLoading ===
                                                                request.id
                                                            }
                                                            onClick={() =>
                                                                openRejectModal(
                                                                    request,
                                                                )
                                                            }
                                                        >
                                                            Từ chối
                                                        </Button>
                                                    </>
                                                ) : (
                                                    <StatusTag
                                                        value={request.status}
                                                    />
                                                )}
                                            </Space>
                                        </List.Item>
                                    )}
                                />
                            )}
                        </ClinicalPageState>
                    </Card>
                </div>

                <Drawer
                    title="Chi tiết yêu cầu đặt lịch"
                    open={detailOpen}
                    width={660}
                    onClose={() => setDetailOpen(false)}
                    extra={
                        selectedRequest &&
                        selectedRequest.status === 'PENDING' && (
                            <Space>
                                <Button
                                    type="primary"
                                    icon={<CheckCircleOutlined />}
                                    disabled={
                                        !canWriteRequests ||
                                        !selectedRequest.doctorId
                                    }
                                    onClick={() =>
                                        openApproveModal(selectedRequest)
                                    }
                                >
                                    Duyệt yêu cầu
                                </Button>

                                <Button
                                    danger
                                    icon={<CloseCircleOutlined />}
                                    disabled={!canWriteRequests}
                                    onClick={() =>
                                        openRejectModal(selectedRequest)
                                    }
                                >
                                    Từ chối
                                </Button>
                            </Space>
                        )
                    }
                >
                    {selectedRequest && (
                        <Descriptions
                            bordered
                            column={1}
                            size="small"
                            title={selectedRequest.patientName || 'Bệnh nhân'}
                        >
                            <Descriptions.Item label="Trạng thái">
                                <StatusTag value={selectedRequest.status} />
                            </Descriptions.Item>

                            <Descriptions.Item label="Bệnh nhân">
                                {selectedRequest.patientName || 'Chưa rõ'}
                            </Descriptions.Item>

                            <Descriptions.Item label="Email">
                                {selectedRequest.patientEmail || 'Chưa cập nhật'}
                            </Descriptions.Item>

                            <Descriptions.Item label="Số điện thoại">
                                {selectedRequest.patientPhone || 'Chưa cập nhật'}
                            </Descriptions.Item>

                            <Descriptions.Item label="Chuyên khoa">
                                {selectedRequest.specialtyName || 'Chưa rõ'}
                            </Descriptions.Item>

                            <Descriptions.Item label="Bác sĩ">
                                {selectedRequest.doctorName ||
                                    'Chưa chọn bác sĩ'}
                            </Descriptions.Item>

                            <Descriptions.Item label="Hình thức khám">
                                {getAppointmentTypeLabel(selectedRequest.type)}
                            </Descriptions.Item>

                            <Descriptions.Item label="Thời gian mong muốn">
                                {formatDesiredTime(selectedRequest)}
                            </Descriptions.Item>

                            <Descriptions.Item label="Triệu chứng">
                                {getRequestSummary(selectedRequest)}
                            </Descriptions.Item>

                            <Descriptions.Item label="Lý do từ chối">
                                {selectedRequest.rejectionReason ||
                                    'Không có hoặc chưa bị từ chối'}
                            </Descriptions.Item>

                            <Descriptions.Item label="Lý do hủy">
                                {selectedRequest.cancelReason ||
                                    'Không có hoặc chưa bị hủy'}
                            </Descriptions.Item>

                            <Descriptions.Item label="Ngày tạo">
                                {formatDateTime(selectedRequest.createdAt)}
                            </Descriptions.Item>

                            <Descriptions.Item label="Cập nhật gần nhất">
                                {formatDateTime(selectedRequest.updatedAt)}
                            </Descriptions.Item>
                        </Descriptions>
                    )}
                </Drawer>

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
                    width={640}
                >
                    <Alert
                        type="info"
                        showIcon
                        message="Chọn slot khám chính thức"
                        description="Sau khi duyệt, hệ thống sẽ tạo appointment, đổi slot thành BOOKED và gửi thông báo cho bệnh nhân/bác sĩ."
                        style={{ marginBottom: 16 }}
                    />

                    <Descriptions bordered column={1} size="small">
                        <Descriptions.Item label="Bệnh nhân">
                            {selectedRequest?.patientName || 'N/A'}
                        </Descriptions.Item>

                        <Descriptions.Item label="Bác sĩ">
                            {selectedRequest?.doctorName || 'N/A'}
                        </Descriptions.Item>

                        <Descriptions.Item label="Ngày mong muốn">
                            {formatDesiredTime(selectedRequest)}
                        </Descriptions.Item>

                        <Descriptions.Item label="Triệu chứng">
                            {selectedRequest
                                ? getRequestSummary(selectedRequest)
                                : 'N/A'}
                        </Descriptions.Item>
                    </Descriptions>

                    <Select
                        value={selectedSlotId}
                        onChange={setSelectedSlotId}
                        placeholder="Chọn slot khám khả dụng"
                        loading={slotLoading}
                        style={{ width: '100%', marginTop: 16 }}
                        options={availableSlots.map((slot) => ({
                            value: slot.id,
                            label: getSlotLabel(slot, selectedRequest),
                        }))}
                    />

                    {availableSlots.length === 0 && !slotLoading && (
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
                        requiredMark={false}
                    >
                        <Alert
                            type="warning"
                            showIcon
                            message="Yêu cầu sẽ bị từ chối"
                            description="Lý do từ chối sẽ được lưu và hiển thị cho bệnh nhân."
                            style={{ marginBottom: 16 }}
                        />

                        <Form.Item label="Bệnh nhân">
                            <Input
                                value={selectedRequest?.patientName || 'N/A'}
                                disabled
                            />
                        </Form.Item>

                        <Form.Item
                            label="Lý do từ chối"
                            name="reason"
                            rules={[
                                {
                                    required: true,
                                    message: 'Nhập lý do từ chối',
                                },
                                {
                                    max: 500,
                                    message: 'Lý do tối đa 500 ký tự',
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