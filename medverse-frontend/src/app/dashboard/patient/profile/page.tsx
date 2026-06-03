'use client';

import { Alert, Card, Descriptions, List, Skeleton, Tag } from 'antd';
import { useEffect, useState } from 'react';
import DashboardFrame from '../../_components/DashboardFrame';
import { useAuthSession } from '@/lib/auth/use-auth-session';
import { getMyAllergies, getMyMedicalProfile } from '@/services/patient-medical.service';
import type { Allergy, PatientMedicalProfile } from '@/types/clinical';
import styles from '../../dashboard.module.scss';

export default function PatientProfilePage() {
    const { session, loading: authLoading } = useAuthSession();
    const [profile, setProfile] = useState<PatientMedicalProfile | null>(null);
    const [allergies, setAllergies] = useState<Allergy[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function load() {
            try {
                const [profileData, allergyData] = await Promise.all([
                    getMyMedicalProfile(),
                    getMyAllergies(),
                ]);

                setProfile(profileData);
                setAllergies(allergyData);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Không thể tải hồ sơ y tế.');
            } finally {
                setLoading(false);
            }
        }

        if (session?.role === 'PATIENT') load();
    }, [session]);

    if (authLoading || !session || loading) {
        return <Skeleton active paragraph={{ rows: 8 }} />;
    }

    return (
        <DashboardFrame
            session={session}
            title="Hồ sơ y tế cá nhân"
            subtitle="Thông tin nền dùng cho bệnh án, kê đơn và AI safety"
        >
            <div className={styles.detailGrid}>
                {error && <Alert type="error" showIcon message={error} />}

                <Card className={styles.detailCard} title="Thông tin sức khỏe nền">
                    <Descriptions column={2}>
                        <Descriptions.Item label="Nhóm máu">
                            {profile?.bloodType || 'Chưa cập nhật'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Chiều cao">
                            {profile?.heightCm ? `${profile.heightCm} cm` : 'Chưa cập nhật'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Cân nặng">
                            {profile?.weightKg ? `${profile.weightKg} kg` : 'Chưa cập nhật'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Bệnh nền">
                            {profile?.chronicDiseases || 'Không ghi nhận'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Tiền sử bệnh" span={2}>
                            {profile?.medicalHistory || 'Không ghi nhận'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Thuốc đang dùng" span={2}>
                            {profile?.currentMedicationsNote || 'Không ghi nhận'}
                        </Descriptions.Item>
                    </Descriptions>
                </Card>

                <Card className={styles.detailCard} title="Dị ứng cần chú ý">
                    <List
                        dataSource={allergies}
                        locale={{ emptyText: 'Chưa có dữ liệu dị ứng' }}
                        renderItem={(item) => (
                            <List.Item>
                                <List.Item.Meta
                                    title={
                                        <span>
                                            {item.allergen} <Tag color="red">{item.severity}</Tag>
                                        </span>
                                    }
                                    description={item.reaction || item.note}
                                />
                            </List.Item>
                        )}
                    />
                </Card>
            </div>
        </DashboardFrame>
    );
}