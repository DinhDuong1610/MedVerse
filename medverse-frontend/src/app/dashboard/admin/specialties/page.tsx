'use client';

import {
    AppstoreOutlined,
    DeleteOutlined,
    EditOutlined,
    EyeOutlined,
    PlusOutlined,
    ReloadOutlined,
    SearchOutlined,
    TeamOutlined,
} from '@ant-design/icons';
import {
    Alert,
    Button,
    Card,
    Descriptions,
    Drawer,
    Form,
    Input,
    Modal,
    Skeleton,
    Space,
    Statistic,
    Table,
    Tag,
    message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useMemo, useState } from 'react';
import DashboardFrame from '../../_components/DashboardFrame';
import RoleGuardState from '../../_components/RoleGuardState';
import { useAuthSession } from '@/lib/auth/use-auth-session';
import {
    createAdminSpecialty,
    deleteAdminSpecialty,
    getAdminSpecialties,
    updateAdminSpecialty,
} from '@/services/admin-specialty.service';
import type {
    AdminSpecialty,
    AdminSpecialtyPayload,
} from '@/types/admin-specialty';
import styles from '../../dashboard.module.scss';

type SpecialtyFormValues = {
    code: string;
    name: string;
    description?: string;
};

function normalizeKeyword(value?: string) {
    return String(value || '')
        .trim()
        .toLowerCase();
}

function formatDateTime(value?: string) {
    if (!value) return 'Chưa ghi nhận';

    return new Date(value).toLocaleString('vi-VN');
}

function buildPayload(values: SpecialtyFormValues): AdminSpecialtyPayload {
    const payload: AdminSpecialtyPayload = {
        code: values.code.trim().toUpperCase(),
        name: values.name.trim(),
    };

    const description = values.description?.trim();

    if (description) {
        payload.description = description;
    }

    return payload;
}

