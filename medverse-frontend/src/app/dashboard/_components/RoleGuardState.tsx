'use client';

import { Alert, Button, Card } from 'antd';
import Link from 'next/link';
import type { ReactNode } from 'react';
import {
    hasAllPermissions,
    hasAnyPermission,
    hasAnyRole,
} from '@/lib/auth/roles';
import type { AuthSession } from '@/types/auth';
import styles from '../dashboard.module.scss';

type RoleGuardStateProps = {
    session: AuthSession;

    /**
     * Legacy alias cho các page cũ:
     * <RoleGuardState allow={['ADMIN']} />
     */
    allow?: string[];

    anyRoles?: string[];
    anyPermissions?: string[];
    allPermissions?: string[];

    children: ReactNode;
};

export default function RoleGuardState({
    session,
    allow,
    anyRoles,
    anyPermissions,
    allPermissions,
    children,
}: RoleGuardStateProps) {
    const requiredRoles = anyRoles || allow;

    const roleAllowed = hasAnyRole(session, requiredRoles);
    const anyPermissionAllowed = hasAnyPermission(session, anyPermissions);
    const allPermissionAllowed = hasAllPermissions(session, allPermissions);

    const allowed = roleAllowed && anyPermissionAllowed && allPermissionAllowed;

    if (!allowed) {
        return (
            <Card className={styles.detailCard}>
                <Alert
                    type="warning"
                    showIcon
                    message="Không đủ quyền truy cập"
                    description={
                        <div>
                            <p>
                                Tài khoản hiện tại không có quyền truy cập trang
                                hoặc thao tác này.
                            </p>

                            {requiredRoles && requiredRoles.length > 0 && (
                                <p>
                                    Vai trò yêu cầu:{' '}
                                    <b>{requiredRoles.join(', ')}</b>
                                </p>
                            )}

                            {anyPermissions && anyPermissions.length > 0 && (
                                <p>
                                    Cần một trong các quyền:{' '}
                                    <b>{anyPermissions.join(', ')}</b>
                                </p>
                            )}

                            {allPermissions && allPermissions.length > 0 && (
                                <p>
                                    Cần đủ các quyền:{' '}
                                    <b>{allPermissions.join(', ')}</b>
                                </p>
                            )}
                        </div>
                    }
                />

                <div style={{ marginTop: 16 }}>
                    <Link href="/dashboard">
                        <Button type="primary">Quay về dashboard</Button>
                    </Link>
                </div>
            </Card>
        );
    }

    return <>{children}</>;
}