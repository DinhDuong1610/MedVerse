'use client';

import {
    BellOutlined,
    CalendarOutlined,
    FileProtectOutlined,
    HeartOutlined,
    HomeOutlined,
    LogoutOutlined,
    MedicineBoxOutlined,
} from '@ant-design/icons';
import { Button } from 'antd';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import MedVerseMark from '@/components/brand/MedVerseMark';
import { clearAuthSession } from '@/lib/auth/auth-storage';
import { hasAnyPermission } from '@/lib/auth/roles';
import type { AuthSession } from '@/types/auth';
import NotificationBadge from './NotificationBadge';
import styles from './patient-portal.module.scss';

type PatientNavItem = {
    label: string;
    href: string;
    icon: ReactNode;
    anyPermissions?: string[];
};

const PATIENT_NAV_ITEMS: PatientNavItem[] = [
    {
        label: 'Trang chủ',
        href: '/dashboard',
        icon: <HomeOutlined />,
    },
    {
        label: 'Đặt lịch',
        href: '/dashboard/patient/book-appointment',
        icon: <CalendarOutlined />,
        anyPermissions: ['APPOINTMENT:WRITE_OWN'],
    },
    {
        label: 'Yêu cầu',
        href: '/dashboard/patient/appointment-requests',
        icon: <FileProtectOutlined />,
        anyPermissions: ['APPOINTMENT:READ_OWN'],
    },
    {
        label: 'Hồ sơ sức khỏe',
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
];

type PatientPortalFrameProps = {
    session: AuthSession;
    children: ReactNode;
};

function canShowItem(session: AuthSession, item: PatientNavItem) {
    return hasAnyPermission(session, item.anyPermissions);
}

export default function PatientPortalFrame({
    session,
    children,
}: PatientPortalFrameProps) {
    const router = useRouter();
    const pathname = usePathname();

    const navItems = PATIENT_NAV_ITEMS.filter((item) =>
        canShowItem(session, item),
    );

    const logout = () => {
        clearAuthSession();
        router.replace('/login');
    };

    return (
        <main className={styles.portalShell}>
            <header className={styles.portalHeader}>
                <div className={styles.headerInner}>
                    <Link href="/dashboard">
                        <MedVerseMark compact />
                    </Link>

                    <nav className={styles.portalNav}>
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
                                            ? styles.navLinkActive
                                            : styles.navLink
                                    }
                                >
                                    {item.icon}
                                    {item.label}
                                </Link>
                            );
                        })}
                    </nav>

                    <div className={styles.headerActions}>
                        <NotificationBadge />

                        <Button icon={<LogoutOutlined />} onClick={logout}>
                            Đăng xuất
                        </Button>
                    </div>
                </div>
            </header>

            <section className={styles.portalMain}>{children}</section>

            <nav className={styles.mobileBar}>
                {navItems.slice(0, 4).map((item) => {
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
                                    ? styles.mobileLinkActive
                                    : styles.mobileLink
                            }
                            aria-label={item.label}
                        >
                            {item.icon}
                        </Link>
                    );
                })}
            </nav>
        </main>
    );
}