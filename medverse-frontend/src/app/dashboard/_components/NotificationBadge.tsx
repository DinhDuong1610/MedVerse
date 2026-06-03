'use client';

import { Badge, Button } from 'antd';
import { BellOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getUnreadNotificationCount } from '@/services/notification.service';

export default function NotificationBadge() {
    const [count, setCount] = useState(0);

    useEffect(() => {
        async function load() {
            try {
                const unread = await getUnreadNotificationCount();
                setCount(unread);
            } catch {
                setCount(0);
            }
        }

        load();
    }, []);

    return (
        <Link href="/dashboard/notifications">
            <Badge count={count} size="small">
                <Button shape="circle" icon={<BellOutlined />} />
            </Badge>
        </Link>
    );
}