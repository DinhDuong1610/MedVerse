'use client';

import {
    Alert,
    Button,
    Card,
    Form,
    Input,
    List,
    Modal,
    Popconfirm,
    Space,
    Statistic,
    Tag,
    message,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';
import ClinicalEmptyState from '../../_components/ClinicalEmptyState';
import ClinicalPageState from '../../_components/ClinicalPageState';
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

function normalizePayload(values: SpecialtyFormValues): AdminSpecialtyPayload {
    return {
        code: values.code.trim().toUpperCase().replaceAll(' ', '_'),
        name: values.name.trim(),
        description: values.description?.trim() || undefined,
    };
}

function formatDateTime(value?: string) {
    if (!value) return 'Chưa rõ';

    return new Date(value).toLocaleString('vi-VN');
}

export default function AdminSpecialtiesPage() {
    const { session, loading: authLoading } = useAuthSession();

    const [form] = Form.useForm<SpecialtyFormValues>();

    const [specialties, setSpecialties] = useState<AdminSpecialty[]>([]);
    const [keyword, setKeyword] = useState('');

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [modalOpen, setModalOpen] = useState(false);
    const [editingSpecialty, setEditingSpecialty] =
        useState<AdminSpecialty | null>(null);

    const loadSpecialties = async () => {
        try {
            setLoading(true);
            setError(null);

            const page = await getAdminSpecialties(100);
            setSpecialties(page.content || []);
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

        if (session.role !== 'ADMIN' && session.primaryRole !== 'ADMIN') {
            setLoading(false);
            return;
        }

        loadSpecialties();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session]);

    const filteredSpecialties = useMemo(() => {
        const query = keyword.trim().toLowerCase();

        if (!query) return specialties;

        return specialties.filter((item) => {
            return (
                item.code.toLowerCase().includes(query) ||
                item.name.toLowerCase().includes(query) ||
                item.description?.toLowerCase().includes(query)
            );
        });
    }, [specialties, keyword]);

    const metrics = useMemo(() => {
        const withDescription = specialties.filter((item) =>
            item.description?.trim(),
        ).length;

        return {
            total: specialties.length,
            withDescription,
            missingDescription: specialties.length - withDescription,
        };
    }, [specialties]);

    const openCreateModal = () => {
        setEditingSpecialty(null);
        form.resetFields();
        setModalOpen(true);
    };

    const openEditModal = (specialty: AdminSpecialty) => {
        setEditingSpecialty(specialty);

        form.setFieldsValue({
            code: specialty.code,
            name: specialty.name,
            description: specialty.description || '',
        });

        setModalOpen(true);
    };

    const handleSubmit = async (values: SpecialtyFormValues) => {
        try {
            setSaving(true);

            const payload = normalizePayload(values);

            if (editingSpecialty) {
                await updateAdminSpecialty(editingSpecialty.id, payload);
                message.success('Đã cập nhật chuyên khoa.');
            } else {
                await createAdminSpecialty(payload);
                message.success('Đã tạo chuyên khoa.');
            }

            setModalOpen(false);
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

    const handleDelete = async (specialty: AdminSpecialty) => {
        try {
            setDeletingId(specialty.id);

            await deleteAdminSpecialty(specialty.id);

            message.success('Đã xóa chuyên khoa.');
            await loadSpecialties();
        } catch (err) {
            message.error(
                err instanceof Error
                    ? err.message
                    : 'Không thể xóa chuyên khoa.',
            );
        } finally {
            setDeletingId(null);
        }
    };

    if (authLoading || !session) {
        return <ClinicalPageState loading>Loading</ClinicalPageState>;
    }

    return (
        <DashboardFrame
            session={session}
            title="Quản lý chuyên khoa"
            subtitle="Tạo, cập nhật và quản trị danh mục chuyên khoa dùng cho booking"
        >
            <RoleGuardState session={session} allow={['ADMIN']}>
                <section className={styles.metricGrid}>
                    <Card className={styles.metricCard}>
                        <Statistic
                            title="Tổng chuyên khoa"
                            value={metrics.total}
                        />
                    </Card>

                    <Card className={styles.metricCard}>
                        <Statistic
                            title="Có mô tả"
                            value={metrics.withDescription}
                        />
                    </Card>

                    <Card className={styles.metricCard}>
                        <Statistic
                            title="Thiếu mô tả"
                            value={metrics.missingDescription}
                        />
                    </Card>
                </section>

                <Card className={styles.detailCard} style={{ marginTop: 24 }}>
                    <div className={styles.panelHeader}>
                        <div>
                            <span>Specialty management</span>
                            <h2>Danh mục chuyên khoa</h2>
                            <p>
                                Chuyên khoa được dùng ở danh bạ bác sĩ và luồng
                                bệnh nhân đặt lịch khám.
                            </p>
                        </div>

                        <Space wrap>
                            <Input.Search
                                allowClear
                                placeholder="Tìm code, tên, mô tả..."
                                value={keyword}
                                onChange={(event) =>
                                    setKeyword(event.target.value)
                                }
                                style={{ width: 260 }}
                            />

                            <Button onClick={loadSpecialties}>
                                Làm mới
                            </Button>

                            <Button type="primary" onClick={openCreateModal}>
                                Tạo chuyên khoa
                            </Button>
                        </Space>
                    </div>

                    {error && (
                        <Alert
                            type="error"
                            showIcon
                            message="Không thể tải chuyên khoa"
                            description={error}
                            style={{ marginBottom: 16 }}
                        />
                    )}

                    <ClinicalPageState loading={loading}>
                        {filteredSpecialties.length === 0 ? (
                            <ClinicalEmptyState
                                title="Chưa có chuyên khoa"
                                description="Không tìm thấy chuyên khoa nào theo bộ lọc hiện tại."
                            />
                        ) : (
                            <List
                                dataSource={filteredSpecialties}
                                renderItem={(specialty) => (
                                    <List.Item className={styles.cleanListItem}>
                                        <List.Item.Meta
                                            title={
                                                <div className={styles.listTitle}>
                                                    <strong>
                                                        {specialty.name}
                                                    </strong>

                                                    <Space wrap>
                                                        <Tag color="blue">
                                                            {specialty.code}
                                                        </Tag>
                                                    </Space>
                                                </div>
                                            }
                                            description={
                                                <div>
                                                    <p>
                                                        {specialty.description ||
                                                            'Chưa có mô tả.'}
                                                    </p>

                                                    <p>
                                                        Cập nhật lần cuối:{' '}
                                                        <b>
                                                            {formatDateTime(
                                                                specialty.updatedAt,
                                                            )}
                                                        </b>
                                                    </p>
                                                </div>
                                            }
                                        />

                                        <Space wrap>
                                            <Button
                                                onClick={() =>
                                                    openEditModal(specialty)
                                                }
                                            >
                                                Sửa
                                            </Button>

                                            <Popconfirm
                                                title="Xóa chuyên khoa?"
                                                description="Chuyên khoa sẽ bị xóa mềm. Nếu đã gắn với bác sĩ, bạn nên cân nhắc trước khi xóa."
                                                okText="Xóa"
                                                cancelText="Đóng"
                                                okButtonProps={{
                                                    danger: true,
                                                }}
                                                onConfirm={() =>
                                                    handleDelete(specialty)
                                                }
                                            >
                                                <Button
                                                    danger
                                                    loading={
                                                        deletingId ===
                                                        specialty.id
                                                    }
                                                >
                                                    Xóa
                                                </Button>
                                            </Popconfirm>
                                        </Space>
                                    </List.Item>
                                )}
                            />
                        )}
                    </ClinicalPageState>
                </Card>

                <Modal
                    title={
                        editingSpecialty
                            ? 'Cập nhật chuyên khoa'
                            : 'Tạo chuyên khoa'
                    }
                    open={modalOpen}
                    onCancel={() => {
                        setModalOpen(false);
                        setEditingSpecialty(null);
                        form.resetFields();
                    }}
                    footer={null}
                    destroyOnClose
                >
                    <Form form={form} layout="vertical" onFinish={handleSubmit}>
                        <Form.Item
                            label="Mã chuyên khoa"
                            name="code"
                            rules={[
                                {
                                    required: true,
                                    message: 'Nhập mã chuyên khoa',
                                },
                            ]}
                            extra="Ví dụ: CARDIOLOGY, DERMATOLOGY. Hệ thống sẽ tự chuyển thành chữ hoa."
                        >
                            <Input placeholder="CARDIOLOGY" />
                        </Form.Item>

                        <Form.Item
                            label="Tên chuyên khoa"
                            name="name"
                            rules={[
                                {
                                    required: true,
                                    message: 'Nhập tên chuyên khoa',
                                },
                            ]}
                        >
                            <Input placeholder="Tim mạch" />
                        </Form.Item>

                        <Form.Item label="Mô tả" name="description">
                            <Input.TextArea
                                rows={4}
                                placeholder="Khám và điều trị bệnh lý tim mạch..."
                            />
                        </Form.Item>

                        <Button
                            type="primary"
                            htmlType="submit"
                            loading={saving}
                            block
                        >
                            {editingSpecialty ? 'Lưu thay đổi' : 'Tạo mới'}
                        </Button>
                    </Form>
                </Modal>
            </RoleGuardState>
        </DashboardFrame>
    );
}