'use client';

import { LogoutOutlined } from '@ant-design/icons';
import { Button, Tag } from 'antd';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import MedVerseMark from '@/components/brand/MedVerseMark';
import { clearAuthSession, getAuthSession } from '@/lib/auth/auth-storage';
import { getRoleLabel } from '@/lib/auth/roles';
import type { AuthSession } from '@/types/auth';
import DoctorDashboard from './_components/DoctorDashboard';
import PatientDashboard from './_components/PatientDashboard';
import StaffDashboardPlaceholder from './_components/StaffDashboardPlaceholder';
import styles from './dashboard.module.scss';

export default function DashboardPage() {
    const router = useRouter();
    const [session, setSession] = useState<AuthSession | null>(null);

    useEffect(() => {
        const current = getAuthSession();

        if (!current) {
            router.replace('/login');
            return;
        }

        setSession(current);
    }, [router]);

    const logout = () => {
        clearAuthSession();
        router.replace('/login');
    };

    if (!session) return null;

    return (
        <main className={styles.dashboardShell}>
            <aside className={styles.sidebar}>
                <MedVerseMark compact />

                <nav className={styles.nav}>
                    <button className={styles.navItemActive}>Tổng quan</button>
                    <button className={styles.navItem}>Lịch khám</button>
                    <button className={styles.navItem}>Bệnh án</button>
                    <button className={styles.navItem}>Đơn thuốc</button>
                    <button className={styles.navItem}>AI</button>
                </nav>

                <div className={styles.sidebarFooter}>
                    <span>Workspace</span>
                    <strong>{getRoleLabel(session.role)}</strong>
                </div>
            </aside>

            <section className={styles.mainArea}>
                <header className={styles.topbar}>
                    <div>
                        <Tag color="cyan">Role-based workspace</Tag>
                        <h1>{getRoleLabel(session.role)}</h1>
                        <p>{session.email}</p>
                    </div>

                    <Button icon={<LogoutOutlined />} onClick={logout}>
                        Đăng xuất
                    </Button>
                </header>

                <section className={styles.heroCard}>
                    <div>
                        <span>MedVerse clinical workspace</span>
                        <h2>
                            Dashboard được cá nhân hóa theo vai trò và dữ liệu thật từ backend.
                        </h2>
                        <p>
                            Giao diện này dùng dữ liệu seed demo để trình bày luồng bệnh nhân,
                            bác sĩ, bệnh án điện tử, đơn thuốc và AI safety check.
                        </p>
                    </div>

                    <div className={styles.pulseCard}>
                        <strong>{session.role}</strong>
                        <span>Connected to MedVerse API</span>
                    </div>
                </section>

                {session.role === 'PATIENT' && <PatientDashboard />}
                {session.role === 'DOCTOR' && <DoctorDashboard />}
                {(session.role === 'ADMIN' || session.role === 'RECEPTIONIST') && (
                    <StaffDashboardPlaceholder role={session.role} />
                )}
            </section>
        </main>
    );
}