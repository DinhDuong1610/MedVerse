'use client';

import {
    CheckCircleOutlined,
    EditOutlined,
    EyeOutlined,
    MedicineBoxOutlined,
    ReloadOutlined,
    SearchOutlined,
    StopOutlined,
    TeamOutlined,
    WarningOutlined,
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
import {
    getAdminUsers,
    updateAdminDoctorProfile,
    updateAdminUserStatus,
} from '@/services/admin-user.service';
import { getAdminSpecialties } from '@/services/admin-specialty.service';
import type {
    AdminUpdateDoctorProfilePayload,
    AdminUser,
    AdminUserFilter,
} from '@/types/admin-user';
import type { AdminSpecialty } from '@/types/admin-specialty';
import styles from '../../dashboard.module.scss';

type DoctorProfileValues = {
    specialtyId?: string;
    licenseNumber?: string;
    degree?: string;
    experienceYears?: number;
    bio?: string;
};

type SpecialtyResponseLike =
    | AdminSpecialty[]
    | {
        content?: AdminSpecialty[];
        data?:
        | AdminSpecialty[]
        | {
            content?: AdminSpecialty[];
        };
    }
    | null
    | undefined;

function extractSpecialtyList(response: SpecialtyResponseLike): AdminSpecialty[] {
    if (Array.isArray(response)) {
        return response;
    }

    if (!response || typeof response !== 'object') {
        return [];
    }

    if (Array.isArray(response.content)) {
        return response.content;
    }

    if (Array.isArray(response.data)) {
        return response.data;
    }

    if (
        response.data &&
        typeof response.data === 'object' &&
        Array.isArray(response.data.content)
    ) {
        return response.data.content;
    }

    return [];
}

function normalizeRoleCode(role?: string | null) {
    return String(role || '')
        .replace(/^ROLE_/i, '')
        .trim()
        .toUpperCase();
}

function getRoleCodes(user: AdminUser) {
    const roles = user.roles || [];

    const roleCodes = roles
        .map((role) => normalizeRoleCode(role.code))
        .filter(Boolean);

    const primaryRole = normalizeRoleCode(user.primaryRole);

    return Array.from(
        new Set([
            ...roleCodes,
            ...(primaryRole ? [primaryRole] : []),
        ]),
    );
}

function isDoctorUser(user: AdminUser) {
    return getRoleCodes(user).includes('DOCTOR');
}

function formatDateTime(value?: string) {
    if (!value) return 'Chưa ghi nhận';

    return new Date(value).toLocaleString('vi-VN');
}

function getDoctorName(doctor: AdminUser) {
    return doctor.fullName || doctor.email;
}

function hasMissingProfile(doctor: AdminUser) {
    return !doctor.specialtyName || !doctor.licenseNumber;
}

export default function AdminDoctorsPage() {
    const { session, loading: authLoading } = useAuthSession();

    const [doctors, setDoctors] = useState<AdminUser[]>([]);
    const [specialties, setSpecialties] = useState<AdminSpecialty[]>([]);

    const [filter, setFilter] = useState<AdminUserFilter>({
        page: 0,
        size: 100,
        role: 'DOCTOR',
        status: 'ALL',
        keyword: '',
        specialtyId: 'ALL',
    });

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [selectedDoctor, setSelectedDoctor] = useState<AdminUser | null>(null);
    const [openDetailDrawer, setOpenDetailDrawer] = useState(false);
    const [openEditModal, setOpenEditModal] = useState(false);

    const [form] = Form.useForm<DoctorProfileValues>();

    const loadData = async (nextFilter = filter) => {
        try {
            setLoading(true);
            setError(null);

            const [doctorPage, specialtyResponse] = await Promise.all([
                getAdminUsers({
                    ...nextFilter,
                    role: 'DOCTOR',
                    size: nextFilter.size || 100,
                }),
                getAdminSpecialties(),
            ]);

            const specialtyList = extractSpecialtyList(
                specialtyResponse as SpecialtyResponseLike,
            );

            /**
             * Không tin hoàn toàn vào backend filter role=DOCTOR.
             * Nếu backend chưa lọc đúng, frontend vẫn chỉ giữ tài khoản có role DOCTOR.
             */
            const doctorList = (doctorPage.content || []).filter(isDoctorUser);

            setDoctors(doctorList);
            setSpecialties(specialtyList);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Không thể tải danh sách bác sĩ.',
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!session) return;

        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session]);

    const specialtyOptions = useMemo(
        () =>
            specialties.map((specialty) => ({
                label: `${specialty.name}${specialty.code ? ` (${specialty.code})` : ''
                    }`,
                value: specialty.id,
            })),
        [specialties],
    );

    const filteredDoctors = useMemo(() => {
        const keyword = filter.keyword?.trim().toLowerCase() || '';
        const specialtyId = filter.specialtyId;

        return doctors.filter((doctor) => {
            const matchKeyword =
                !keyword ||
                doctor.email.toLowerCase().includes(keyword) ||
                doctor.fullName?.toLowerCase().includes(keyword) ||
                doctor.licenseNumber?.toLowerCase().includes(keyword) ||
                doctor.specialtyName?.toLowerCase().includes(keyword);

            const matchSpecialty =
                !specialtyId ||
                specialtyId === 'ALL' ||
                doctor.specialtyId === specialtyId;

            return matchKeyword && matchSpecialty;
        });
    }, [doctors, filter.keyword, filter.specialtyId]);

    const metrics = useMemo(() => {
        const active = doctors.filter((item) => item.status === 'ACTIVE').length;
        const missingSpecialty = doctors.filter(
            (item) => !item.specialtyName && !item.specialtyId,
        ).length;
        const missingLicense = doctors.filter(
            (item) => !item.licenseNumber,
        ).length;

        return {
            total: doctors.length,
            active,
            missingSpecialty,
            missingLicense,
        };
    }, [doctors]);

    const openDetail = (doctor: AdminUser) => {
        setSelectedDoctor(doctor);
        setOpenDetailDrawer(true);
    };

    const openEdit = (doctor: AdminUser) => {
        setSelectedDoctor(doctor);

        form.setFieldsValue({
            specialtyId: doctor.specialtyId,
            licenseNumber: doctor.licenseNumber,
            degree: doctor.degree,
            experienceYears: doctor.experienceYears,
            bio: doctor.bio,
        });

        setOpenEditModal(true);
    };

    const handleUpdateDoctorProfile = async (values: DoctorProfileValues) => {
        if (!selectedDoctor) return;

        try {
            setSaving(true);

            const payload: AdminUpdateDoctorProfilePayload = {
                specialtyId: values.specialtyId || undefined,
                licenseNumber: values.licenseNumber?.trim() || undefined,
                degree: values.degree?.trim() || undefined,
                experienceYears: values.experienceYears,
                bio: values.bio?.trim() || undefined,
            };

            await updateAdminDoctorProfile(selectedDoctor.id, payload);

            message.success('Đã cập nhật hồ sơ bác sĩ.');
            setOpenEditModal(false);
            setSelectedDoctor(null);
            await loadData();
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

    const handleToggleStatus = async (doctor: AdminUser) => {
        const nextStatus = doctor.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';

        Modal.confirm({
            title:
                nextStatus === 'DISABLED'
                    ? 'Vô hiệu hóa tài khoản bác sĩ?'
                    : 'Kích hoạt tài khoản bác sĩ?',
            content:
                nextStatus === 'DISABLED'
                    ? `Bác sĩ ${getDoctorName(
                        doctor,
                    )} sẽ không thể đăng nhập cho đến khi được kích hoạt lại.`
                    : `Bác sĩ ${getDoctorName(
                        doctor,
                    )} sẽ được phép đăng nhập lại hệ thống.`,
            okText: nextStatus === 'DISABLED' ? 'Vô hiệu hóa' : 'Kích hoạt',
            cancelText: 'Đóng',
            okButtonProps: {
                danger: nextStatus === 'DISABLED',
            },
            onOk: async () => {
                try {
                    await updateAdminUserStatus(doctor.id, {
                        status: nextStatus,
                    });

                    message.success('Đã cập nhật trạng thái tài khoản bác sĩ.');
                    await loadData();
                } catch (err) {
                    message.error(
                        err instanceof Error
                            ? err.message
                            : 'Không thể cập nhật trạng thái bác sĩ.',
                    );
                }
            },
        });
    };

    const handleReset = () => {
        const nextFilter: AdminUserFilter = {
            page: 0,
            size: 100,
            role: 'DOCTOR',
            status: 'ALL',
            keyword: '',
            specialtyId: 'ALL',
        };

        setFilter(nextFilter);
    };

    const columns: ColumnsType<AdminUser> = [
        {
            title: 'Bác sĩ',
            key: 'doctor',
            render: (_, record) => (
                <Space direction="vertical" size={2}>
                    <strong>{getDoctorName(record)}</strong>
                    <span className={styles.mutedText}>{record.email}</span>
                </Space>
            ),
        },
        {
            title: 'Chuyên khoa',
            key: 'specialty',
            render: (_, record) =>
                record.specialtyName ? (
                    <Tag color="cyan">{record.specialtyName}</Tag>
                ) : (
                    <Tag color="orange">Chưa gán chuyên khoa</Tag>
                ),
        },
        {
            title: 'Giấy phép',
            dataIndex: 'licenseNumber',
            render: (value) =>
                value ? (
                    <span>{value}</span>
                ) : (
                    <Tag color="orange">Thiếu giấy phép</Tag>
                ),
        },
        {
            title: 'Kinh nghiệm',
            dataIndex: 'experienceYears',
            width: 130,
            render: (value) =>
                value != null ? `${value} năm` : 'Chưa cập nhật',
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            width: 150,
            render: (status) => <StatusTag value={status} />,
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
                        type={hasMissingProfile(record) ? 'primary' : 'default'}
                        icon={<EditOutlined />}
                        onClick={() => openEdit(record)}
                    >
                        Chỉnh sửa
                    </Button>

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
            title="Quản lý bác sĩ"
            subtitle="Theo dõi hồ sơ chuyên môn, chuyên khoa và trạng thái tài khoản bác sĩ"
        >
            <RoleGuardState session={session} allow={['ADMIN']}>
                <div className={styles.roleDashboard}>
                    {error && (
                        <Alert
                            type="error"
                            showIcon
                            message="Không thể tải danh sách bác sĩ"
                            description={error}
                        />
                    )}

                    <section className={styles.heroCard}>
                        <div>
                            <span>Hồ sơ nhân sự y tế</span>
                            <h2>Quản lý thông tin chuyên môn của đội ngũ bác sĩ.</h2>
                            <p>
                                Theo dõi chuyên khoa, mã giấy phép, kinh nghiệm
                                và trạng thái tài khoản để đảm bảo dữ liệu bác sĩ
                                đầy đủ trước khi hiển thị trong luồng đặt lịch.
                            </p>
                        </div>

                        <div className={styles.pulseCard}>
                            <strong>{metrics.active}</strong>
                            <span>bác sĩ đang hoạt động</span>
                        </div>
                    </section>

                    <section className={styles.metricGrid}>
                        <Card className={styles.metricCard}>
                            <Statistic
                                title="Tổng bác sĩ"
                                value={metrics.total}
                                prefix={<TeamOutlined />}
                            />
                            <p>Bác sĩ trong hệ thống.</p>
                        </Card>

                        <Card className={styles.metricCard}>
                            <Statistic
                                title="Đang hoạt động"
                                value={metrics.active}
                                prefix={<CheckCircleOutlined />}
                            />
                            <p>Có thể đăng nhập và nhận lịch khám.</p>
                        </Card>

                        <Card className={styles.metricCard}>
                            <Statistic
                                title="Thiếu chuyên khoa"
                                value={metrics.missingSpecialty}
                                prefix={<MedicineBoxOutlined />}
                            />
                            <p>Cần gán chuyên khoa để đặt lịch chính xác.</p>
                        </Card>

                        <Card className={styles.metricCard}>
                            <Statistic
                                title="Thiếu giấy phép"
                                value={metrics.missingLicense}
                                prefix={<WarningOutlined />}
                            />
                            <p>Cần bổ sung thông tin hành nghề.</p>
                        </Card>
                    </section>

                    <Card className={styles.detailCard} title="Danh sách bác sĩ">
                        <div className={styles.toolbar}>
                            <Input
                                allowClear
                                prefix={<SearchOutlined />}
                                placeholder="Tìm theo tên, email, chuyên khoa, giấy phép"
                                value={filter.keyword}
                                onChange={(event) =>
                                    setFilter((current) => ({
                                        ...current,
                                        keyword: event.target.value,
                                    }))
                                }
                            />

                            <Select
                                value={filter.specialtyId || 'ALL'}
                                style={{ minWidth: 240 }}
                                options={[
                                    {
                                        label: 'Tất cả chuyên khoa',
                                        value: 'ALL',
                                    },
                                    ...specialtyOptions,
                                ]}
                                onChange={(value) =>
                                    setFilter((current) => ({
                                        ...current,
                                        specialtyId: value,
                                    }))
                                }
                            />

                            <Button icon={<ReloadOutlined />} onClick={handleReset}>
                                Đặt lại
                            </Button>
                        </div>

                        <Table
                            rowKey="id"
                            loading={loading}
                            columns={columns}
                            dataSource={filteredDoctors}
                            pagination={{
                                pageSize: 10,
                                showSizeChanger: false,
                            }}
                            scroll={{ x: 1180 }}
                        />
                    </Card>
                </div>

                <Drawer
                    title="Chi tiết hồ sơ bác sĩ"
                    open={openDetailDrawer}
                    width={640}
                    onClose={() => setOpenDetailDrawer(false)}
                    extra={
                        selectedDoctor && (
                            <Button
                                type="primary"
                                icon={<EditOutlined />}
                                onClick={() => openEdit(selectedDoctor)}
                            >
                                Chỉnh sửa
                            </Button>
                        )
                    }
                >
                    {selectedDoctor && (
                        <Space
                            direction="vertical"
                            size={20}
                            style={{ width: '100%' }}
                        >
                            <Descriptions
                                bordered
                                column={1}
                                size="small"
                                title="Thông tin tài khoản"
                            >
                                <Descriptions.Item label="Họ tên">
                                    {selectedDoctor.fullName || 'Chưa cập nhật'}
                                </Descriptions.Item>

                                <Descriptions.Item label="Email">
                                    {selectedDoctor.email}
                                </Descriptions.Item>

                                <Descriptions.Item label="Số điện thoại">
                                    {selectedDoctor.phoneNumber || 'Chưa cập nhật'}
                                </Descriptions.Item>

                                <Descriptions.Item label="Địa chỉ">
                                    {selectedDoctor.address || 'Chưa cập nhật'}
                                </Descriptions.Item>

                                <Descriptions.Item label="Trạng thái">
                                    <StatusTag value={selectedDoctor.status} />
                                </Descriptions.Item>

                                <Descriptions.Item label="Đăng nhập gần nhất">
                                    {formatDateTime(selectedDoctor.lastLoginAt)}
                                </Descriptions.Item>
                            </Descriptions>

                            <Descriptions
                                bordered
                                column={1}
                                size="small"
                                title="Thông tin chuyên môn"
                            >
                                <Descriptions.Item label="Chuyên khoa">
                                    {selectedDoctor.specialtyName ||
                                        'Chưa cập nhật'}
                                </Descriptions.Item>

                                <Descriptions.Item label="Mã giấy phép">
                                    {selectedDoctor.licenseNumber ||
                                        'Chưa cập nhật'}
                                </Descriptions.Item>

                                <Descriptions.Item label="Học vị / chức danh">
                                    {selectedDoctor.degree || 'Chưa cập nhật'}
                                </Descriptions.Item>

                                <Descriptions.Item label="Kinh nghiệm">
                                    {selectedDoctor.experienceYears != null
                                        ? `${selectedDoctor.experienceYears} năm`
                                        : 'Chưa cập nhật'}
                                </Descriptions.Item>

                                <Descriptions.Item label="Giới thiệu">
                                    {selectedDoctor.bio || 'Chưa cập nhật'}
                                </Descriptions.Item>
                            </Descriptions>
                        </Space>
                    )}
                </Drawer>

                <Modal
                    title="Chỉnh sửa hồ sơ bác sĩ"
                    open={openEditModal}
                    onCancel={() => setOpenEditModal(false)}
                    footer={null}
                    destroyOnClose
                >
                    <Form
                        form={form}
                        layout="vertical"
                        onFinish={handleUpdateDoctorProfile}
                        requiredMark={false}
                    >
                        <Form.Item label="Bác sĩ">
                            <Input value={selectedDoctor?.email} disabled />
                        </Form.Item>

                        <Form.Item
                            label="Chuyên khoa"
                            name="specialtyId"
                            rules={[
                                {
                                    required: true,
                                    message: 'Vui lòng chọn chuyên khoa.',
                                },
                            ]}
                        >
                            <Select
                                showSearch
                                allowClear
                                placeholder="Chọn chuyên khoa"
                                options={specialtyOptions}
                                filterOption={(input, option) =>
                                    String(option?.label || '')
                                        .toLowerCase()
                                        .includes(input.toLowerCase())
                                }
                            />
                        </Form.Item>

                        <Form.Item
                            label="Mã giấy phép hành nghề"
                            name="licenseNumber"
                            rules={[
                                {
                                    required: true,
                                    message:
                                        'Vui lòng nhập mã giấy phép hành nghề.',
                                },
                            ]}
                        >
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
                                placeholder="Mô tả ngắn về kinh nghiệm, chuyên môn và định hướng điều trị..."
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