'use client';

import {
    Alert,
    Button,
    Card,
    Checkbox,
    Input,
    List,
    Modal,
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
    getAdminPermissions,
    getAdminRoles,
    updateAdminRolePermissions,
} from '@/services/admin-access.service';
import type {
    AdminPermission,
    AdminRolePermission,
} from '@/types/admin-access';
import styles from '../../dashboard.module.scss';

const protectedAdminPermission = 'ADMIN_PANEL:ACCESS';

function groupPermissions(permissions: AdminPermission[]) {
    return permissions.reduce<Record<string, AdminPermission[]>>(
        (groups, permission) => {
            const groupName = permission.groupName || 'SYSTEM';

            if (!groups[groupName]) {
                groups[groupName] = [];
            }

            groups[groupName].push(permission);

            return groups;
        },
        {},
    );
}

function getGroupLabel(groupName: string) {
    const labels: Record<string, string> = {
        ADMIN_PANEL: 'Quản trị hệ thống',
        APPOINTMENT: 'Lịch hẹn',
        EHR: 'Bệnh án',
        PRESCRIPTION: 'Đơn thuốc',
        INVENTORY: 'Kho thuốc',
        SCHEDULING: 'Lịch làm việc',
        PATIENT_MEDICAL_PROFILE: 'Hồ sơ y tế bệnh nhân',
        NOTIFICATION: 'Thông báo',
        AI: 'AI lâm sàng',
        SYSTEM: 'Hệ thống',
    };

    return labels[groupName] || groupName;
}

function getPermissionMeaning(code: string, description?: string) {
    if (description) return description;

    const action = code.split(':')[1] || '';

    const labels: Record<string, string> = {
        READ_OWN: 'Được xem dữ liệu của chính mình.',
        WRITE_OWN: 'Được tạo hoặc cập nhật dữ liệu của chính mình.',
        READ_ANY: 'Được xem dữ liệu trong phạm vi vận hành.',
        WRITE_ANY: 'Được tạo hoặc cập nhật dữ liệu trong phạm vi vận hành.',
        READ: 'Được xem dữ liệu.',
        WRITE: 'Được tạo hoặc cập nhật dữ liệu.',
        ACCESS: 'Được truy cập khu vực chức năng.',
    };

    return labels[action] || 'Quyền nghiệp vụ trong hệ thống.';
}

function getRoleTone(roleCode: string) {
    if (roleCode === 'ADMIN') return 'red';
    if (roleCode === 'DOCTOR') return 'blue';
    if (roleCode === 'RECEPTIONIST') return 'green';
    if (roleCode === 'PATIENT') return 'purple';

    return 'default';
}

