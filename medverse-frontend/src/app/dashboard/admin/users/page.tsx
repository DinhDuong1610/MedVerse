'use client';

import {
    Alert,
    Button,
    Card,
    Drawer,
    Form,
    Input,
    InputNumber,
    List,
    Modal,
    Select,
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
import StatusTag from '../../_components/StatusTag';
import { useAuthSession } from '@/lib/auth/use-auth-session';
import {
    createAdminStaff,
    getAdminUserById,
    getAdminUsers,
    updateAdminUserStatus,
} from '@/services/admin-user.service';
import { getDirectorySpecialties } from '@/services/directory.service';
import type {
    AdminCreateStaffPayload,
    AdminStaffRoleCode,
    AdminUser,
    AdminUserRoleCode,
    AdminUserStatus,
} from '@/types/admin-user';
import type { DirectorySpecialty } from '@/types/clinical';
import styles from '../../dashboard.module.scss';

type CreateStaffFormValues = {
    email: string;
    password: string;
    fullName: string;
    gender?: string;
    phoneNumber?: string;
    address?: string;

    roleCode: AdminStaffRoleCode;

    specialtyId?: string;
    licenseNumber?: string;
    degree?: string;
    experienceYears?: number;
    bio?: string;
};

const roleFilterOptions: Array<{
    value: AdminUserRoleCode;
    label: string;
}> = [
        { value: 'ALL', label: 'Tất cả' },
        { value: 'ADMIN', label: 'ADMIN' },
        { value: 'DOCTOR', label: 'DOCTOR' },
        { value: 'RECEPTIONIST', label: 'RECEPTIONIST' },
        { value: 'PATIENT', label: 'PATIENT' },
    ];

const staffRoleOptions: Array<{
    value: AdminStaffRoleCode;
    label: string;
}> = [
        { value: 'DOCTOR', label: 'Bác sĩ' },
        { value: 'RECEPTIONIST', label: 'Lễ tân' },
    ];

function formatDateTime(value?: string) {
    if (!value) return 'Chưa đăng nhập';

    return new Date(value).toLocaleString('vi-VN');
}

function getPrimaryRole(user: AdminUser) {
    return user.roles?.[0] || 'UNKNOWN';
}

function getStatusActionLabel(status: AdminUserStatus) {
    if (status === 'ACTIVE') {
        return 'Khóa tài khoản';
    }

    if (status === 'LOCKED' || status === 'DISABLED') {
        return 'Kích hoạt lại';
    }

    return 'Kích hoạt';
}

function getNextStatus(status: AdminUserStatus): AdminUserStatus {
    if (status === 'ACTIVE') {
        return 'LOCKED';
    }

    return 'ACTIVE';
}

function normalizePayload(values: CreateStaffFormValues): AdminCreateStaffPayload {
    const payload: AdminCreateStaffPayload = {
        email: values.email.trim(),
        password: values.password,
        fullName: values.fullName.trim(),
        gender: values.gender,
        phoneNumber: values.phoneNumber?.trim() || undefined,
        address: values.address?.trim() || undefined,
        roleCode: values.roleCode,
    };

    if (values.roleCode === 'DOCTOR') {
        payload.specialtyId = values.specialtyId;
        payload.licenseNumber = values.licenseNumber?.trim() || undefined;
        payload.degree = values.degree?.trim() || undefined;
        payload.experienceYears = values.experienceYears;
        payload.bio = values.bio?.trim() || undefined;
    }

    return payload;
}

export default function AdminUsersPage() {
    const { session, loading: authLoading } = useAuthSession();

    const [form] = Form.useForm<CreateStaffFormValues>();
    const roleCodeWatch = Form.useWatch('roleCode', form);

    const [users, setUsers] = useState<AdminUser[]>([]);
    const [specialties, setSpecialties] = useState<DirectorySpecialty[]>([]);
    const [roleCode, setRoleCode] = useState<AdminUserRoleCode>('ALL');

    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [createOpen, setCreateOpen] = useState(false);
    const [detailOpen, setDetailOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);

    const loadUsers = async (nextRole = roleCode) => {
        try {
            setLoading(true);
            setError(null);

            const page = await getAdminUsers({
                roleCode: nextRole,
                size: 100,
            });

            setUsers(page.content || []);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Không thể tải danh sách người dùng.',
            );
        } finally {
            setLoading(false);
        }
    };

    const loadSpecialties = async () => {
        try {
            const data = await getDirectorySpecialties();
            setSpecialties(data);
        } catch {
            setSpecialties([]);
        }
    };

    useEffect(() => {
        if (!session) return;

        if (session.role !== 'ADMIN' && session.primaryRole !== 'ADMIN') {
            setLoading(false);
            return;
        }

        loadUsers();
        loadSpecialties();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session]);

    const metrics = useMemo(() => {
        const active = users.filter((item) => item.status === 'ACTIVE').length;

        const locked = users.filter((item) => item.status === 'LOCKED').length;

        const disabled = users.filter(
            (item) => item.status === 'DISABLED',
        ).length;

        const doctors = users.filter((item) =>
            item.roles?.includes('DOCTOR'),
        ).length;

        const receptionists = users.filter((item) =>
            item.roles?.includes('RECEPTIONIST'),
        ).length;

        return {
            total: users.length,
            active,
            locked,
            disabled,
            doctors,
            receptionists,
        };
    }, [users]);

    const isCurrentSessionUser = (user: AdminUser) => {
        return session?.userId === user.id;
    };

    const handleRoleFilterChange = (value: AdminUserRoleCode) => {
        setRoleCode(value);
        loadUsers(value);
    };

    const handleCreateStaff = async (values: CreateStaffFormValues) => {
        try {
            setCreating(true);

            const created = await createAdminStaff(normalizePayload(values));

            message.success(`Đã tạo tài khoản ${created.email}.`);
            setCreateOpen(false);
            form.resetFields();

            await loadUsers();
        } catch (err) {
            message.error(
                err instanceof Error
                    ? err.message
                    : 'Không thể tạo tài khoản nhân sự.',
            );
        } finally {
            setCreating(false);
        }
    };

    const openUserDetail = async (user: AdminUser) => {
        try {
            setSelectedUser(user);
            setDetailOpen(true);
            setDetailLoading(true);

            const detail = await getAdminUserById(user.id);
            setSelectedUser(detail);
        } catch (err) {
            message.error(
                err instanceof Error
                    ? err.message
                    : 'Không thể tải chi tiết tài khoản.',
            );
        } finally {
            setDetailLoading(false);
        }
    };

    const handleUpdateStatus = async (user: AdminUser) => {
        if (isCurrentSessionUser(user)) {
            message.warning('Bạn không thể tự khóa hoặc đổi trạng thái tài khoản của chính mình.');
            return;
        }

        const nextStatus = getNextStatus(user.status);
        const actionLabel = getStatusActionLabel(user.status);

        Modal.confirm({
            title: `${actionLabel}?`,
            content:
                nextStatus === 'ACTIVE'
                    ? `Tài khoản ${user.email} sẽ được kích hoạt và có thể đăng nhập lại.`
                    : `Tài khoản ${user.email} sẽ bị khóa và không thể đăng nhập.`,
            okText: actionLabel,
            cancelText: 'Đóng',
            okButtonProps: {
                danger: nextStatus !== 'ACTIVE',
            },
            onOk: async () => {
                try {
                    const updated = await updateAdminUserStatus(user.id, {
                        status: nextStatus,
                        reason:
                            nextStatus === 'ACTIVE'
                                ? 'Admin reactivated account from user management page.'
                                : 'Admin locked account from user management page.',
                    });

                    message.success(`Đã cập nhật trạng thái ${updated.email}.`);

                    if (selectedUser?.id === updated.id) {
                        setSelectedUser(updated);
                    }

                    await loadUsers();
                } catch (err) {
                    message.error(
                        err instanceof Error
                            ? err.message
                            : 'Không thể cập nhật trạng thái tài khoản.',
                    );
                }
            },
        });
    };

    const handleDisableUser = async (user: AdminUser) => {
        if (isCurrentSessionUser(user)) {
            message.warning('Bạn không thể tự vô hiệu hóa tài khoản của chính mình.');
            return;
        }

        Modal.confirm({
            title: 'Vô hiệu hóa tài khoản?',
            content: `Tài khoản ${user.email} sẽ chuyển sang DISABLED và không thể đăng nhập.`,
            okText: 'Vô hiệu hóa',
            cancelText: 'Đóng',
            okButtonProps: {
                danger: true,
            },
            onOk: async () => {
                try {
                    const updated = await updateAdminUserStatus(user.id, {
                        status: 'DISABLED',
                        reason:
                            'Admin disabled account from user management page.',
                    });

                    message.success(`Đã vô hiệu hóa ${updated.email}.`);

                    if (selectedUser?.id === updated.id) {
                        setSelectedUser(updated);
                    }

                    await loadUsers();
                } catch (err) {
                    message.error(
                        err instanceof Error
                            ? err.message
                            : 'Không thể vô hiệu hóa tài khoản.',
                    );
                }
            },
        });
    };

    if (authLoading || !session) {
        return <ClinicalPageState loading>Loading</ClinicalPageState>;
    }

    return (
        <DashboardFrame
            session={session}
            title="Quản lý người dùng"
            subtitle="Tạo tài khoản bác sĩ/lễ tân, theo dõi vai trò và quản lý trạng thái tài khoản"
        >
            <RoleGuardState session={session} allow={['ADMIN']}>
                <section className={styles.metricGrid}>
                    <Card className={styles.metricCard}>
                        <Statistic title="Tổng user" value={metrics.total} />
                    </Card>

                    <Card className={styles.metricCard}>
                        <Statistic title="Đang hoạt động" value={metrics.active} />
                    </Card>

                    <Card className={styles.metricCard}>
                        <Statistic title="Đang khóa" value={metrics.locked} />
                    </Card>

                    <Card className={styles.metricCard}>
                        <Statistic title="Vô hiệu hóa" value={metrics.disabled} />
                    </Card>
                </section>

                <Card className={styles.detailCard} style={{ marginTop: 24 }}>
                    <div className={styles.panelHeader}>
                        <div>
                            <span>Admin user management</span>
                            <h2>Danh sách tài khoản</h2>
                            <p>
                                Admin quản lý tài khoản, role, permissions và
                                trạng thái đăng nhập. MVP cho phép tạo mới
                                Doctor hoặc Receptionist.
                            </p>
                        </div>

                        <Space wrap>
                            <Select
                                value={roleCode}
                                options={roleFilterOptions}
                                onChange={handleRoleFilterChange}
                                style={{ width: 180 }}
                            />

                            <Button onClick={() => loadUsers()}>
                                Làm mới
                            </Button>

                            <Button
                                type="primary"
                                onClick={() => {
                                    form.setFieldsValue({
                                        roleCode: 'DOCTOR',
                                    });
                                    setCreateOpen(true);
                                }}
                            >
                                Tạo nhân sự
                            </Button>
                        </Space>
                    </div>

                    {error && (
                        <Alert
                            type="error"
                            showIcon
                            message="Không thể tải danh sách user"
                            description={error}
                            style={{ marginBottom: 16 }}
                        />
                    )}

                    <ClinicalPageState loading={loading}>
                        {users.length === 0 ? (
                            <ClinicalEmptyState
                                title="Chưa có tài khoản"
                                description="Không tìm thấy user nào theo bộ lọc hiện tại."
                            />
                        ) : (
                            <List
                                dataSource={users}
                                renderItem={(user) => (
                                    <List.Item className={styles.cleanListItem}>
                                        <List.Item.Meta
                                            title={
                                                <div className={styles.listTitle}>
                                                    <strong>
                                                        {user.fullName ||
                                                            user.email}
                                                    </strong>

                                                    <Space wrap>
                                                        <StatusTag
                                                            value={user.status}
                                                        />

                                                        {user.roles?.map(
                                                            (role) => (
                                                                <Tag
                                                                    key={role}
                                                                    color="blue"
                                                                >
                                                                    {role}
                                                                </Tag>
                                                            ),
                                                        )}

                                                        {isCurrentSessionUser(
                                                            user,
                                                        ) && (
                                                                <Tag color="cyan">
                                                                    Chính bạn
                                                                </Tag>
                                                            )}
                                                    </Space>
                                                </div>
                                            }
                                            description={
                                                <div>
                                                    <p>
                                                        Email:{' '}
                                                        <b>{user.email}</b>
                                                    </p>

                                                    <p>
                                                        Vai trò chính:{' '}
                                                        <b>
                                                            {getPrimaryRole(user)}
                                                        </b>
                                                    </p>

                                                    <p>
                                                        Số điện thoại:{' '}
                                                        {user.phoneNumber ||
                                                            'Chưa cập nhật'}
                                                    </p>

                                                    <p>
                                                        Đăng nhập lần cuối:{' '}
                                                        {formatDateTime(
                                                            user.lastLoginAt,
                                                        )}
                                                    </p>

                                                    {user.roles?.includes(
                                                        'DOCTOR',
                                                    ) && (
                                                            <p>
                                                                Chuyên khoa:{' '}
                                                                <b>
                                                                    {user.specialtyName ||
                                                                        'Chưa gán'}
                                                                </b>{' '}
                                                                · Kinh nghiệm:{' '}
                                                                <b>
                                                                    {user.experienceYears ||
                                                                        0}
                                                                </b>{' '}
                                                                năm
                                                            </p>
                                                        )}
                                                </div>
                                            }
                                        />

                                        <Space wrap>
                                            <Button
                                                onClick={() =>
                                                    openUserDetail(user)
                                                }
                                            >
                                                Chi tiết
                                            </Button>

                                            <Button
                                                disabled={isCurrentSessionUser(
                                                    user,
                                                )}
                                                onClick={() =>
                                                    handleUpdateStatus(user)
                                                }
                                            >
                                                {getStatusActionLabel(
                                                    user.status,
                                                )}
                                            </Button>

                                            {user.status !== 'DISABLED' && (
                                                <Button
                                                    danger
                                                    disabled={isCurrentSessionUser(
                                                        user,
                                                    )}
                                                    onClick={() =>
                                                        handleDisableUser(user)
                                                    }
                                                >
                                                    Vô hiệu hóa
                                                </Button>
                                            )}
                                        </Space>
                                    </List.Item>
                                )}
                            />
                        )}
                    </ClinicalPageState>
                </Card>

                <Drawer
                    title="Tạo tài khoản nhân sự"
                    open={createOpen}
                    width={560}
                    onClose={() => {
                        setCreateOpen(false);
                        form.resetFields();
                    }}
                    destroyOnClose
                >
                    <Form
                        form={form}
                        layout="vertical"
                        onFinish={handleCreateStaff}
                        initialValues={{
                            roleCode: 'DOCTOR',
                        }}
                    >
                        <Form.Item
                            label="Vai trò"
                            name="roleCode"
                            rules={[
                                {
                                    required: true,
                                    message: 'Chọn vai trò',
                                },
                            ]}
                        >
                            <Select options={staffRoleOptions} />
                        </Form.Item>

                        <Form.Item
                            label="Email"
                            name="email"
                            rules={[
                                {
                                    required: true,
                                    message: 'Nhập email',
                                },
                                {
                                    type: 'email',
                                    message: 'Email không hợp lệ',
                                },
                            ]}
                        >
                            <Input placeholder="doctor.new@medverse.vn" />
                        </Form.Item>

                        <Form.Item
                            label="Mật khẩu"
                            name="password"
                            rules={[
                                {
                                    required: true,
                                    message: 'Nhập mật khẩu',
                                },
                                {
                                    min: 8,
                                    message: 'Mật khẩu tối thiểu 8 ký tự',
                                },
                            ]}
                        >
                            <Input.Password placeholder="Doctor@123456" />
                        </Form.Item>

                        <Form.Item
                            label="Họ tên"
                            name="fullName"
                            rules={[
                                {
                                    required: true,
                                    message: 'Nhập họ tên',
                                },
                            ]}
                        >
                            <Input placeholder="Nguyễn Văn A" />
                        </Form.Item>

                        <Form.Item label="Giới tính" name="gender">
                            <Select
                                allowClear
                                options={[
                                    { value: 'MALE', label: 'Nam' },
                                    { value: 'FEMALE', label: 'Nữ' },
                                    { value: 'OTHER', label: 'Khác' },
                                ]}
                            />
                        </Form.Item>

                        <Form.Item label="Số điện thoại" name="phoneNumber">
                            <Input placeholder="0900000000" />
                        </Form.Item>

                        <Form.Item label="Địa chỉ" name="address">
                            <Input.TextArea rows={2} />
                        </Form.Item>

                        {roleCodeWatch === 'DOCTOR' && (
                            <>
                                <Alert
                                    type="info"
                                    showIcon
                                    message="Thông tin hồ sơ bác sĩ"
                                    description="Các trường này sẽ được lưu vào DoctorProfile để hiển thị ở danh bạ bác sĩ và booking."
                                    style={{ marginBottom: 16 }}
                                />

                                <Form.Item label="Chuyên khoa" name="specialtyId">
                                    <Select
                                        allowClear
                                        showSearch
                                        placeholder="Chọn chuyên khoa"
                                        optionFilterProp="label"
                                        options={specialties.map((item) => ({
                                            value: item.id,
                                            label: item.name,
                                        }))}
                                    />
                                </Form.Item>

                                <Form.Item
                                    label="Số giấy phép"
                                    name="licenseNumber"
                                >
                                    <Input placeholder="VN-DR-001" />
                                </Form.Item>

                                <Form.Item label="Học vị" name="degree">
                                    <Input placeholder="BS.CKI, ThS, TS..." />
                                </Form.Item>

                                <Form.Item
                                    label="Số năm kinh nghiệm"
                                    name="experienceYears"
                                >
                                    <InputNumber
                                        min={0}
                                        style={{ width: '100%' }}
                                    />
                                </Form.Item>

                                <Form.Item label="Giới thiệu" name="bio">
                                    <Input.TextArea rows={4} />
                                </Form.Item>
                            </>
                        )}

                        <Button
                            type="primary"
                            htmlType="submit"
                            loading={creating}
                            block
                        >
                            Tạo tài khoản
                        </Button>
                    </Form>
                </Drawer>

                <Drawer
                    title="Chi tiết tài khoản"
                    open={detailOpen}
                    width={560}
                    onClose={() => {
                        setDetailOpen(false);
                        setSelectedUser(null);
                    }}
                    destroyOnClose
                >
                    <ClinicalPageState loading={detailLoading}>
                        {selectedUser && (
                            <div>
                                <h2>
                                    {selectedUser.fullName ||
                                        selectedUser.email}
                                </h2>

                                <p>
                                    Email: <b>{selectedUser.email}</b>
                                </p>

                                <p>
                                    Trạng thái:{' '}
                                    <StatusTag value={selectedUser.status} />
                                </p>

                                <Space wrap style={{ marginBottom: 16 }}>
                                    <Button
                                        disabled={isCurrentSessionUser(
                                            selectedUser,
                                        )}
                                        onClick={() =>
                                            handleUpdateStatus(selectedUser)
                                        }
                                    >
                                        {getStatusActionLabel(
                                            selectedUser.status,
                                        )}
                                    </Button>

                                    {selectedUser.status !== 'DISABLED' && (
                                        <Button
                                            danger
                                            disabled={isCurrentSessionUser(
                                                selectedUser,
                                            )}
                                            onClick={() =>
                                                handleDisableUser(selectedUser)
                                            }
                                        >
                                            Vô hiệu hóa
                                        </Button>
                                    )}
                                </Space>

                                {isCurrentSessionUser(selectedUser) && (
                                    <Alert
                                        type="info"
                                        showIcon
                                        message="Đây là tài khoản đang đăng nhập"
                                        description="Để tránh tự khóa tài khoản quản trị, hệ thống không cho phép bạn đổi trạng thái tài khoản của chính mình."
                                        style={{ marginBottom: 16 }}
                                    />
                                )}

                                <p>
                                    Đăng nhập cuối:{' '}
                                    {formatDateTime(selectedUser.lastLoginAt)}
                                </p>

                                <h3>Vai trò</h3>
                                <Space wrap>
                                    {selectedUser.roles?.map((role) => (
                                        <Tag key={role} color="blue">
                                            {role}
                                        </Tag>
                                    ))}
                                </Space>

                                <h3 style={{ marginTop: 20 }}>
                                    Thông tin cá nhân
                                </h3>

                                <p>
                                    SĐT:{' '}
                                    {selectedUser.phoneNumber ||
                                        'Chưa cập nhật'}
                                </p>

                                <p>
                                    Giới tính:{' '}
                                    {selectedUser.gender || 'Chưa cập nhật'}
                                </p>

                                <p>
                                    Địa chỉ:{' '}
                                    {selectedUser.address || 'Chưa cập nhật'}
                                </p>

                                {selectedUser.roles?.includes('DOCTOR') && (
                                    <>
                                        <h3 style={{ marginTop: 20 }}>
                                            Hồ sơ bác sĩ
                                        </h3>

                                        <p>
                                            Chuyên khoa:{' '}
                                            <b>
                                                {selectedUser.specialtyName ||
                                                    'Chưa gán'}
                                            </b>
                                        </p>

                                        <p>
                                            Giấy phép:{' '}
                                            {selectedUser.licenseNumber ||
                                                'Chưa cập nhật'}
                                        </p>

                                        <p>
                                            Học vị:{' '}
                                            {selectedUser.degree ||
                                                'Chưa cập nhật'}
                                        </p>

                                        <p>
                                            Kinh nghiệm:{' '}
                                            {selectedUser.experienceYears || 0}{' '}
                                            năm
                                        </p>

                                        <p>
                                            Giới thiệu:{' '}
                                            {selectedUser.bio ||
                                                'Chưa cập nhật'}
                                        </p>
                                    </>
                                )}

                                <h3 style={{ marginTop: 20 }}>Permissions</h3>

                                <Space wrap>
                                    {selectedUser.permissions?.map(
                                        (permission) => (
                                            <Tag key={permission}>
                                                {permission}
                                            </Tag>
                                        ),
                                    )}
                                </Space>
                            </div>
                        )}
                    </ClinicalPageState>
                </Drawer>
            </RoleGuardState>
        </DashboardFrame>
    );
}