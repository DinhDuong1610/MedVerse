'use client';

import { Skeleton } from 'antd';
import { hasRole } from '@/lib/auth/roles';
import { useAuthSession } from '@/lib/auth/use-auth-session';
import DashboardFrame from './_components/DashboardFrame';
import DoctorDashboard from './_components/DoctorDashboard';
import PatientPortalDashboard from './_components/PatientPortalDashboard';
import PatientPortalFrame from './_components/PatientPortalFrame';
import StaffDashboardPlaceholder from './_components/StaffDashboardPlaceholder';

function getDashboardTitle(role?: string) {
    if (role === 'ADMIN') return 'Trung tâm quản trị';
    if (role === 'DOCTOR') return 'Không gian bác sĩ';
    if (role === 'RECEPTIONIST') return 'Không gian lễ tân';

    return 'Tổng quan';
}

function getDashboardSubtitle(role?: string) {
    if (role === 'ADMIN') {
        return 'Theo dõi vận hành, nhân sự, phân quyền và dữ liệu hệ thống.';
    }

    if (role === 'DOCTOR') {
        return 'Quản lý lịch khám, ca khám, bệnh án và đơn thuốc của bệnh nhân.';
    }

    if (role === 'RECEPTIONIST') {
        return 'Tiếp nhận yêu cầu đặt lịch, điều phối lịch hẹn và hỗ trợ bệnh nhân.';
    }

    return 'Theo dõi nhanh các hoạt động quan trọng trong hệ thống.';
}

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
            title={getDashboardTitle(session.primaryRole || session.role)}
            subtitle={getDashboardSubtitle(session.primaryRole || session.role)}
        >
            {hasRole(session, 'DOCTOR') && <DoctorDashboard />}

            {(hasRole(session, 'ADMIN') || hasRole(session, 'RECEPTIONIST')) && (
                <StaffDashboardPlaceholder role={session.role} />
            )}
        </DashboardFrame>
    );
}