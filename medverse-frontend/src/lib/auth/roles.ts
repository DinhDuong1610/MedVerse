import type { DemoRole } from '@/types/auth';

export function resolveDemoRole(email: string): DemoRole {
    const normalized = email.trim().toLowerCase();

    if (normalized.includes('doctor')) return 'DOCTOR';
    if (normalized.includes('receptionist')) return 'RECEPTIONIST';
    if (normalized.includes('patient')) return 'PATIENT';
    if (normalized.includes('admin')) return 'ADMIN';

    return 'PATIENT';
}

export function getRoleLabel(role: DemoRole) {
    const labels: Record<DemoRole, string> = {
        ADMIN: 'Quản trị hệ thống',
        DOCTOR: 'Bác sĩ',
        RECEPTIONIST: 'Lễ tân',
        PATIENT: 'Bệnh nhân',
    };

    return labels[role];
}

export function getRoleHomePath(role: DemoRole) {
    const paths: Record<DemoRole, string> = {
        ADMIN: '/dashboard',
        DOCTOR: '/dashboard',
        RECEPTIONIST: '/dashboard',
        PATIENT: '/dashboard',
    };

    return paths[role];
}