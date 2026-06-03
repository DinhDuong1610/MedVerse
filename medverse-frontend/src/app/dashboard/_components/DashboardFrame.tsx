'use client';

import {
    AppstoreOutlined,
    BellOutlined,
    CalendarOutlined,
    FileProtectOutlined,
    HeartOutlined,
    LogoutOutlined,
    MedicineBoxOutlined,
    RobotOutlined,
    UserOutlined,
} from '@ant-design/icons';
import { Button, Tag } from 'antd';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import MedVerseMark from '@/components/brand/MedVerseMark';
import { clearAuthSession } from '@/lib/auth/auth-storage';
import {
    getRoleLabel,
    hasAnyPermission,
    hasAnyRole,
} from '@/lib/auth/roles';
import type { AuthSession } from '@/types/auth';
import styles from '../dashboard.module.scss';
import NotificationBadge from './NotificationBadge';

type NavItem = {
    label: string;
    href: string;
    icon: ReactNode;

    anyRoles?: string[];
    anyPermissions?: string[];
};

const NAV_ITEMS: NavItem[] = [
    {
        label: 'Tổng quan',
        href: '/dashboard',
        icon: <UserOutlined />,
    },
    {
        label: 'Thông báo',
        href: '/dashboard/notifications',
        icon: <BellOutlined />,
    },

    /**
     * Patient Portal features
     */
    {
        label: 'Đặt lịch',
        href: '/dashboard/patient/book-appointment',
        icon: <CalendarOutlined />,
        anyPermissions: ['APPOINTMENT:WRITE_OWN'],
    },
    {
        label: 'Yêu cầu của tôi',
        href: '/dashboard/patient/appointment-requests',
        icon: <FileProtectOutlined />,
        anyPermissions: ['APPOINTMENT:READ_OWN'],
    },
    {
        label: 'Lịch hẹn',
        href: '/dashboard/patient/appointments',
        icon: <CalendarOutlined />,
        anyPermissions: ['APPOINTMENT:READ_OWN'],
    },
    {
        label: 'Hồ sơ y tế',
        href: '/dashboard/patient/profile',
        icon: <HeartOutlined />,
        anyPermissions: ['PATIENT_MEDICAL_PROFILE:READ_OWN'],
    },
    {
        label: 'Bệnh án',
        href: '/dashboard/patient/medical-records',
        icon: <FileProtectOutlined />,
        anyPermissions: ['EHR:READ_OWN'],
    },
    {
        label: 'Đơn thuốc',
        href: '/dashboard/patient/prescriptions',
        icon: <MedicineBoxOutlined />,
        anyPermissions: ['PRESCRIPTION:READ_OWN'],
    },

    /**
     * Doctor / Clinical workspace features
     */
    {
        label: 'Lịch khám',
        href: '/dashboard/doctor/appointments',
        icon: <CalendarOutlined />,
        anyPermissions: ['APPOINTMENT:READ_ANY'],
    },
    {
        label: 'Slot làm việc',
        href: '/dashboard/doctor/work-slots',
        icon: <CalendarOutlined />,
        anyPermissions: ['SCHEDULING:READ', 'SCHEDULING:WRITE'],
    },
    {
        label: 'Ca khám',
        href: '/dashboard/doctor/cases',
        icon: <FileProtectOutlined />,
        anyPermissions: ['EHR:READ_ANY', 'EHR:WRITE'],
    },
    {
        label: 'Đơn thuốc',
        href: '/dashboard/doctor/prescriptions',
        icon: <MedicineBoxOutlined />,
        anyPermissions: ['PRESCRIPTION:READ_ANY', 'PRESCRIPTION:WRITE'],
    },

    /**
     * Receptionist scheduling features
     */
    {
        label: 'Yêu cầu đặt lịch',
        href: '/dashboard/receptionist/requests',
        icon: <CalendarOutlined />,
        anyPermissions: ['APPOINTMENT:READ_ANY', 'APPOINTMENT:WRITE_ANY'],
    },
    {
        label: 'Lịch hẹn',
        href: '/dashboard/receptionist/appointments',
        icon: <FileProtectOutlined />,
        anyPermissions: ['APPOINTMENT:READ_ANY'],
    },

    /**
     * Admin / inventory / monitoring
     */
    {
        label: 'Kho thuốc',
        href: '/dashboard/admin/inventory',
        icon: <MedicineBoxOutlined />,
        anyPermissions: ['INVENTORY:READ'],
    },
    {
        label: 'Nhập kho',
        href: '/dashboard/admin/inventory/import',
        icon: <FileProtectOutlined />,
        anyPermissions: ['INVENTORY:WRITE'],
    },
    {
        label: 'Giám sát hệ thống',
        href: '/dashboard/admin/system',
        icon: <AppstoreOutlined />,
        anyPermissions: ['ADMIN_PANEL:ACCESS'],
        anyRoles: ['ADMIN'],
    },
    {
        label: 'Audit Logs',
        href: '/dashboard/admin/audit-logs',
        icon: <FileProtectOutlined />,
        anyPermissions: ['ADMIN_PANEL:ACCESS'],
        anyRoles: ['ADMIN'],
    },
];

type Props = {
    session: AuthSession;
    title: string;
    subtitle?: string;
    children: ReactNode;
};

function canShowNavItem(session: AuthSession, item: NavItem) {
    const roleAllowed = hasAnyRole(session, item.anyRoles);
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
                                    active ? styles.navItemActive : styles.navItem
                                }
                            >
                                {item.icon}
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                <div className={styles.sidebarFooter}>
                    <span>Workspace</span>
                    <strong>
                        {getRoleLabel(session.primaryRole || session.role)}
                    </strong>
                </div>
            </aside>

            <section className={styles.mainArea}>
                <header className={styles.topbar}>
                    <div>
                        <Tag color="cyan">MedVerse workspace</Tag>
                        <h1>{title}</h1>
                        <p>
                            {subtitle ||
                                session.fullName ||
                                session.email}
                        </p>
                    </div>

                    <NotificationBadge />

                    <Button icon={<LogoutOutlined />} onClick={logout}>
                        Đăng xuất
                    </Button>
                </header>

                {children}
            </section>
        </main>
    );
}