export default function AdminSpecialtiesPage() {
    const { session, loading: authLoading } = useAuthSession();

    const [specialties, setSpecialties] = useState<AdminSpecialty[]>([]);
    const [keyword, setKeyword] = useState('');

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [selectedSpecialty, setSelectedSpecialty] =
        useState<AdminSpecialty | null>(null);

    const [openDetailDrawer, setOpenDetailDrawer] = useState(false);
    const [openFormModal, setOpenFormModal] = useState(false);
    const [editingSpecialty, setEditingSpecialty] =
        useState<AdminSpecialty | null>(null);

    const [form] = Form.useForm<SpecialtyFormValues>();

    const loadSpecialties = async () => {
        try {
            setLoading(true);
            setError(null);

            const data = await getAdminSpecialties();

            setSpecialties(data || []);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Không thể tải danh sách chuyên khoa.',
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!session) return;

        loadSpecialties();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session]);

    const filteredSpecialties = useMemo(() => {
        const search = normalizeKeyword(keyword);

        if (!search) return specialties;

        return specialties.filter((item) => {
            return (
                item.code.toLowerCase().includes(search) ||
                item.name.toLowerCase().includes(search) ||
                item.description?.toLowerCase().includes(search)
            );
        });
    }, [specialties, keyword]);

    const metrics = useMemo(() => {
        const withDescription = specialties.filter((item) =>
            Boolean(item.description?.trim()),
        ).length;

        const missingDescription = specialties.length - withDescription;

        return {
            total: specialties.length,
            withDescription,
            missingDescription,
        };
    }, [specialties]);

    const openCreate = () => {
        setEditingSpecialty(null);
        form.resetFields();
        setOpenFormModal(true);
    };

    const openEdit = (specialty: AdminSpecialty) => {
        setEditingSpecialty(specialty);

        form.setFieldsValue({
            code: specialty.code,
            name: specialty.name,
            description: specialty.description,
        });

        setOpenFormModal(true);
    };

    const openDetail = (specialty: AdminSpecialty) => {
        setSelectedSpecialty(specialty);
        setOpenDetailDrawer(true);
    };

    const handleSubmit = async (values: SpecialtyFormValues) => {
        try {
            setSaving(true);

            const payload = buildPayload(values);

            if (editingSpecialty) {
                await updateAdminSpecialty(editingSpecialty.id, payload);
                message.success('Đã cập nhật chuyên khoa.');
            } else {
                await createAdminSpecialty(payload);
                message.success('Đã tạo chuyên khoa mới.');
            }

            setOpenFormModal(false);
            setEditingSpecialty(null);
            form.resetFields();

            await loadSpecialties();
        } catch (err) {
            message.error(
                err instanceof Error
                    ? err.message
                    : 'Không thể lưu chuyên khoa.',
            );
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = (specialty: AdminSpecialty) => {
        Modal.confirm({
            title: 'Xóa chuyên khoa?',
            content: (
                <div>
                    <p>
                        Chuyên khoa <b>{specialty.name}</b> sẽ bị xóa khỏi hệ
                        thống.
                    </p>
                    <p>
                        Không nên xóa nếu chuyên khoa này đang được gán cho bác
                        sĩ hoặc đang có lịch hẹn liên quan.
                    </p>
                </div>
            ),
            okText: 'Xóa chuyên khoa',
            cancelText: 'Đóng',
            okButtonProps: {
                danger: true,
            },
            onOk: async () => {
                try {
                    await deleteAdminSpecialty(specialty.id);

                    message.success('Đã xóa chuyên khoa.');
                    await loadSpecialties();
                } catch (err) {
                    message.error(
                        err instanceof Error
                            ? err.message
                            : 'Không thể xóa chuyên khoa. Có thể chuyên khoa đang được sử dụng.',
                    );
                }
            },
        });
    };

    const columns: ColumnsType<AdminSpecialty> = [
        {
            title: 'Chuyên khoa',
            key: 'specialty',
            render: (_, record) => (
                <Space direction="vertical" size={2}>
                    <strong>{record.name}</strong>
                    <span className={styles.mutedText}>{record.code}</span>
                </Space>
            ),
        },
        {
            title: 'Mô tả',
            dataIndex: 'description',
            render: (value) =>
                value ? (
                    <span>{value}</span>
                ) : (
                    <Tag color="orange">Chưa có mô tả</Tag>
                ),
        },
        {
            title: 'Cập nhật',
            dataIndex: 'updatedAt',
            width: 190,
            render: (value, record) =>
                formatDateTime(value || record.createdAt),
        },
        {
            title: 'Thao tác',
            key: 'actions',
            width: 260,
            fixed: 'right',
            render: (_, record) => (
                <Space wrap>
                    <Button
                        size="small"
                        icon={<EyeOutlined />}
                        onClick={() => openDetail(record)}
                    >
                        Chi tiết
                    </Button>

                    <Button
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => openEdit(record)}
                    >
                        Chỉnh sửa
                    </Button>

                    <Button
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => handleDelete(record)}
                    >
                        Xóa
                    </Button>
                </Space>
            ),
        },
    ];

    if (authLoading || !session) {
        return <Skeleton active paragraph={{ rows: 8 }} />;
    }

    return (
        <DashboardFrame
            session={session}
            title="Quản lý chuyên khoa"
            subtitle="Thiết lập danh mục chuyên khoa phục vụ đặt lịch và phân công bác sĩ"
        >
            <RoleGuardState session={session} allow={['ADMIN']}>
                <div className={styles.roleDashboard}>
                    {error && (
                        <Alert
                            type="error"
                            showIcon
                            message="Không thể tải chuyên khoa"
                            description={error}
                        />
                    )}

                    <section className={styles.heroCard}>
                        <div>
                            <span>Danh mục chuyên môn</span>
                            <h2>Quản lý chuyên khoa trong hệ thống phòng khám.</h2>
                            <p>
                                Chuyên khoa được dùng khi gán hồ sơ bác sĩ, hiển
                                thị danh mục đặt lịch và hỗ trợ bệnh nhân chọn
                                đúng nhóm khám phù hợp.
                            </p>
                        </div>

                        <div className={styles.pulseCard}>
                            <strong>{metrics.total}</strong>
                            <span>chuyên khoa đang quản lý</span>
                        </div>
                    </section>

                    <section className={styles.metricGrid}>
                        <Card className={styles.metricCard}>
                            <Statistic
                                title="Tổng chuyên khoa"
                                value={metrics.total}
                                prefix={<AppstoreOutlined />}
                            />
                            <p>Danh mục chuyên khoa trong hệ thống.</p>
                        </Card>

                        <Card className={styles.metricCard}>
                            <Statistic
                                title="Đã có mô tả"
                                value={metrics.withDescription}
                                prefix={<TeamOutlined />}
                            />
                            <p>Chuyên khoa có thông tin mô tả rõ ràng.</p>
                        </Card>

                        <Card className={styles.metricCard}>
                            <Statistic
                                title="Thiếu mô tả"
                                value={metrics.missingDescription}
                                prefix={<EditOutlined />}
                            />
                            <p>Nên bổ sung để bệnh nhân dễ lựa chọn.</p>
                        </Card>

                        <Card className={styles.metricCard}>
                            <Statistic
                                title="Kết quả lọc"
                                value={filteredSpecialties.length}
                                prefix={<SearchOutlined />}
                            />
                            <p>Số chuyên khoa đang hiển thị.</p>
                        </Card>
                    </section>

                    <Card
                        className={styles.detailCard}
                        title="Danh sách chuyên khoa"
                        extra={
                            <Button
                                type="primary"
                                icon={<PlusOutlined />}
                                onClick={openCreate}
                            >
                                Tạo chuyên khoa
                            </Button>
                        }
                    >
                        <div className={styles.toolbar}>
                            <Input
                                allowClear
                                prefix={<SearchOutlined />}
                                placeholder="Tìm theo tên, mã hoặc mô tả"
                                value={keyword}
                                onChange={(event) =>
                                    setKeyword(event.target.value)
                                }
                            />

                            <Button
                                icon={<ReloadOutlined />}
                                onClick={() => {
                                    setKeyword('');
                                    loadSpecialties();
                                }}
                            >
                                Làm mới
                            </Button>
                        </div>

                        <Table
                            rowKey="id"
                            loading={loading}
                            columns={columns}
                            dataSource={filteredSpecialties}
                            pagination={{
                                pageSize: 10,
                                showSizeChanger: false,
                            }}
                            scroll={{ x: 920 }}
                        />
                    </Card>
                </div>

                <Drawer
                    title="Chi tiết chuyên khoa"
                    open={openDetailDrawer}
                    width={560}
                    onClose={() => setOpenDetailDrawer(false)}
                    extra={
                        selectedSpecialty && (
                            <Button
                                type="primary"
                                icon={<EditOutlined />}
                                onClick={() => openEdit(selectedSpecialty)}
                            >
                                Chỉnh sửa
                            </Button>
                        )
                    }
                >
                    {selectedSpecialty && (
                        <Descriptions
                            bordered
                            column={1}
                            size="small"
                            title="Thông tin chuyên khoa"
                        >
                            <Descriptions.Item label="Tên chuyên khoa">
                                {selectedSpecialty.name}
                            </Descriptions.Item>

                            <Descriptions.Item label="Mã chuyên khoa">
                                <Tag color="cyan">{selectedSpecialty.code}</Tag>
                            </Descriptions.Item>

                            <Descriptions.Item label="Mô tả">
                                {selectedSpecialty.description ||
                                    'Chưa cập nhật'}
                            </Descriptions.Item>

                            <Descriptions.Item label="Ngày tạo">
                                {formatDateTime(selectedSpecialty.createdAt)}
                            </Descriptions.Item>

                            <Descriptions.Item label="Cập nhật gần nhất">
                                {formatDateTime(selectedSpecialty.updatedAt)}
                            </Descriptions.Item>
                        </Descriptions>
                    )}
                </Drawer>

                <Modal
                    title={
                        editingSpecialty
                            ? 'Chỉnh sửa chuyên khoa'
                            : 'Tạo chuyên khoa mới'
                    }
                    open={openFormModal}
                    onCancel={() => {
                        setOpenFormModal(false);
                        setEditingSpecialty(null);
                    }}
                    footer={null}
                    destroyOnClose
                >
                    <Form
                        form={form}
                        layout="vertical"
                        onFinish={handleSubmit}
                        requiredMark={false}
                    >
                        <Form.Item
                            label="Mã chuyên khoa"
                            name="code"
                            rules={[
                                {
                                    required: true,
                                    message: 'Vui lòng nhập mã chuyên khoa.',
                                },
                                {
                                    max: 50,
                                    message: 'Mã chuyên khoa tối đa 50 ký tự.',
                                },
                            ]}
                            extra="Ví dụ: CARDIOLOGY, DERMATOLOGY, PEDIATRICS"
                        >
                            <Input
                                placeholder="VD: CARDIOLOGY"
                                onChange={(event) => {
                                    form.setFieldValue(
                                        'code',
                                        event.target.value.toUpperCase(),
                                    );
                                }}
                            />
                        </Form.Item>

                        <Form.Item
                            label="Tên chuyên khoa"
                            name="name"
                            rules={[
                                {
                                    required: true,
                                    message: 'Vui lòng nhập tên chuyên khoa.',
                                },
                                {
                                    max: 150,
                                    message: 'Tên chuyên khoa tối đa 150 ký tự.',
                                },
                            ]}
                        >
                            <Input placeholder="VD: Tim mạch" />
                        </Form.Item>

                        <Form.Item
                            label="Mô tả"
                            name="description"
                            rules={[
                                {
                                    max: 1000,
                                    message: 'Mô tả tối đa 1000 ký tự.',
                                },
                            ]}
                        >
                            <Input.TextArea
                                rows={4}
                                placeholder="Mô tả ngắn giúp bệnh nhân hiểu chuyên khoa này phù hợp với vấn đề sức khỏe nào..."
                            />
                        </Form.Item>

                        <Button
                            type="primary"
                            htmlType="submit"
                            loading={saving}
                            block
                        >
                            {editingSpecialty
                                ? 'Lưu thay đổi'
                                : 'Tạo chuyên khoa'}
                        </Button>
                    </Form>
                </Modal>
            </RoleGuardState>
        </DashboardFrame>
    );
}