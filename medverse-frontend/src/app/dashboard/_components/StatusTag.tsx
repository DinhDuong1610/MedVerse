'use client';

import { Tag } from 'antd';
import { getStatusMeta } from '@/lib/ui/status';

type StatusTagProps = {
    value?: string | null;
};

export default function StatusTag({ value }: StatusTagProps) {
    const meta = getStatusMeta(value);

    return <Tag color={meta.color}>{meta.label}</Tag>;
}