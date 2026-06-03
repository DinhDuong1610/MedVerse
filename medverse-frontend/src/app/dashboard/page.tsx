'use client';

import { Skeleton } from 'antd';
import { hasRole } from '@/lib/auth/roles';
import { useAuthSession } from '@/lib/auth/use-auth-session';
import DashboardFrame from './_components/DashboardFrame';
import DoctorDashboard from './_components/DoctorDashboard';
import PatientPortalDashboard from './_components/PatientPortalDashboard';
import PatientPortalFrame from './_components/PatientPortalFrame';
import StaffDashboardPlaceholder from './_components/StaffDashboardPlaceholder';
import styles from './dashboard.module.scss';

export default function DashboardPage() {
    const { session, loading } = useAuthSession();

    if (loading || !session) {
        return <Skeleton active paragraph={{ rows: 8 }} />;
    }

    if (hasRole(session, 'PATIENT')) {
        return (
            <PatientPortalFrame session={session}>
                <PatientPortalDashboard session={session} />
            </PatientPortalFrame>
        );
    }

    return (
        <DashboardFrame
            session={session}
            title="Tổng quan"
            subtitle="Không gian điều phối lâm sàng theo quyền truy cập"
        >
            <section className={styles.heroCard}>
                <div>
                    <span>MedVerse clinical workspace</span>
                    <h2>
                        Dashboard được cá nhân hóa theo quyền thật từ backend.
                    </h2>
                    <p>
                        Giao diện này dùng session có roles và permissions sau
                        Task 22 để hiển thị module phù hợp cho từng tài khoản.
                    </p>
                </div>

                <div className={styles.pulseCard}>
                    <strong>{session.primaryRole}</strong>
                    <span>{session.permissions.length} permissions enabled</span>
                </div>
            </section>

            {hasRole(session, 'DOCTOR') && <DoctorDashboard />}

            {(hasRole(session, 'ADMIN') || hasRole(session, 'RECEPTIONIST')) && (
                <StaffDashboardPlaceholder role={session.role} />
            )}
        </DashboardFrame>
    );
}