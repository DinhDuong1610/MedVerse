import type { AuthSession, DemoRole } from '@/types/auth';

export const KNOWN_ROLE_CODES: DemoRole[] = [
    'ADMIN',
    'DOCTOR',
    'RECEPTIONIST',
    'PATIENT',
];

export function normalizeRoleCode(role?: string | null) {
    return (role || '')
        .trim()
        .toUpperCase()
        .replace(/^ROLE_/, '');
}

export function normalizeKnownRole(role?: string | null): DemoRole {
    const normalized = normalizeRoleCode(role);

    if (KNOWN_ROLE_CODES.includes(normalized as DemoRole)) {
        return normalized as DemoRole;
    }

    return 'PATIENT';
}

/**
 * Chỉ giữ lại để fallback trong dev.
 * Không dùng function này làm nguồn phân quyền chính nữa.
 */
export function resolveDemoRole(email: string): DemoRole {
    const normalized = email.trim().toLowerCase();

    if (normalized.includes('doctor')) return 'DOCTOR';
    if (normalized.includes('receptionist')) return 'RECEPTIONIST';
    if (normalized.includes('patient')) return 'PATIENT';
    if (normalized.includes('admin')) return 'ADMIN';

    return 'PATIENT';
}

function getSafeRoles(session: AuthSession | null | undefined) {
    return Array.isArray(session?.roles) ? session.roles : [];
}

function getSafePermissions(session: AuthSession | null | undefined) {
    return Array.isArray(session?.permissions) ? session.permissions : [];
}

export function getPrimaryRole(roles?: string[]) {
    const normalizedRoles = Array.isArray(roles)
        ? roles.map(normalizeRoleCode)
        : [];

    const priority: DemoRole[] = ['ADMIN', 'DOCTOR', 'RECEPTIONIST', 'PATIENT'];

    return (
        priority.find((role) => normalizedRoles.includes(role)) ||
        normalizedRoles[0] ||
        'PATIENT'
    );
}

export function getRoleLabel(role?: string) {
    const normalized = normalizeRoleCode(role);

    const labels: Record<string, string> = {
        ADMIN: 'Quản trị hệ thống',
        DOCTOR: 'Bác sĩ',
        RECEPTIONIST: 'Lễ tân',
        PATIENT: 'Bệnh nhân',
    };

    return labels[normalized] || normalized || 'Người dùng';
}

export function getRoleHomePath(role?: string) {
    const normalized = normalizeRoleCode(role);

    const paths: Record<string, string> = {
        ADMIN: '/dashboard',
        DOCTOR: '/dashboard',
        RECEPTIONIST: '/dashboard',
        PATIENT: '/dashboard',
    };

    return paths[normalized] || '/dashboard';
}

export function hasRole(session: AuthSession | null | undefined, role: string) {
    if (!session) return false;

    const target = normalizeRoleCode(role);
    const roles = getSafeRoles(session).map(normalizeRoleCode);

    return roles.includes(target);
}

export function hasAnyRole(
    session: AuthSession | null | undefined,
    roles?: string[],
) {
    if (!roles || roles.length === 0) return true;

    return roles.some((role) => hasRole(session, role));
}

export function hasPermission(
    session: AuthSession | null | undefined,
    permission: string,
) {
    if (!session) return false;

    const permissions = getSafePermissions(session);

    return permissions.includes(permission);
}

export function hasAnyPermission(
    session: AuthSession | null | undefined,
    permissions?: string[],
) {
    if (!permissions || permissions.length === 0) return true;

    return permissions.some((permission) => hasPermission(session, permission));
}

export function hasAllPermissions(
    session: AuthSession | null | undefined,
    permissions?: string[],
) {
    if (!permissions || permissions.length === 0) return true;

    return permissions.every((permission) => hasPermission(session, permission));
}