'use client';

import { Card, List, Skeleton, Tag } from 'antd';
import { useEffect, useState } from 'react';
import DashboardFrame from '../../_components/DashboardFrame';
import ClinicalEmptyState from '../../_components/ClinicalEmptyState';
import { useAuthSession } from '@/lib/auth/use-auth-session';
import { getMyMedicalRecords } from '@/services/ehr.service';
import type { MedicalRecord } from '@/types/clinical';
import styles from '../../dashboard.module.scss';

export default function PatientMedicalRecordsPage() {
    const { session, loading: authLoading } = useAuthSession();
    const [records, setRecords] = useState<MedicalRecord[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            const page = await getMyMedicalRecords();
            setRecords(page.content || []);
            setLoading(false);
        }

        if (session?.role === 'PATIENT') load();
    }, [session]);

    if (authLoading || !session || loading) {
        return <Skeleton active paragraph={{ rows: 8 }} />;
    }

    return (
        <DashboardFrame
            session={session}
            title="Bệnh án của tôi"
            subtitle="Theo dõi lịch sử khám và chẩn đoán"
        >
            <Card className={styles.detailCard}>
                {records.length === 0 ? (
                    <ClinicalEmptyState
                        title="Chưa có bệnh án"
                        description="Bệnh án sẽ hiển thị sau khi bác sĩ tạo hồ sơ khám."
                    />
                ) : (
                    <List
                        dataSource={records}
                        renderItem={(record) => (
                            <List.Item className={styles.cleanListItem}>
                                <List.Item.Meta
                                    title={
                                        <div className={styles.listTitle}>
                                            <strong>{record.diagnosisText || record.chiefComplaint}</strong>
                                            <Tag color={record.status === 'COMPLETED' ? 'green' : 'blue'}>
                                                {record.status}
                                            </Tag>
                                        </div>
                                    }
                                    description={
                                        <div>
                                            <p>{record.clinicalNote || record.symptoms}</p>
                                            <p>{record.treatmentPlan}</p>
                                        </div>
                                    }
                                />
                            </List.Item>
                        )}
                    />
                )}
            </Card>
        </DashboardFrame>
    );
}