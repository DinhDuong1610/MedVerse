'use client';

import { Skeleton } from 'antd';
import { useAuthSession } from '@/lib/auth/use-auth-session';
import DashboardFrame from './_components/DashboardFrame';
import DoctorDashboard from './_components/DoctorDashboard';
import PatientDashboard from './_components/PatientDashboard';
import StaffDashboardPlaceholder from './_components/StaffDashboardPlaceholder';
import styles from './dashboard.module.scss';

export default function DashboardPage() {
    const { session, loading } = useAuthSession();

    if (loading || !session) {
        return <Skeleton active paragraph={{ rows: 8 }} />;
    }

    return (
        <DashboardFrame
            session={session}
            title="Tổng quan"
            subtitle="Không gian điều phối lâm sàng theo vai trò"
        >
            <section className={styles.heroCard}>
                <div>
                    <span>MedVerse clinical workspace</span>
                    <h2>Dashboard được cá nhân hóa theo vai trò và dữ liệu thật từ backend.</h2>
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
        </DashboardFrame>
    );
}