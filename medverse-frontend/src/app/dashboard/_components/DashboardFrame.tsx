'use client';

import {
    CalendarOutlined,
    FileProtectOutlined,
    LogoutOutlined,
    HeartOutlined,
    MedicineBoxOutlined,
    RobotOutlined,
    UserOutlined,
    BellOutlined,
} from '@ant-design/icons';
import { Button, Tag } from 'antd';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import MedVerseMark from '@/components/brand/MedVerseMark';
import { clearAuthSession } from '@/lib/auth/auth-storage';
import { getRoleLabel } from '@/lib/auth/roles';
import type { AuthSession, DemoRole } from '@/types/auth';
import styles from '../dashboard.module.scss';
import NotificationBadge from './NotificationBadge';

const navByRole: Record<
    DemoRole,
    Array<{ label: string; href: string; icon: ReactNode }>
> = {
    PATIENT: [
        { label: 'Tổng quan', href: '/dashboard', icon: <UserOutlined /> },
        {
            label: 'Thông báo',
            href: '/dashboard/notifications',
            icon: <BellOutlined />,
        },
        { label: 'Đặt lịch', href: '/dashboard/patient/book-appointment', icon: <CalendarOutlined /> },
        { label: 'Yêu cầu của tôi', href: '/dashboard/patient/appointment-requests', icon: <FileProtectOutlined /> },
        { label: 'Lịch hẹn', href: '/dashboard/patient/appointments', icon: <CalendarOutlined /> },
        { label: 'Hồ sơ y tế', href: '/dashboard/patient/profile', icon: <HeartOutlined /> },
        { label: 'Bệnh án', href: '/dashboard/patient/medical-records', icon: <FileProtectOutlined /> },
        { label: 'Đơn thuốc', href: '/dashboard/patient/prescriptions', icon: <MedicineBoxOutlined /> },
    ],
    DOCTOR: [
        { label: 'Tổng quan', href: '/dashboard', icon: <UserOutlined /> },
        {
            label: 'Thông báo',
            href: '/dashboard/notifications',
            icon: <BellOutlined />,
        },
        { label: 'Lịch khám', href: '/dashboard/doctor/appointments', icon: <CalendarOutlined /> },
        { label: 'Slot làm việc', href: '/dashboard/doctor/work-slots', icon: <CalendarOutlined /> },
        { label: 'Ca khám', href: '/dashboard/doctor/cases', icon: <FileProtectOutlined /> },
        { label: 'Đơn thuốc', href: '/dashboard/doctor/prescriptions', icon: <MedicineBoxOutlined /> },
        { label: 'AI Clinical', href: '/dashboard/doctor/ai', icon: <RobotOutlined /> },
    ],
    RECEPTIONIST: [
        { label: 'Tổng quan', href: '/dashboard', icon: <UserOutlined /> },
        {
            label: 'Thông báo',
            href: '/dashboard/notifications',
            icon: <BellOutlined />,
        },
        {
            label: 'Yêu cầu đặt lịch',
            href: '/dashboard/receptionist/requests',
            icon: <CalendarOutlined />,
        },
        {
            label: 'Lịch hẹn',
            href: '/dashboard/receptionist/appointments',
            icon: <FileProtectOutlined />,
        },
    ],
    ADMIN: [
        { label: 'Tổng quan', href: '/dashboard', icon: <UserOutlined /> },
        {
            label: 'Thông báo',
            href: '/dashboard/notifications',
            icon: <BellOutlined />,
        },
        {
            label: 'Kho thuốc',
            href: '/dashboard/admin/inventory',
            icon: <MedicineBoxOutlined />,
        },
        {
            label: 'Nhập kho',
            href: '/dashboard/admin/inventory/import',
            icon: <FileProtectOutlined />,
        },
    ],
};

type Props = {
    session: AuthSession;
    title: string;
    subtitle?: string;
    children: ReactNode;
};

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

    const navItems = navByRole[session.role];

    return (
        <main className={styles.dashboardShell}>
            <aside className={styles.sidebar}>
                <MedVerseMark compact />

                <nav className={styles.nav}>
                    {navItems.map((item) => {
                        const active =
                            pathname === item.href ||
                            (item.href !== '/dashboard' && pathname.startsWith(item.href));

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={active ? styles.navItemActive : styles.navItem}
                            >
                                {item.icon}
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                <div className={styles.sidebarFooter}>
                    <span>Workspace</span>
                    <strong>{getRoleLabel(session.role)}</strong>
                </div>
            </aside>

            <section className={styles.mainArea}>
                <header className={styles.topbar}>
                    <div>
                        <Tag color="cyan">MedVerse workspace</Tag>
                        <h1>{title}</h1>
                        <p>{subtitle || session.email}</p>
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