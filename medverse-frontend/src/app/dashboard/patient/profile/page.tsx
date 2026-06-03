'use client';

import { Descriptions, Tag } from 'antd';
import { useEffect, useState } from 'react';
import ClinicalPageState from '../../_components/ClinicalPageState';
import PatientPortalFrame from '../../_components/PatientPortalFrame';
import StatusTag from '../../_components/StatusTag';
import { hasRole } from '@/lib/auth/roles';
import { useAuthSession } from '@/lib/auth/use-auth-session';
import {
    getMyAllergies,
    getMyMedicalProfile,
} from '@/services/patient-medical.service';
import type { Allergy, PatientMedicalProfile } from '@/types/clinical';
import styles from '../../_components/patient-portal.module.scss';

export default function PatientProfilePage() {
    const { session, loading: authLoading } = useAuthSession();

    const [profile, setProfile] = useState<PatientMedicalProfile | null>(null);
    const [allergies, setAllergies] = useState<Allergy[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadProfile = async () => {
        try {
            setLoading(true);
            setError(null);

            const [profileData, allergyData] = await Promise.all([
                getMyMedicalProfile(),
                getMyAllergies(),
            ]);

            setProfile(profileData);
            setAllergies(allergyData);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Không thể tải hồ sơ y tế.',
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!session) return;

        if (!hasRole(session, 'PATIENT')) {
            setError('Trang này chỉ dành cho bệnh nhân.');
            setLoading(false);
            return;
        }

        loadProfile();
    }, [session]);

    if (authLoading || !session) {
        return <ClinicalPageState loading>Loading</ClinicalPageState>;
    }

    return (
        <PatientPortalFrame session={session}>
            <section className={styles.hero}>
                <div>
                    <div className={styles.heroKicker}>Health profile</div>
                    <h1 className={styles.heroTitle}>
                        Hồ sơ sức khỏe cá nhân
                    </h1>
                    <p className={styles.heroDescription}>
                        Đây là thông tin nền giúp bác sĩ hiểu rõ tình trạng sức
                        khỏe, tiền sử bệnh và dị ứng trước khi khám hoặc kê đơn.
                    </p>
                </div>

                <article className={styles.heroCard}>
                    <span>Dị ứng đã khai báo</span>
                    <strong>{allergies.length}</strong>
                    <p>
                        Các dị ứng này sẽ hỗ trợ cảnh báo an toàn khi bác sĩ kê
                        đơn.
                    </p>
                </article>
            </section>

            <ClinicalPageState loading={loading} error={error}>
                <section className={styles.contentGrid}>
                    <article className={styles.portalPanel}>
                        <div className={styles.panelHeader}>
                            <div>
                                <span>Baseline</span>
                                <h2>Thông tin sức khỏe nền</h2>
                                <p>
                                    Ở task tiếp theo, trang này sẽ được nâng cấp
                                    thành form chỉnh sửa hồ sơ sức khỏe.
                                </p>
                            </div>
                        </div>

                        <Descriptions column={1} bordered>
                            <Descriptions.Item label="Nhóm máu">
                                {profile?.bloodType || 'Chưa cập nhật'}
                            </Descriptions.Item>

                            <Descriptions.Item label="Chiều cao">
                                {profile?.heightCm
                                    ? `${profile.heightCm} cm`
                                    : 'Chưa cập nhật'}
                            </Descriptions.Item>

                            <Descriptions.Item label="Cân nặng">
                                {profile?.weightKg
                                    ? `${profile.weightKg} kg`
                                    : 'Chưa cập nhật'}
                            </Descriptions.Item>

                            <Descriptions.Item label="Bệnh nền">
                                {profile?.chronicDiseases || 'Không ghi nhận'}
                            </Descriptions.Item>

                            <Descriptions.Item label="Tiền sử bệnh">
                                {profile?.medicalHistory || 'Không ghi nhận'}
                            </Descriptions.Item>

                            <Descriptions.Item label="Thuốc đang dùng">
                                {profile?.currentMedicationsNote ||
                                    'Không ghi nhận'}
                            </Descriptions.Item>
                        </Descriptions>
                    </article>

                    <article className={styles.portalPanel}>
                        <div className={styles.panelHeader}>
                            <div>
                                <span>Safety</span>
                                <h2>Dị ứng cần chú ý</h2>
                            </div>

                            <Tag color="orange">Quan trọng</Tag>
                        </div>

                        <ClinicalPageState
                            empty={allergies.length === 0}
                            emptyTitle="Chưa có dữ liệu dị ứng"
                            emptyDescription="Nếu bạn có dị ứng thuốc, thức ăn hoặc chất nào khác, hãy cập nhật ở task tiếp theo."
                        >
                            {allergies.map((item) => (
                                <article key={item.id} className={styles.listCard}>
                                    <div className={styles.listTitle}>
                                        <strong>{item.allergen}</strong>
                                        <StatusTag
                                            value={item.severity || 'UNKNOWN'}
                                        />
                                    </div>

                                    <p className={styles.muted}>
                                        {item.reaction ||
                                            item.note ||
                                            'Không có ghi chú.'}
                                    </p>
                                </article>
                            ))}
                        </ClinicalPageState>
                    </article>
                </section>
            </ClinicalPageState>
        </PatientPortalFrame>
    );
}