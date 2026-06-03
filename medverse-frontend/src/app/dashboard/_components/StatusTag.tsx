'use client';

import { Tag } from 'antd';

const statusColorMap: Record<string, string> = {
    ACTIVE: 'green',
    DISABLED: 'red',

    PENDING: 'gold',
    APPROVED: 'green',
    REJECTED: 'red',
    CANCELLED: 'default',

    SCHEDULED: 'blue',
    CONFIRMED: 'cyan',
    COMPLETED: 'green',
    NO_SHOW: 'orange',

    DRAFT: 'gold',
    FINALIZED: 'green',

    AVAILABLE: 'green',
    BOOKED: 'blue',

    SUCCESS: 'green',
    FAILED: 'red',

    HIGH: 'orange',
    CRITICAL: 'red',
    MODERATE: 'gold',
    LOW: 'green',
    UNKNOWN: 'default',
};

type StatusTagProps = {
    value?: string;
};

export default function StatusTag({ value }: StatusTagProps) {
    const label = value || 'UNKNOWN';

    return <Tag color={statusColorMap[label] || 'default'}>{label}</Tag>;
}