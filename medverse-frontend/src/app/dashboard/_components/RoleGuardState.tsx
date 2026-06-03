'use client';

import { Alert, Button, Card } from 'antd';
import Link from 'next/link';
import type { ReactNode } from 'react';
import type { AuthSession, DemoRole } from '@/types/auth';
import styles from '../dashboard.module.scss';

type RoleGuardStateProps = {
    session: AuthSession;
    allow: DemoRole[];
    children: ReactNode;
};

export default function RoleGuardState({
    session,
    allow,
    children,
}: RoleGuardStateProps) {
    if (!allow.includes(session.role)) {
        return (
            <Card className={styles.detailCard}>
                <Alert
                    type="warning"
                    showIcon
                    message="Không đúng quyền truy cập"
                    description={`Trang này dành cho vai trò: ${allow.join(
                        ', ',
                    )}. Tài khoản hiện tại là: ${session.role}.`}
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