'use client';

import type { ReactNode } from 'react';
import {
    hasAllPermissions,
    hasAnyPermission,
    hasAnyRole,
} from '@/lib/auth/roles';
import type { AuthSession } from '@/types/auth';

type PermissionGateProps = {
    session: AuthSession | null | undefined;

    anyPermissions?: string[];
    allPermissions?: string[];
    anyRoles?: string[];

    fallback?: ReactNode;
    children: ReactNode;
};

export default function PermissionGate({
    session,
    anyPermissions,
    allPermissions,
    anyRoles,
    fallback = null,
    children,
}: PermissionGateProps) {
    const roleAllowed = hasAnyRole(session, anyRoles);
    const anyPermissionAllowed = hasAnyPermission(session, anyPermissions);
    const allPermissionAllowed = hasAllPermissions(session, allPermissions);

    if (!roleAllowed || !anyPermissionAllowed || !allPermissionAllowed) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
}