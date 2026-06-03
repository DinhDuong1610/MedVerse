'use client';

import { Card, Descriptions, Skeleton, Tag } from 'antd';
import { useEffect, useState } from 'react';
import DashboardFrame from '../../_components/DashboardFrame';
import { useAuthSession } from '@/lib/auth/use-auth-session';
import { getAiHealth } from '@/services/ai.service';
import type { AiHealth } from '@/types/clinical';
import styles from '../../dashboard.module.scss';

export default function DoctorAiPage() {
    const { session, loading: authLoading } = useAuthSession();
    const [health, setHealth] = useState<AiHealth | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            const data = await getAiHealth();
            setHealth(data);
            setLoading(false);
        }

        if (session?.role === 'DOCTOR') load();
    }, [session]);

    if (authLoading || !session || loading) {
        return <Skeleton active paragraph={{ rows: 8 }} />;
    }

    return (
        <DashboardFrame
            session={session}
            title="AI Clinical"
            subtitle="Theo dõi trạng thái MedVerse AI Service"
        >
            <Card className={styles.detailCard} title="AI Service Health">
                <Descriptions column={1}>
                    <Descriptions.Item label="Service">
                        {health?.service || 'medverse-ai'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Status">
                        <Tag color={health?.status === 'UP' ? 'green' : 'gold'}>
                            {health?.status || 'UNKNOWN'}
                        </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Fallback">
                        {health?.fallbackEnabled ? 'Enabled' : 'Disabled'}
                    </Descriptions.Item>
                </Descriptions>

                <div className={styles.medicationList}>
                    {health?.modules &&
                        Object.entries(health.modules).map(([module, status]) => (
                            <div key={module}>
                                <strong>{module}</strong>
                                <span>{status}</span>
                            </div>
                        ))}
                </div>
            </Card>
        </DashboardFrame>
    );
}