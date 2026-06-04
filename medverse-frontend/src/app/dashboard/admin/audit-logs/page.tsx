'use client';

import {
    AuditOutlined,
    CheckCircleOutlined,
    EyeOutlined,
    FileSearchOutlined,
    ReloadOutlined,
    SearchOutlined,
    UserOutlined,
    WarningOutlined,
} from '@ant-design/icons';
import {
    Alert,
    Button,
    Card,
    Descriptions,
    Drawer,
    Input,
    Select,
    Skeleton,
    Space,
    Statistic,
    Table,
    Tag,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useMemo, useState } from 'react';
import DashboardFrame from '../../_components/DashboardFrame';
import RoleGuardState from '../../_components/RoleGuardState';
import StatusTag from '../../_components/StatusTag';
import { useAuthSession } from '@/lib/auth/use-auth-session';
import { getAdminAuditLogs } from '@/services/admin-audit.service';
import type { AuditLog } from '@/types/clinical';
import styles from '../../dashboard.module.scss';

type AuditFilter = {
    keyword: string;
    action: string;
    result: string;
};

const resultOptions = [
    {
        label: 'Tất cả kết quả',
        value: 'ALL',
    },
    {
        label: 'Thành công',
        value: 'SUCCESS',
    },
    {
        label: 'Thất bại',
        value: 'FAILED',
    },
];

function normalizeKeyword(value?: string) {
    return String(value || '')
        .trim()
        .toLowerCase();
}

function formatDateTime(value?: string) {
    if (!value) return 'Chưa ghi nhận';

    return new Date(value).toLocaleString('vi-VN');
}

function getActionLabel(action?: string) {
    const labels: Record<string, string> = {
        LOGIN: 'Đăng nhập',
        LOGOUT: 'Đăng xuất',
        CREATE: 'Tạo mới',
        UPDATE: 'Cập nhật',
        DELETE: 'Xóa',
        READ: 'Truy cập',
        APPROVE: 'Duyệt',
        REJECT: 'Từ chối',
        CANCEL: 'Hủy',
        IMPORT: 'Nhập kho',
        EXPORT: 'Xuất dữ liệu',
    };

    return labels[String(action || '').toUpperCase()] || action || 'Không rõ';
}

function getEntityLabel(entityType?: string) {
    const labels: Record<string, string> = {
        USER: 'Người dùng',
        ROLE: 'Vai trò',
        PERMISSION: 'Quyền',
        APPOINTMENT: 'Lịch hẹn',
        APPOINTMENT_REQUEST: 'Yêu cầu đặt lịch',
        MEDICAL_RECORD: 'Bệnh án',
        PRESCRIPTION: 'Đơn thuốc',
        MEDICATION: 'Thuốc',
        STOCK_IMPORT: 'Nhập kho',
        SPECIALTY: 'Chuyên khoa',
        DOCTOR_PROFILE: 'Hồ sơ bác sĩ',
    };

    return labels[String(entityType || '').toUpperCase()] || entityType || 'Không rõ';
}

function getActionTone(action?: string) {
    const normalized = String(action || '').toUpperCase();

    if (['DELETE', 'CANCEL', 'REJECT'].includes(normalized)) return 'red';
    if (['CREATE', 'APPROVE', 'IMPORT'].includes(normalized)) return 'green';
    if (['UPDATE'].includes(normalized)) return 'blue';

    return 'default';
}

