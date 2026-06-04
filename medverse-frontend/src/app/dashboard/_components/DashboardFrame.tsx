'use client';

import {
    AppstoreOutlined,
    BellOutlined,
    CalendarOutlined,
    FileProtectOutlined,
    HeartOutlined,
    LogoutOutlined,
    MedicineBoxOutlined,
    SafetyCertificateOutlined,
    TeamOutlined,
    UserOutlined,
} from '@ant-design/icons';
import { Button, Space, Tag } from 'antd';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import MedVerseMark from '@/components/brand/MedVerseMark';
import { clearAuthSession } from '@/lib/auth/auth-storage';
import {
    getRoleLabel,
    hasAnyPermission,
    normalizeRoleCode,
} from '@/lib/auth/roles';
import type { AuthSession } from '@/types/auth';
import styles from '../dashboard.module.scss';
import NotificationBadge from './NotificationBadge';

type NavItem = {
    label: string;
    href: string;
    icon: ReactNode;

    /**
     * anyRoles:
     * Bắt buộc dùng để phân menu theo vai trò chính.
     *
     * anyPermissions:
     * Kiểm tra bổ sung trong đúng vai trò đó.
     * Ví dụ: chỉ DOCTOR + có EHR:WRITE thì mới thấy Ca khám.
     */
    anyRoles?: string[];
    anyPermissions?: string[];
};

const COMMON_ROLES = ['ADMIN', 'DOCTOR', 'RECEPTIONIST', 'PATIENT'];

const NAV_ITEMS: NavItem[] = [
    /**
     * Common
     */
    {
        label: 'Tổng quan',
        href: '/dashboard',
        icon: <UserOutlined />,
        anyRoles: COMMON_ROLES,
    },
    {
        label: 'Thông báo',
        href: '/dashboard/notifications',
        icon: <BellOutlined />,
        anyRoles: COMMON_ROLES,
    },

    /**
     * Patient
     */
    {
        label: 'Đặt lịch',
        href: '/dashboard/patient/book-appointment',
        icon: <CalendarOutlined />,
        anyRoles: ['PATIENT'],
        anyPermissions: ['APPOINTMENT:WRITE_OWN'],
    },
    {
        label: 'Yêu cầu đặt lịch',
        href: '/dashboard/patient/appointment-requests',
        icon: <FileProtectOutlined />,
        anyRoles: ['PATIENT'],
        anyPermissions: ['APPOINTMENT:READ_OWN'],
    },
    {
        label: 'Lịch hẹn của tôi',
        href: '/dashboard/patient/appointments',
        icon: <CalendarOutlined />,
        anyRoles: ['PATIENT'],
        anyPermissions: ['APPOINTMENT:READ_OWN'],
    },
    {
        label: 'Hồ sơ y tế',
        href: '/dashboard/patient/profile',
        icon: <HeartOutlined />,
        anyRoles: ['PATIENT'],
        anyPermissions: [
            'PATIENT_MEDICAL_PROFILE:READ_OWN',
            'PATIENT_MEDICAL_PROFILE:WRITE_OWN',
            'ALLERGY:READ_OWN',
            'ALLERGY:WRITE_OWN',
        ],
    },
    {
        label: 'Bệnh án',
        href: '/dashboard/patient/medical-records',
        icon: <FileProtectOutlined />,
        anyRoles: ['PATIENT'],
        anyPermissions: ['EHR:READ_OWN'],
    },
    {
        label: 'Đơn thuốc',
        href: '/dashboard/patient/prescriptions',
        icon: <MedicineBoxOutlined />,
        anyRoles: ['PATIENT'],
        anyPermissions: ['PRESCRIPTION:READ_OWN'],
    },

    /**
     * Doctor
     */
    {
        label: 'Lịch khám',
        href: '/dashboard/doctor/appointments',
        icon: <CalendarOutlined />,
        anyRoles: ['DOCTOR'],
        anyPermissions: ['APPOINTMENT:READ_ANY'],
    },
    {
        label: 'Lịch làm việc',
        href: '/dashboard/doctor/work-slots',
        icon: <CalendarOutlined />,
        anyRoles: ['DOCTOR'],
        anyPermissions: ['SCHEDULING:READ', 'SCHEDULING:WRITE'],
    },
    {
        label: 'Ca khám',
        href: '/dashboard/doctor/cases',
        icon: <FileProtectOutlined />,
        anyRoles: ['DOCTOR'],
        anyPermissions: ['EHR:READ_ANY', 'EHR:WRITE'],
    },
    {
        label: 'Đơn thuốc',
        href: '/dashboard/doctor/prescriptions',
        icon: <MedicineBoxOutlined />,
        anyRoles: ['DOCTOR'],
        anyPermissions: ['PRESCRIPTION:READ_ANY', 'PRESCRIPTION:WRITE'],
    },

    /**
     * Receptionist
     */
    {
        label: 'Yêu cầu đặt lịch',
        href: '/dashboard/receptionist/requests',
        icon: <CalendarOutlined />,
        anyRoles: ['RECEPTIONIST'],
        anyPermissions: ['APPOINTMENT:READ_ANY', 'APPOINTMENT:WRITE_ANY'],
    },
    {
        label: 'Lịch hẹn',
        href: '/dashboard/receptionist/appointments',
        icon: <FileProtectOutlined />,
        anyRoles: ['RECEPTIONIST'],
        anyPermissions: ['APPOINTMENT:READ_ANY'],
    },

    /**
     * Admin
     */
    {
        label: 'Vận hành',
        href: '/dashboard/admin/operations',
        icon: <AppstoreOutlined />,
        anyRoles: ['ADMIN'],
        anyPermissions: ['ADMIN_PANEL:ACCESS'],
    },
    {
        label: 'Phân quyền',
        href: '/dashboard/admin/access-control',
        icon: <SafetyCertificateOutlined />,
        anyRoles: ['ADMIN'],
        anyPermissions: ['RBAC:MANAGE'],
    },
    {
        label: 'Chuyên khoa',
        href: '/dashboard/admin/specialties',
        icon: <MedicineBoxOutlined />,
        anyRoles: ['ADMIN'],
        anyPermissions: ['ADMIN_PANEL:ACCESS'],
    },
    {
        label: 'Bác sĩ',
        href: '/dashboard/admin/doctors',
        icon: <TeamOutlined />,
        anyRoles: ['ADMIN'],
        anyPermissions: ['STAFF:READ', 'STAFF:WRITE'],
    },
    {
        label: 'Người dùng',
        href: '/dashboard/admin/users',
        icon: <UserOutlined />,
        anyRoles: ['ADMIN'],
        anyPermissions: ['STAFF:READ', 'STAFF:WRITE'],
    },
    {
        label: 'Kho thuốc',
        href: '/dashboard/admin/inventory',
        icon: <MedicineBoxOutlined />,
        anyRoles: ['ADMIN'],
        anyPermissions: ['INVENTORY:READ', 'INVENTORY:WRITE'],
    },
    {
        label: 'Nhập kho',
        href: '/dashboard/admin/inventory/import',
        icon: <FileProtectOutlined />,
        anyRoles: ['ADMIN'],
        anyPermissions: ['INVENTORY:WRITE'],
    },
    {
        label: 'Giám sát hệ thống',
        href: '/dashboard/admin/system',
        icon: <AppstoreOutlined />,
        anyRoles: ['ADMIN'],
        anyPermissions: ['ADMIN_PANEL:ACCESS'],
    },
    {
        label: 'Audit Logs',
        href: '/dashboard/admin/audit-logs',
        icon: <FileProtectOutlined />,
        anyRoles: ['ADMIN'],
        anyPermissions: ['AUDIT:READ'],
    },
];

