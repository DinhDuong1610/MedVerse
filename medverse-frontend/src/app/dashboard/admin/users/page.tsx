'use client';

import {
    CheckCircleOutlined,
    EditOutlined,
    EyeOutlined,
    LockOutlined,
    PlusOutlined,
    ReloadOutlined,
    SearchOutlined,
    StopOutlined,
    TeamOutlined,
    UserOutlined,
} from '@ant-design/icons';
import {
    Alert,
    Button,
    Card,
    Descriptions,
    Drawer,
    Form,
    Input,
    InputNumber,
    Modal,
    Select,
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
import StatusTag from '../../_components/StatusTag';
import { useAuthSession } from '@/lib/auth/use-auth-session';
import { getRoleLabel } from '@/lib/auth/roles';
import {
    createAdminUser,
    getAdminUsers,
    updateAdminDoctorProfile,
    updateAdminUserRoles,
    updateAdminUserStatus,
} from '@/services/admin-user.service';
import type {
    AdminCreateUserPayload,
    AdminUpdateDoctorProfilePayload,
    AdminUser,
    AdminUserFilter,
} from '@/types/admin-user';
import styles from '../../dashboard.module.scss';

type UserFormValues = {
    email: string;
    password: string;
    fullName: string;
    phoneNumber?: string;
    roleCodes: string[];
};

type RoleEditValues = {
    roleCodes: string[];
};

type DoctorProfileValues = {
    specialtyId?: string;
    licenseNumber?: string;
    degree?: string;
    experienceYears?: number;
    bio?: string;
};

const roleOptions = [
    { label: 'Quản trị viên', value: 'ADMIN' },
    { label: 'Bác sĩ', value: 'DOCTOR' },
    { label: 'Lễ tân', value: 'RECEPTIONIST' },
    { label: 'Bệnh nhân', value: 'PATIENT' },
];

const statusOptions = [
    { label: 'Tất cả trạng thái', value: 'ALL' },
    { label: 'Đang hoạt động', value: 'ACTIVE' },
    { label: 'Chờ kích hoạt', value: 'PENDING_ACTIVATION' },
    { label: 'Đã vô hiệu hóa', value: 'DISABLED' },
];

const roleFilterOptions = [
    { label: 'Tất cả vai trò', value: 'ALL' },
    ...roleOptions,
];

function getPrimaryRole(user: AdminUser) {
    return user.primaryRole || user.roles?.[0]?.code || 'PATIENT';
}

function getRoleCodes(user: AdminUser) {
    if (user.roles?.length) {
        return user.roles.map((role) => role.code);
    }

    return [getPrimaryRole(user)];
}

function formatDateTime(value?: string) {
    if (!value) return 'Chưa ghi nhận';

    return new Date(value).toLocaleString('vi-VN');
}

function getDisplayName(user: AdminUser) {
    return user.fullName || user.email;
}

function isDoctor(user?: AdminUser | null) {
    if (!user) return false;

    return getRoleCodes(user).includes('DOCTOR');
}

export default function AdminUsersPage() {
    const { session, loading: authLoading } = useAuthSession();

    const [users, setUsers] = useState<AdminUser[]>([]);
    const [filter, setFilter] = useState<AdminUserFilter>({
        page: 0,
        size: 20,
        status: 'ALL',
        role: 'ALL',
    });

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

    const [openDetailDrawer, setOpenDetailDrawer] = useState(false);
    const [openCreateModal, setOpenCreateModal] = useState(false);
    const [openRoleModal, setOpenRoleModal] = useState(false);
    const [openDoctorProfileModal, setOpenDoctorProfileModal] = useState(false);

    const [createForm] = Form.useForm<UserFormValues>();
    const [roleForm] = Form.useForm<RoleEditValues>();
    const [doctorProfileForm] = Form.useForm<DoctorProfileValues>();

    const loadUsers = async (nextFilter = filter) => {
        try {
            setLoading(true);
            setError(null);

            const page = await getAdminUsers(nextFilter);

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

    useEffect(() => {
        if (!session) return;

        loadUsers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session]);

    const metrics = useMemo(() => {
        const active = users.filter((item) => item.status === 'ACTIVE').length;
        const pending = users.filter(
            (item) => item.status === 'PENDING_ACTIVATION',
        ).length;
        const disabled = users.filter((item) => item.status === 'DISABLED').length;
        const staff = users.filter((item) =>
            ['ADMIN', 'DOCTOR', 'RECEPTIONIST'].includes(getPrimaryRole(item)),
        ).length;

        return {
            total: users.length,
            active,
            pending,
            disabled,
            staff,
        };
    }, [users]);

    const handleSearch = () => {
        const nextFilter = {
            ...filter,
            page: 0,
        };

        setFilter(nextFilter);
        loadUsers(nextFilter);
    };

    const handleReset = () => {
        const nextFilter: AdminUserFilter = {
            page: 0,
            size: 20,
            status: 'ALL',
            role: 'ALL',
            keyword: '',
        };

        setFilter(nextFilter);
        loadUsers(nextFilter);
    };

    const openDetail = (user: AdminUser) => {
        setSelectedUser(user);
        setOpenDetailDrawer(true);
    };

    const openEditRoles = (user: AdminUser) => {
        setSelectedUser(user);
        roleForm.setFieldsValue({
            roleCodes: getRoleCodes(user),
        });
        setOpenRoleModal(true);
    };

    const openEditDoctorProfile = (user: AdminUser) => {
        setSelectedUser(user);
        doctorProfileForm.setFieldsValue({
            specialtyId: user.specialtyId,
            licenseNumber: user.licenseNumber,
            degree: user.degree,
            experienceYears: user.experienceYears,
            bio: user.bio,
        });
        setOpenDoctorProfileModal(true);
    };

    const handleCreateUser = async (values: UserFormValues) => {
        try {
            setSaving(true);

            const payload: AdminCreateUserPayload = {
                email: values.email.trim(),
                password: values.password,
                fullName: values.fullName.trim(),
                phoneNumber: values.phoneNumber?.trim() || undefined,
                roleCodes: values.roleCodes,
            };

            await createAdminUser(payload);

            message.success('Đã tạo tài khoản mới.');
            setOpenCreateModal(false);
            createForm.resetFields();
            await loadUsers();
        } catch (err) {
            message.error(
                err instanceof Error
                    ? err.message
                    : 'Không thể tạo tài khoản.',
            );
        } finally {
            setSaving(false);
        }
    };

    const handleUpdateRoles = async (values: RoleEditValues) => {
        if (!selectedUser) return;

        try {
            setSaving(true);

            await updateAdminUserRoles(selectedUser.id, {
                roleCodes: values.roleCodes,
            });

            message.success('Đã cập nhật vai trò người dùng.');
            setOpenRoleModal(false);
            setSelectedUser(null);
            await loadUsers();
        } catch (err) {
            message.error(
                err instanceof Error
                    ? err.message
                    : 'Không thể cập nhật vai trò.',
            );
        } finally {
            setSaving(false);
        }
    };

    const handleUpdateDoctorProfile = async (values: DoctorProfileValues) => {
        if (!selectedUser) return;

        try {
            setSaving(true);

            const payload: AdminUpdateDoctorProfilePayload = {
                specialtyId: values.specialtyId || undefined,
                licenseNumber: values.licenseNumber?.trim() || undefined,
                degree: values.degree?.trim() || undefined,
                experienceYears: values.experienceYears,
                bio: values.bio?.trim() || undefined,
            };

            await updateAdminDoctorProfile(selectedUser.id, payload);

            message.success('Đã cập nhật hồ sơ bác sĩ.');
            setOpenDoctorProfileModal(false);
            setSelectedUser(null);
            await loadUsers();
        } catch (err) {
            message.error(
                err instanceof Error
                    ? err.message
                    : 'Không thể cập nhật hồ sơ bác sĩ.',
            );
        } finally {
            setSaving(false);
        }
    };

    const handleToggleStatus = async (user: AdminUser) => {
        const nextStatus = user.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';

        Modal.confirm({
            title:
                nextStatus === 'DISABLED'
                    ? 'Vô hiệu hóa tài khoản?'
                    : 'Kích hoạt tài khoản?',
            content:
                nextStatus === 'DISABLED'
                    ? `Tài khoản ${user.email} sẽ không thể đăng nhập cho đến khi được kích hoạt lại.`
                    : `Tài khoản ${user.email} sẽ được phép đăng nhập lại hệ thống.`,
            okText: nextStatus === 'DISABLED' ? 'Vô hiệu hóa' : 'Kích hoạt',
            cancelText: 'Đóng',
            okButtonProps: {
                danger: nextStatus === 'DISABLED',
            },
            onOk: async () => {
                try {
                    await updateAdminUserStatus(user.id, {
                        status: nextStatus,
                    });

                    message.success('Đã cập nhật trạng thái tài khoản.');
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

    const columns: ColumnsType<AdminUser> = [
        {
            title: 'Người dùng',
            key: 'user',
            render: (_, record) => (
                <Space direction="vertical" size={2}>
                    <strong>{getDisplayName(record)}</strong>
                    <span className={styles.mutedText}>{record.email}</span>
                </Space>
            ),
        },
        {
            title: 'Vai trò',
            key: 'role',
            width: 170,
            render: (_, record) => (
                <Space wrap>
                    {getRoleCodes(record).map((role) => (
                        <Tag key={role} color="cyan">
                            {getRoleLabel(role)}
                        </Tag>
                    ))}
                </Space>
            ),
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            width: 160,
            render: (status) => <StatusTag value={status} />,
        },
        {
            title: 'Liên hệ',
            key: 'contact',
            render: (_, record) => (
                <Space direction="vertical" size={2}>
                    <span>{record.phoneNumber || 'Chưa có SĐT'}</span>
                    <span className={styles.mutedText}>
                        {record.address || 'Chưa cập nhật địa chỉ'}
                    </span>
                </Space>
            ),
        },
        {
            title: 'Đăng nhập gần nhất',
            dataIndex: 'lastLoginAt',
            width: 190,
            render: (value) => formatDateTime(value),
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
                        onClick={() => openEditRoles(record)}
                    >
                        Vai trò
                    </Button>

                    {isDoctor(record) && (
                        <Button
                            size="small"
                            icon={<TeamOutlined />}
                            onClick={() => openEditDoctorProfile(record)}
                        >
                            Bác sĩ
                        </Button>
                    )}

                    <Button
                        size="small"
                        danger={record.status === 'ACTIVE'}
                        icon={
                            record.status === 'ACTIVE' ? (
                                <StopOutlined />
                            ) : (
                                <CheckCircleOutlined />
                            )
                        }
                        onClick={() => handleToggleStatus(record)}
                    >
                        {record.status === 'ACTIVE' ? 'Khóa' : 'Mở'}
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
            title="Quản lý người dùng"
            subtitle="Theo dõi tài khoản, vai trò và trạng thái truy cập hệ thống"
        >
            <RoleGuardState session={session} allow={['ADMIN']}>
                <div className={styles.roleDashboard}>
                    {error && (
                        <Alert
                            type="error"
                            showIcon
                            message="Không thể tải người dùng"
                            description={error}
                        />
                    )}

                    <section className={styles.heroCard}>
                        <div>
                            <span>Quản trị tài khoản</span>
                            <h2>Kiểm soát người dùng và quyền truy cập hệ thống.</h2>
                            <p>
                                Trang này giúp quản trị viên theo dõi tài khoản,
                                xem thông tin chi tiết, chỉnh sửa vai trò, cập
                                nhật hồ sơ bác sĩ và xử lý trạng thái truy cập.
                            </p>
                        </div>

                        <div className={styles.pulseCard}>
                            <strong>{metrics.active}</strong>
                            <span>tài khoản đang hoạt động</span>
                        </div>
                    </section>

                    <section className={styles.metricGrid}>
                        <Card className={styles.metricCard}>
                            <Statistic
                                title="Tổng tài khoản"
                                value={metrics.total}
                                prefix={<UserOutlined />}
                            />
                            <p>Tài khoản trong phạm vi quản trị.</p>
                        </Card>

                        <Card className={styles.metricCard}>
                            <Statistic
                                title="Đang hoạt động"
                                value={metrics.active}
                                prefix={<CheckCircleOutlined />}
                            />
                            <p>Có thể đăng nhập và sử dụng hệ thống.</p>
                        </Card>

                        <Card className={styles.metricCard}>
                            <Statistic
                                title="Chờ kích hoạt"
                                value={metrics.pending}
                                prefix={<LockOutlined />}
                            />
                            <p>Đã đăng ký nhưng chưa sẵn sàng sử dụng.</p>
                        </Card>

                        <Card className={styles.metricCard}>
                            <Statistic
                                title="Nhân sự"
                                value={metrics.staff}
                                prefix={<TeamOutlined />}
                            />
                            <p>Admin, bác sĩ và lễ tân.</p>
                        </Card>
                    </section>

                    <Card
                        className={styles.detailCard}
                        title="Danh sách người dùng"
                        extra={
                            <Button
                                type="primary"
                                icon={<PlusOutlined />}
                                onClick={() => setOpenCreateModal(true)}
                            >
                                Tạo tài khoản
                            </Button>
                        }
                    >
                        <div className={styles.toolbar}>
                            <Input
                                allowClear
                                prefix={<SearchOutlined />}
                                placeholder="Tìm theo tên hoặc email"
                                value={filter.keyword}
                                onChange={(event) =>
                                    setFilter((current) => ({
                                        ...current,
                                        keyword: event.target.value,
                                    }))
                                }
                                onPressEnter={handleSearch}
                            />

                            <Select
                                value={filter.role || 'ALL'}
                                options={roleFilterOptions}
                                onChange={(value) =>
                                    setFilter((current) => ({
                                        ...current,
                                        role: value,
                                    }))
                                }
                                style={{ minWidth: 180 }}
                            />

                            <Select
                                value={filter.status || 'ALL'}
                                options={statusOptions}
                                onChange={(value) =>
                                    setFilter((current) => ({
                                        ...current,
                                        status: value,
                                    }))
                                }
                                style={{ minWidth: 190 }}
                            />

                            <Button
                                type="primary"
                                icon={<SearchOutlined />}
                                onClick={handleSearch}
                            >
                                Lọc
                            </Button>

                            <Button
                                icon={<ReloadOutlined />}
                                onClick={handleReset}
                            >
                                Đặt lại
                            </Button>
                        </div>

                        <Table
                            rowKey="id"
                            loading={loading}
                            columns={columns}
                            dataSource={users}
                            pagination={false}
                            scroll={{ x: 1180 }}
                        />
                    </Card>
                </div>

                <Drawer
                    title="Chi tiết người dùng"
                    open={openDetailDrawer}
                    width={620}
                    onClose={() => setOpenDetailDrawer(false)}
                    extra={
                        selectedUser && (
                            <Space>
                                <Button
                                    icon={<EditOutlined />}
                                    onClick={() => openEditRoles(selectedUser)}
                                >
                                    Chỉnh vai trò
                                </Button>

                                {isDoctor(selectedUser) && (
                                    <Button
                                        type="primary"
                                        icon={<TeamOutlined />}
                                        onClick={() =>
                                            openEditDoctorProfile(selectedUser)
                                        }
                                    >
                                        Hồ sơ bác sĩ
                                    </Button>
                                )}
                            </Space>
                        )
                    }
                >
                    {selectedUser && (
                        <Space direction="vertical" size={20} style={{ width: '100%' }}>
                            <Descriptions
                                bordered
                                column={1}
                                size="small"
                                title="Thông tin tài khoản"
                            >
                                <Descriptions.Item label="Họ tên">
                                    {selectedUser.fullName || 'Chưa cập nhật'}
                                </Descriptions.Item>

                                <Descriptions.Item label="Email">
                                    {selectedUser.email}
                                </Descriptions.Item>

                                <Descriptions.Item label="Số điện thoại">
                                    {selectedUser.phoneNumber || 'Chưa cập nhật'}
                                </Descriptions.Item>

                                <Descriptions.Item label="Địa chỉ">
                                    {selectedUser.address || 'Chưa cập nhật'}
                                </Descriptions.Item>

                                <Descriptions.Item label="Trạng thái">
                                    <StatusTag value={selectedUser.status} />
                                </Descriptions.Item>

                                <Descriptions.Item label="Vai trò">
                                    <Space wrap>
                                        {getRoleCodes(selectedUser).map((role) => (
                                            <Tag key={role} color="cyan">
                                                {getRoleLabel(role)}
                                            </Tag>
                                        ))}
                                    </Space>
                                </Descriptions.Item>

                                <Descriptions.Item label="Đăng nhập gần nhất">
                                    {formatDateTime(selectedUser.lastLoginAt)}
                                </Descriptions.Item>
                            </Descriptions>

                            {isDoctor(selectedUser) && (
                                <Descriptions
                                    bordered
                                    column={1}
                                    size="small"
                                    title="Hồ sơ bác sĩ"
                                >
                                    <Descriptions.Item label="Chuyên khoa">
                                        {selectedUser.specialtyName ||
                                            'Chưa cập nhật'}
                                    </Descriptions.Item>

                                    <Descriptions.Item label="Mã giấy phép">
                                        {selectedUser.licenseNumber ||
                                            'Chưa cập nhật'}
                                    </Descriptions.Item>

                                    <Descriptions.Item label="Học vị">
                                        {selectedUser.degree || 'Chưa cập nhật'}
                                    </Descriptions.Item>

                                    <Descriptions.Item label="Kinh nghiệm">
                                        {selectedUser.experienceYears != null
                                            ? `${selectedUser.experienceYears} năm`
                                            : 'Chưa cập nhật'}
                                    </Descriptions.Item>

                                    <Descriptions.Item label="Giới thiệu">
                                        {selectedUser.bio || 'Chưa cập nhật'}
                                    </Descriptions.Item>
                                </Descriptions>
                            )}
                        </Space>
                    )}
                </Drawer>

                <Modal
                    title="Tạo tài khoản mới"
                    open={openCreateModal}
                    onCancel={() => setOpenCreateModal(false)}
                    footer={null}
                    destroyOnClose
                >
                    <Form
                        form={createForm}
                        layout="vertical"
                        onFinish={handleCreateUser}
                        requiredMark={false}
                    >
                        <Form.Item
                            label="Họ và tên"
                            name="fullName"
                            rules={[
                                {
                                    required: true,
                                    message: 'Vui lòng nhập họ và tên.',
                                },
                            ]}
                        >
                            <Input placeholder="Nguyễn Văn A" />
                        </Form.Item>

                        <Form.Item
                            label="Email"
                            name="email"
                            rules={[
                                {
                                    required: true,
                                    message: 'Vui lòng nhập email.',
                                },
                                {
                                    type: 'email',
                                    message: 'Email không hợp lệ.',
                                },
                            ]}
                        >
                            <Input placeholder="name@medverse.vn" />
                        </Form.Item>

                        <Form.Item
                            label="Mật khẩu"
                            name="password"
                            rules={[
                                {
                                    required: true,
                                    message: 'Vui lòng nhập mật khẩu.',
                                },
                                {
                                    min: 8,
                                    message: 'Mật khẩu tối thiểu 8 ký tự.',
                                },
                            ]}
                        >
                            <Input.Password placeholder="Tối thiểu 8 ký tự" />
                        </Form.Item>

                        <Form.Item label="Số điện thoại" name="phoneNumber">
                            <Input placeholder="0987654321" />
                        </Form.Item>

                        <Form.Item
                            label="Vai trò"
                            name="roleCodes"
                            rules={[
                                {
                                    required: true,
                                    message:
                                        'Vui lòng chọn ít nhất một vai trò.',
                                },
                            ]}
                        >
                            <Select
                                mode="multiple"
                                placeholder="Chọn vai trò"
                                options={roleOptions}
                            />
                        </Form.Item>

                        <Button
                            type="primary"
                            htmlType="submit"
                            loading={saving}
                            block
                        >
                            Tạo tài khoản
                        </Button>
                    </Form>
                </Modal>

                <Modal
                    title="Chỉnh sửa vai trò"
                    open={openRoleModal}
                    onCancel={() => setOpenRoleModal(false)}
                    footer={null}
                    destroyOnClose
                >
                    <Form
                        form={roleForm}
                        layout="vertical"
                        onFinish={handleUpdateRoles}
                        requiredMark={false}
                    >
                        <Form.Item
                            label="Người dùng"
                        >
                            <Input
                                value={selectedUser?.email}
                                disabled
                            />
                        </Form.Item>

                        <Form.Item
                            label="Vai trò"
                            name="roleCodes"
                            rules={[
                                {
                                    required: true,
                                    message:
                                        'Vui lòng chọn ít nhất một vai trò.',
                                },
                            ]}
                        >
                            <Select
                                mode="multiple"
                                placeholder="Chọn vai trò"
                                options={roleOptions}
                            />
                        </Form.Item>

                        <Button
                            type="primary"
                            htmlType="submit"
                            loading={saving}
                            block
                        >
                            Lưu vai trò
                        </Button>
                    </Form>
                </Modal>

                <Modal
                    title="Chỉnh sửa hồ sơ bác sĩ"
                    open={openDoctorProfileModal}
                    onCancel={() => setOpenDoctorProfileModal(false)}
                    footer={null}
                    destroyOnClose
                >
                    <Form
                        form={doctorProfileForm}
                        layout="vertical"
                        onFinish={handleUpdateDoctorProfile}
                        requiredMark={false}
                    >
                        <Form.Item label="Người dùng">
                            <Input value={selectedUser?.email} disabled />
                        </Form.Item>

                        <Form.Item
                            label="ID chuyên khoa"
                            name="specialtyId"
                            extra="Nếu đã có trang quản lý chuyên khoa, nhập đúng ID chuyên khoa tương ứng."
                        >
                            <Input placeholder="UUID chuyên khoa" />
                        </Form.Item>

                        <Form.Item label="Mã giấy phép" name="licenseNumber">
                            <Input placeholder="VD: CCHN-000123" />
                        </Form.Item>

                        <Form.Item label="Học vị / chức danh" name="degree">
                            <Input placeholder="VD: Bác sĩ Chuyên khoa I" />
                        </Form.Item>

                        <Form.Item label="Số năm kinh nghiệm" name="experienceYears">
                            <InputNumber min={0} max={60} style={{ width: '100%' }} />
                        </Form.Item>

                        <Form.Item label="Giới thiệu" name="bio">
                            <Input.TextArea
                                rows={4}
                                placeholder="Mô tả ngắn về kinh nghiệm, chuyên môn, định hướng điều trị..."
                            />
                        </Form.Item>

                        <Button
                            type="primary"
                            htmlType="submit"
                            loading={saving}
                            block
                        >
                            Lưu hồ sơ bác sĩ
                        </Button>
                    </Form>
                </Modal>
            </RoleGuardState>
        </DashboardFrame>
    );
}