export default function AdminAuditLogsPage() {
    const { session, loading: authLoading } = useAuthSession();

    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [filter, setFilter] = useState<AuditFilter>({
        keyword: '',
        action: 'ALL',
        result: 'ALL',
    });

    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
    const [openDetailDrawer, setOpenDetailDrawer] = useState(false);

    const loadLogs = async () => {
        try {
            setLoading(true);
            setError(null);

            const page = await getAdminAuditLogs({
                size: 100,
                keyword: filter.keyword,
                action: filter.action,
                result: filter.result,
            });

            setLogs(page.content || []);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Không thể tải nhật ký hệ thống.',
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!session) return;

        loadLogs();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session]);

    const actionOptions = useMemo(() => {
        const actions = Array.from(
            new Set(logs.map((item) => item.action).filter(Boolean)),
        );

        return [
            {
                label: 'Tất cả hành động',
                value: 'ALL',
            },
            ...actions.map((action) => ({
                label: getActionLabel(action),
                value: action,
            })),
        ];
    }, [logs]);

    const filteredLogs = useMemo(() => {
        const keyword = normalizeKeyword(filter.keyword);

        return logs.filter((item) => {
            const matchKeyword =
                !keyword ||
                item.actorEmail?.toLowerCase().includes(keyword) ||
                item.action?.toLowerCase().includes(keyword) ||
                item.entityType?.toLowerCase().includes(keyword) ||
                item.entityId?.toLowerCase().includes(keyword) ||
                item.details?.toLowerCase().includes(keyword);

            const matchAction =
                filter.action === 'ALL' || item.action === filter.action;

            const matchResult =
                filter.result === 'ALL' || item.result === filter.result;

            return matchKeyword && matchAction && matchResult;
        });
    }, [logs, filter]);

    const metrics = useMemo(() => {
        const success = logs.filter((item) => item.result === 'SUCCESS').length;
        const failed = logs.filter((item) => item.result === 'FAILED').length;

        const actors = new Set(
            logs.map((item) => item.actorEmail).filter(Boolean),
        ).size;

        return {
            total: logs.length,
            success,
            failed,
            actors,
        };
    }, [logs]);

    const openDetail = (log: AuditLog) => {
        setSelectedLog(log);
        setOpenDetailDrawer(true);
    };

    const handleReset = () => {
        setFilter({
            keyword: '',
            action: 'ALL',
            result: 'ALL',
        });
    };

    const columns: ColumnsType<AuditLog> = [
        {
            title: 'Người thực hiện',
            key: 'actor',
            render: (_, record) => (
                <Space direction="vertical" size={2}>
                    <strong>{record.actorEmail || 'Hệ thống'}</strong>
                    <span className={styles.mutedText}>
                        {record.actorId || 'Không có ID'}
                    </span>
                </Space>
            ),
        },
        {
            title: 'Hành động',
            dataIndex: 'action',
            width: 150,
            render: (value) => (
                <Tag color={getActionTone(value)}>{getActionLabel(value)}</Tag>
            ),
        },
        {
            title: 'Đối tượng',
            key: 'entity',
            render: (_, record) => (
                <Space direction="vertical" size={2}>
                    <strong>{getEntityLabel(record.entityType)}</strong>
                    <span className={styles.mutedText}>
                        {record.entityId || 'Không có ID'}
                    </span>
                </Space>
            ),
        },
        {
            title: 'Kết quả',
            dataIndex: 'result',
            width: 130,
            render: (value) => <StatusTag value={value} />,
        },
        {
            title: 'Thời gian',
            dataIndex: 'occurredAt',
            width: 190,
            render: (value) => formatDateTime(value),
        },
        {
            title: 'Thao tác',
            key: 'actions',
            width: 120,
            fixed: 'right',
            render: (_, record) => (
                <Button
                    size="small"
                    icon={<EyeOutlined />}
                    onClick={() => openDetail(record)}
                >
                    Chi tiết
                </Button>
            ),
        },
    ];

    if (authLoading || !session) {
        return <Skeleton active paragraph={{ rows: 8 }} />;
    }

    return (
        <DashboardFrame
            session={session}
            title="Audit Logs"
            subtitle="Theo dõi nhật ký truy cập, thao tác và thay đổi quan trọng trong hệ thống"
        >
            <RoleGuardState session={session} allow={['ADMIN']}>
                <div className={styles.roleDashboard}>
                    {error && (
                        <Alert
                            type="error"
                            showIcon
                            message="Không thể tải audit logs"
                            description={error}
                        />
                    )}

                    <section className={styles.heroCard}>
                        <div>
                            <span>Nhật ký hệ thống</span>
                            <h2>Theo dõi các thao tác quan trọng trong MedVerse.</h2>
                            <p>
                                Audit logs giúp quản trị viên kiểm tra ai đã thực hiện
                                thao tác nào, tác động đến đối tượng nào và kết quả xử lý
                                có thành công hay không.
                            </p>
                        </div>

                        <div className={styles.pulseCard}>
                            <strong>{metrics.total}</strong>
                            <span>bản ghi audit</span>
                        </div>
                    </section>

                    <section className={styles.metricGrid}>
                        <Card className={styles.metricCard}>
                            <Statistic
                                title="Tổng bản ghi"
                                value={metrics.total}
                                prefix={<AuditOutlined />}
                            />
                            <p>Nhật ký đang hiển thị trong hệ thống.</p>
                        </Card>

                        <Card className={styles.metricCard}>
                            <Statistic
                                title="Thành công"
                                value={metrics.success}
                                prefix={<CheckCircleOutlined />}
                            />
                            <p>Các thao tác được xử lý thành công.</p>
                        </Card>

                        <Card className={styles.metricCard}>
                            <Statistic
                                title="Thất bại"
                                value={metrics.failed}
                                prefix={<WarningOutlined />}
                            />
                            <p>Các thao tác cần kiểm tra lại.</p>
                        </Card>

                        <Card className={styles.metricCard}>
                            <Statistic
                                title="Người thao tác"
                                value={metrics.actors}
                                prefix={<UserOutlined />}
                            />
                            <p>Số tài khoản đã phát sinh hoạt động.</p>
                        </Card>
                    </section>

                    <Card
                        className={styles.detailCard}
                        title="Danh sách audit logs"
                        extra={
                            <Button icon={<ReloadOutlined />} onClick={loadLogs}>
                                Làm mới
                            </Button>
                        }
                    >
                        <div className={styles.toolbar}>
                            <Input
                                allowClear
                                prefix={<SearchOutlined />}
                                placeholder="Tìm theo email, hành động, đối tượng hoặc nội dung"
                                value={filter.keyword}
                                onChange={(event) =>
                                    setFilter((current) => ({
                                        ...current,
                                        keyword: event.target.value,
                                    }))
                                }
                                onPressEnter={loadLogs}
                            />

                            <Select
                                value={filter.action}
                                options={actionOptions}
                                onChange={(value) =>
                                    setFilter((current) => ({
                                        ...current,
                                        action: value,
                                    }))
                                }
                                style={{ minWidth: 190 }}
                            />

                            <Select
                                value={filter.result}
                                options={resultOptions}
                                onChange={(value) =>
                                    setFilter((current) => ({
                                        ...current,
                                        result: value,
                                    }))
                                }
                                style={{ minWidth: 170 }}
                            />

                            <Button
                                type="primary"
                                icon={<FileSearchOutlined />}
                                onClick={loadLogs}
                            >
                                Lọc
                            </Button>

                            <Button icon={<ReloadOutlined />} onClick={handleReset}>
                                Đặt lại
                            </Button>
                        </div>

                        <Table
                            rowKey="id"
                            loading={loading}
                            columns={columns}
                            dataSource={filteredLogs}
                            pagination={{
                                pageSize: 10,
                                showSizeChanger: false,
                            }}
                            scroll={{ x: 1080 }}
                        />
                    </Card>
                </div>

                <Drawer
                    title="Chi tiết audit log"
                    open={openDetailDrawer}
                    width={620}
                    onClose={() => setOpenDetailDrawer(false)}
                >
                    {selectedLog && (
                        <Descriptions
                            bordered
                            column={1}
                            size="small"
                            title="Thông tin bản ghi"
                        >
                            <Descriptions.Item label="Người thực hiện">
                                {selectedLog.actorEmail || 'Hệ thống'}
                            </Descriptions.Item>

                            <Descriptions.Item label="Actor ID">
                                {selectedLog.actorId || 'Không có ID'}
                            </Descriptions.Item>

                            <Descriptions.Item label="Hành động">
                                <Tag color={getActionTone(selectedLog.action)}>
                                    {getActionLabel(selectedLog.action)}
                                </Tag>
                            </Descriptions.Item>

                            <Descriptions.Item label="Loại đối tượng">
                                {getEntityLabel(selectedLog.entityType)}
                            </Descriptions.Item>

                            <Descriptions.Item label="Entity ID">
                                {selectedLog.entityId || 'Không có ID'}
                            </Descriptions.Item>

                            <Descriptions.Item label="Kết quả">
                                <StatusTag value={selectedLog.result} />
                            </Descriptions.Item>

                            <Descriptions.Item label="Thời gian">
                                {formatDateTime(selectedLog.occurredAt)}
                            </Descriptions.Item>

                            <Descriptions.Item label="Chi tiết">
                                {selectedLog.details || 'Không có nội dung chi tiết.'}
                            </Descriptions.Item>
                        </Descriptions>
                    )}
                </Drawer>
            </RoleGuardState>
        </DashboardFrame>
    );
}