type Props = {
    session: AuthSession;
    title: string;
    subtitle?: string;
    children: ReactNode;
};

function getActiveRole(session: AuthSession) {
    return normalizeRoleCode(session.primaryRole || session.role);
}

function canShowByRole(session: AuthSession, item: NavItem) {
    if (!item.anyRoles || item.anyRoles.length === 0) {
        return true;
    }

    const activeRole = getActiveRole(session);

    return item.anyRoles
        .map((role) => normalizeRoleCode(role))
        .includes(activeRole);
}

function canShowNavItem(session: AuthSession, item: NavItem) {
    const roleAllowed = canShowByRole(session, item);
    const permissionAllowed = hasAnyPermission(session, item.anyPermissions);

    return roleAllowed && permissionAllowed;
}

export default function DashboardFrame({
    session,
    title,
    subtitle,
    children,
}: Props) {
    const router = useRouter();
    const pathname = usePathname();

    const logout = () => {
        clearAuthSession();
        router.replace('/login');
    };

    const navItems = NAV_ITEMS.filter((item) => canShowNavItem(session, item));

    return (
        <main className={styles.dashboardShell}>
            <aside className={styles.sidebar}>
                <MedVerseMark compact />

                <nav className={styles.nav}>
                    {navItems.map((item) => {
                        const active =
                            pathname === item.href ||
                            (item.href !== '/dashboard' &&
                                pathname.startsWith(item.href));

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={
                                    active
                                        ? styles.navItemActive
                                        : styles.navItem
                                }
                            >
                                {item.icon}
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                <div className={styles.sidebarFooter}>
                    <span>Vai trò hiện tại</span>
                    <strong>
                        {getRoleLabel(session.primaryRole || session.role)}
                    </strong>
                </div>
            </aside>

            <section className={styles.mainArea}>
                <header className={styles.topbar}>
                    <div>
                        <Tag color="cyan">MedVerse</Tag>
                        <h1>{title}</h1>
                        <p>{subtitle || session.fullName || session.email}</p>
                    </div>

                    <Space size={12} align="center">
                        <NotificationBadge />

                        <Button
                            icon={<LogoutOutlined />}
                            onClick={logout}
                            style={{
                                borderRadius: 999,
                                height: 40,
                                paddingInline: 18,
                                fontWeight: 600,
                            }}
                        >
                            Đăng xuất
                        </Button>
                    </Space>
                </header>

                {children}
            </section>
        </main>
    );
}