export default function AdminAccessControlPage() {
    const { session, loading: authLoading } = useAuthSession();

    const [roles, setRoles] = useState<AdminRolePermission[]>([]);
    const [permissions, setPermissions] = useState<AdminPermission[]>([]);
    const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
    const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
    const [keyword, setKeyword] = useState('');

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const selectedRole = useMemo(
        () => roles.find((role) => role.id === selectedRoleId) || null,
        [roles, selectedRoleId],
    );

    const filteredPermissions = useMemo(() => {
        const query = keyword.trim().toLowerCase();

        if (!query) return permissions;

        return permissions.filter((permission) => {
            return (
                permission.code.toLowerCase().includes(query) ||
                permission.description?.toLowerCase().includes(query) ||
                permission.groupName?.toLowerCase().includes(query)
            );
        });
    }, [permissions, keyword]);

    const permissionGroups = useMemo(
        () => groupPermissions(filteredPermissions),
        [filteredPermissions],
    );

    const metrics = useMemo(() => {
        return {
            roleCount: roles.length,
            permissionCount: permissions.length,
            groupCount: Object.keys(groupPermissions(permissions)).length,
            selectedCount: selectedCodes.length,
        };
    }, [roles, permissions, selectedCodes]);

    const loadAccessControl = async () => {
        try {
            setLoading(true);
            setError(null);

            const [roleData, permissionData] = await Promise.all([
                getAdminRoles(),
                getAdminPermissions(),
            ]);

            setRoles(roleData || []);
            setPermissions(permissionData || []);

            const firstRole = roleData?.[0];

            if (firstRole) {
                setSelectedRoleId((current) => current || firstRole.id);
                setSelectedCodes(firstRole.permissions.map((item) => item.code));
            }
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Không thể tải dữ liệu phân quyền.',
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

        loadAccessControl();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session]);

    const handleSelectRole = (role: AdminRolePermission) => {
        setSelectedRoleId(role.id);
        setSelectedCodes(role.permissions.map((permission) => permission.code));
    };

    const togglePermission = (permissionCode: string, checked: boolean) => {
        setSelectedCodes((current) => {
            if (checked) {
                return Array.from(new Set([...current, permissionCode]));
            }

            return current.filter((code) => code !== permissionCode);
        });
    };

    const selectGroup = (groupPermissions: AdminPermission[]) => {
        const groupCodes = groupPermissions.map((permission) => permission.code);

        setSelectedCodes((current) =>
            Array.from(new Set([...current, ...groupCodes])),
        );
    };

    const clearGroup = (groupPermissions: AdminPermission[]) => {
        const groupCodes = groupPermissions.map((permission) => permission.code);

        setSelectedCodes((current) =>
            current.filter((code) => !groupCodes.includes(code)),
        );
    };

    const resetSelectedRolePermissions = () => {
        if (!selectedRole) return;

        setSelectedCodes(selectedRole.permissions.map((item) => item.code));
    };

    const handleSave = async () => {
        if (!selectedRole) return;

        if (
            selectedRole.code === 'ADMIN' &&
            !selectedCodes.includes(protectedAdminPermission)
        ) {
            message.error(
                'Role ADMIN bắt buộc phải giữ quyền ADMIN_PANEL:ACCESS để tránh mất quyền quản trị.',
            );
            return;
        }

        Modal.confirm({
            title: 'Cập nhật phân quyền?',
            content:
                'Thay đổi này sẽ ảnh hưởng đến các tài khoản đang thuộc role được chọn. Người dùng có thể cần đăng xuất và đăng nhập lại để giao diện cập nhật quyền mới.',
            okText: 'Cập nhật',
            cancelText: 'Đóng',
            onOk: async () => {
                try {
                    setSaving(true);

                    const updated = await updateAdminRolePermissions(
                        selectedRole.id,
                        {
                            permissionCodes: selectedCodes,
                        },
                    );

                    setRoles((current) =>
                        current.map((role) =>
                            role.id === updated.id ? updated : role,
                        ),
                    );

                    setSelectedCodes(
                        updated.permissions.map((permission) => permission.code),
                    );

                    message.success(
                        `Đã cập nhật quyền cho role ${updated.code}.`,
                    );
                } catch (err) {
                    message.error(
                        err instanceof Error
                            ? err.message
                            : 'Không thể cập nhật phân quyền.',
                    );
                } finally {
                    setSaving(false);
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
            title="Phân quyền động"
            subtitle="Quản lý quyền truy cập theo role và áp dụng trực tiếp cho hệ thống"
        >
            <RoleGuardState session={session} allow={['ADMIN']}>
                <section className={styles.metricGrid}>
                    <Card className={styles.metricCard}>
                        <Statistic title="Role" value={metrics.roleCount} />
                    </Card>

                    <Card className={styles.metricCard}>
                        <Statistic
                            title="Tổng quyền"
                            value={metrics.permissionCount}
                        />
                    </Card>

                    <Card className={styles.metricCard}>
                        <Statistic
                            title="Nhóm quyền"
                            value={metrics.groupCount}
                        />
                    </Card>

                    <Card className={styles.metricCard}>
                        <Statistic
                            title="Đang chọn"
                            value={metrics.selectedCount}
                        />
                    </Card>
                </section>

                {/* <Alert
                    type="warning"
                    showIcon
                    style={{ marginTop: 24 }}
                    message="Lưu ý khi thay đổi quyền"
                    description="Backend sẽ áp dụng quyền theo role. Tuy nhiên frontend đang lưu permissions trong session, vì vậy người dùng đã đăng nhập có thể cần đăng xuất và đăng nhập lại để menu và giao diện cập nhật đầy đủ."
                /> */}

                {error && (
                    <Alert
                        type="error"
                        showIcon
                        message="Không thể tải dữ liệu phân quyền"
                        description={error}
                        style={{ marginTop: 16 }}
                    />
                )}

                <ClinicalPageState loading={loading}>
                    <section
                        className={styles.detailGrid}
                        style={{ marginTop: 24 }}
                    >
                        <Card
                            className={styles.detailCard}
                            title="Role hệ thống"
                        >
                            {roles.length === 0 ? (
                                <ClinicalEmptyState
                                    title="Chưa có role"
                                    description="Hệ thống chưa có role nào để phân quyền."
                                />
                            ) : (
                                <List
                                    dataSource={roles}
                                    renderItem={(role) => {
                                        const active = role.id === selectedRoleId;

                                        return (
                                            <List.Item
                                                className={styles.cleanListItem}
                                                style={{
                                                    cursor: 'pointer',
                                                    borderRadius: 16,
                                                    background: active
                                                        ? 'rgba(25, 182, 164, 0.10)'
                                                        : undefined,
                                                }}
                                                onClick={() =>
                                                    handleSelectRole(role)
                                                }
                                            >
                                                <List.Item.Meta
                                                    title={
                                                        <div
                                                            className={
                                                                styles.listTitle
                                                            }
                                                        >
                                                            <strong>
                                                                {role.name ||
                                                                    role.code}
                                                            </strong>

                                                            <Space wrap>
                                                                <Tag
                                                                    color={getRoleTone(
                                                                        role.code,
                                                                    )}
                                                                >
                                                                    {role.code}
                                                                </Tag>

                                                                <Tag>
                                                                    {
                                                                        role.permissionCount
                                                                    }{' '}
                                                                    quyền
                                                                </Tag>
                                                            </Space>
                                                        </div>
                                                    }
                                                    description={
                                                        role.description ||
                                                        'Role nghiệp vụ trong hệ thống MedVerse.'
                                                    }
                                                />
                                            </List.Item>
                                        );
                                    }}
                                />
                            )}
                        </Card>

                        <Card
                            className={styles.detailCard}
                            title={
                                selectedRole
                                    ? `Cấu hình quyền: ${selectedRole.code}`
                                    : 'Cấu hình quyền'
                            }
                            extra={
                                <Space wrap>
                                    <Button onClick={resetSelectedRolePermissions}>
                                        Khôi phục
                                    </Button>

                                    <Button
                                        type="primary"
                                        loading={saving}
                                        disabled={!selectedRole}
                                        onClick={handleSave}
                                    >
                                        Lưu thay đổi
                                    </Button>
                                </Space>
                            }
                        >
                            {!selectedRole ? (
                                <ClinicalEmptyState
                                    title="Chưa chọn role"
                                    description="Chọn một role ở cột bên trái để bắt đầu cấu hình quyền."
                                />
                            ) : (
                                <>
                                    <div className={styles.panelHeader}>
                                        <div>
                                            <span>Ma trận phân quyền</span>
                                            <h2>{selectedRole.name}</h2>
                                            <p>
                                                Chọn các quyền mà role này được
                                                phép sử dụng trong hệ thống.
                                            </p>
                                        </div>

                                        {/* <Input.Search
                                            allowClear
                                            placeholder="Tìm mã quyền, mô tả, nhóm..."
                                            value={keyword}
                                            onChange={(event) =>
                                                setKeyword(event.target.value)
                                            }
                                            style={{ width: 300 }}
                                        /> */}
                                    </div>

                                    {Object.entries(permissionGroups).map(
                                        ([groupName, groupPermissions]) => (
                                            <Card
                                                key={groupName}
                                                size="small"
                                                title={getGroupLabel(groupName)}
                                                style={{ marginBottom: 16 }}
                                                extra={
                                                    <Space>
                                                        <Button
                                                            size="small"
                                                            onClick={() =>
                                                                selectGroup(
                                                                    groupPermissions,
                                                                )
                                                            }
                                                        >
                                                            Chọn nhóm
                                                        </Button>

                                                        <Button
                                                            size="small"
                                                            onClick={() =>
                                                                clearGroup(
                                                                    groupPermissions,
                                                                )
                                                            }
                                                        >
                                                            Bỏ nhóm
                                                        </Button>
                                                    </Space>
                                                }
                                            >
                                                <div
                                                    style={{
                                                        display: 'grid',
                                                        gap: 12,
                                                    }}
                                                >
                                                    {groupPermissions.map(
                                                        (permission) => {
                                                            const checked =
                                                                selectedCodes.includes(
                                                                    permission.code,
                                                                );

                                                            const locked =
                                                                selectedRole.code ===
                                                                'ADMIN' &&
                                                                permission.code ===
                                                                protectedAdminPermission;

                                                            return (
                                                                <div
                                                                    key={
                                                                        permission.id
                                                                    }
                                                                    style={{
                                                                        padding:
                                                                            '12px 14px',
                                                                        borderRadius: 14,
                                                                        border: checked
                                                                            ? '1px solid rgba(25, 182, 164, 0.55)'
                                                                            : '1px solid rgba(20, 62, 57, 0.10)',
                                                                        background:
                                                                            checked
                                                                                ? 'rgba(25, 182, 164, 0.08)'
                                                                                : '#fff',
                                                                    }}
                                                                >
                                                                    <Checkbox
                                                                        checked={
                                                                            checked
                                                                        }
                                                                        disabled={
                                                                            locked
                                                                        }
                                                                        onChange={(
                                                                            event,
                                                                        ) =>
                                                                            togglePermission(
                                                                                permission.code,
                                                                                event
                                                                                    .target
                                                                                    .checked,
                                                                            )
                                                                        }
                                                                    >
                                                                        <Space
                                                                            direction="vertical"
                                                                            size={2}
                                                                        >
                                                                            <strong>
                                                                                {
                                                                                    permission.code
                                                                                }
                                                                            </strong>

                                                                            <span
                                                                                style={{
                                                                                    color: '#6a7c7a',
                                                                                }}
                                                                            >
                                                                                {getPermissionMeaning(
                                                                                    permission.code,
                                                                                    permission.description,
                                                                                )}
                                                                            </span>
                                                                        </Space>
                                                                    </Checkbox>

                                                                    {locked && (
                                                                        <Tag
                                                                            color="red"
                                                                            style={{
                                                                                marginTop: 8,
                                                                            }}
                                                                        >
                                                                            Quyền bắt buộc
                                                                            của ADMIN
                                                                        </Tag>
                                                                    )}
                                                                </div>
                                                            );
                                                        },
                                                    )}
                                                </div>
                                            </Card>
                                        ),
                                    )}
                                </>
                            )}
                        </Card>
                    </section>
                </ClinicalPageState>
            </RoleGuardState>
        </DashboardFrame>
    );
}