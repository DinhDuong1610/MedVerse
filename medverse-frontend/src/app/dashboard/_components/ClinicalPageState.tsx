'use client';

import { Alert, Button, Empty, Skeleton } from 'antd';
import Link from 'next/link';
import type { ReactNode } from 'react';

type ClinicalPageStateProps = {
    loading?: boolean;
    error?: string | null;
    empty?: boolean;

    emptyTitle?: string;
    emptyDescription?: string;

    actionText?: string;
    actionHref?: string;

    children: ReactNode;
};

export default function ClinicalPageState({
    loading,
    error,
    empty,
    emptyTitle = 'Chưa có dữ liệu',
    emptyDescription = 'Dữ liệu sẽ hiển thị tại đây khi có thông tin phù hợp.',
    actionText,
    actionHref,
    children,
}: ClinicalPageStateProps) {
    if (loading) {
        return <Skeleton active paragraph={{ rows: 8 }} />;
    }

    if (error) {
        return (
            <Alert
                type="error"
                showIcon
                message="Không thể tải dữ liệu"
                description={error}
            />
        );
    }

    if (empty) {
        return (
            <Empty description={emptyTitle}>
                <p style={{ color: '#6a7c7a', maxWidth: 520 }}>
                    {emptyDescription}
                </p>

                {actionText && actionHref && (
                    <Link href={actionHref}>
                        <Button type="primary">{actionText}</Button>
                    </Link>
                )}
            </Empty>
        );
    }

    return <>{children}</>;
}