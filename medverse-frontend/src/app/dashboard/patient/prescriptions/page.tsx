'use client';

import { Card, List, Skeleton, Tag } from 'antd';
import { useEffect, useState } from 'react';
import DashboardFrame from '../../_components/DashboardFrame';
import ClinicalEmptyState from '../../_components/ClinicalEmptyState';
import { useAuthSession } from '@/lib/auth/use-auth-session';
import { getMyPrescriptions } from '@/services/prescription.service';
import type { Prescription } from '@/types/clinical';
import styles from '../../dashboard.module.scss';

export default function PatientPrescriptionsPage() {
    const { session, loading: authLoading } = useAuthSession();
    const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            const page = await getMyPrescriptions();
            setPrescriptions(page.content || []);
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
            title="Đơn thuốc của tôi"
            subtitle="Thông tin thuốc, liều dùng và hướng dẫn điều trị"
        >
            {prescriptions.length === 0 ? (
                <ClinicalEmptyState
                    title="Chưa có đơn thuốc"
                    description="Đơn thuốc sẽ xuất hiện sau khi bác sĩ kê đơn."
                />
            ) : (
                <div className={styles.prescriptionGrid}>
                    {prescriptions.map((prescription) => (
                        <Card
                            key={prescription.id}
                            className={styles.detailCard}
                            title={
                                <div className={styles.listTitle}>
                                    <span>Đơn thuốc</span>
                                    <Tag color={prescription.status === 'FINALIZED' ? 'green' : 'gold'}>
                                        {prescription.status}
                                    </Tag>
                                </div>
                            }
                        >
                            <p>{prescription.note || 'Không có ghi chú.'}</p>

                            <List
                                dataSource={prescription.items || []}
                                renderItem={(item) => (
                                    <List.Item>
                                        <List.Item.Meta
                                            title={item.medicationName}
                                            description={`${item.dosage || ''} · ${item.frequency || ''} · ${item.duration || ''}`}
                                        />
                                    </List.Item>
                                )}
                            />
                        </Card>
                    ))}
                </div>
            )}
        </DashboardFrame>
    );
}