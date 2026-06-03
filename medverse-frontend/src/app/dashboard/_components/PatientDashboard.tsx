'use client';

import {
    FileProtectOutlined,
    HeartOutlined,
    MedicineBoxOutlined,
    WarningOutlined,
} from '@ant-design/icons';
import { Alert, Button, List, Skeleton, Tag } from 'antd';
import { useEffect, useState } from 'react';
import MetricCard from './MetricCard';
import ClinicalEmptyState from './ClinicalEmptyState';
import { getMyAllergies, getMyMedicalProfile } from '@/services/patient-medical.service';
import { getMyMedicalRecords } from '@/services/ehr.service';
import { getMyPrescriptions } from '@/services/prescription.service';
import type {
    Allergy,
    MedicalRecord,
    PatientMedicalProfile,
    Prescription,
} from '@/types/clinical';
import styles from '../dashboard.module.scss';
import Link from 'next/link';

export default function PatientDashboard() {
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<PatientMedicalProfile | null>(null);
    const [allergies, setAllergies] = useState<Allergy[]>([]);
    const [records, setRecords] = useState<MedicalRecord[]>([]);
    const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function load() {
            try {
                setLoading(true);

                const [profileData, allergyData, recordPage, prescriptionPage] =
                    await Promise.all([
                        getMyMedicalProfile(),
                        getMyAllergies(),
                        getMyMedicalRecords(),
                        getMyPrescriptions(),
                    ]);

                setProfile(profileData);
                setAllergies(allergyData);
                setRecords(recordPage.content || []);
                setPrescriptions(prescriptionPage.content || []);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Không thể tải dữ liệu.');
            } finally {
                setLoading(false);
            }
        }

        load();
    }, []);

    if (loading) {
        return <Skeleton active paragraph={{ rows: 8 }} />;
    }

    return (
        <div className={styles.roleDashboard}>
            {error && <Alert type="error" showIcon message={error} />}

            <section className={styles.metricGrid}>
                <MetricCard
                    label="Nhóm máu"
                    value={profile?.bloodType || 'Chưa cập nhật'}
                    caption="Thông tin y tế nền"
                    icon={<HeartOutlined />}
                />

                <MetricCard
                    label="Dị ứng"
                    value={allergies.length}
                    caption="Cảnh báo khi kê đơn"
                    icon={<WarningOutlined />}
                />

                <MetricCard
                    label="Bệnh án"
                    value={records.length}
                    caption="Lịch sử khám"
                    icon={<FileProtectOutlined />}
                />

                <MetricCard
                    label="Đơn thuốc"
                    value={prescriptions.length}
                    caption="Theo dõi điều trị"
                    icon={<MedicineBoxOutlined />}
                />
            </section>

            <section className={styles.clinicalGrid}>
                <article className={styles.clinicalPanel}>
                    <div className={styles.panelHeader}>
                        <div>
                            <span>Patient baseline</span>
                            <h2>Hồ sơ y tế cá nhân</h2>
                        </div>
                    </div>

                    <div className={styles.profileMatrix}>
                        <div>
                            <span>Chiều cao</span>
                            <strong>{profile?.heightCm || '--'} cm</strong>
                        </div>
                        <div>
                            <span>Cân nặng</span>
                            <strong>{profile?.weightKg || '--'} kg</strong>
                        </div>
                        <div>
                            <span>Bệnh nền</span>
                            <strong>{profile?.chronicDiseases || 'Không ghi nhận'}</strong>
                        </div>
                        <div>
                            <span>Tiền sử</span>
                            <strong>{profile?.medicalHistory || 'Không ghi nhận'}</strong>
                        </div>
                    </div>
                </article>

                <article className={styles.clinicalPanel}>
                    <div className={styles.panelHeader}>
                        <div>
                            <span>Safety profile</span>
                            <h2>Dị ứng cần chú ý</h2>
                        </div>
                    </div>

                    {allergies.length === 0 ? (
                        <ClinicalEmptyState
                            title="Chưa có dị ứng"
                            description="Dữ liệu dị ứng sẽ giúp AI cảnh báo khi kê đơn."
                        />
                    ) : (
                        <List
                            dataSource={allergies}
                            renderItem={(item) => (
                                <List.Item className={styles.cleanListItem}>
                                    <List.Item.Meta
                                        title={
                                            <div className={styles.listTitle}>
                                                {item.allergen}
                                                <Tag color="red">{item.severity || 'UNKNOWN'}</Tag>
                                            </div>
                                        }
                                        description={item.reaction || item.note}
                                    />
                                </List.Item>
                            )}
                        />
                    )}
                </article>
            </section>

            <section className={styles.clinicalPanel}>
                <div className={styles.panelHeader}>
                    <div>
                        <span>Clinical timeline</span>
                        <h2>Bệnh án gần đây</h2>
                    </div>
                    <Button type="primary" ghost>
                        Xem tất cả
                    </Button>
                </div>

                {records.length === 0 ? (
                    <ClinicalEmptyState
                        title="Chưa có bệnh án"
                        description="Sau khi bác sĩ hoàn tất khám, bệnh án sẽ xuất hiện ở đây."
                    />
                ) : (
                    <div className={styles.recordTimeline}>
                        {records.map((record) => (
                            <article key={record.id} className={styles.recordCard}>
                                <Tag color={record.status === 'COMPLETED' ? 'green' : 'blue'}>
                                    {record.status}
                                </Tag>
                                <h3>{record.diagnosisText || record.chiefComplaint}</h3>
                                <p>{record.treatmentPlan || record.clinicalNote}</p>
                            </article>
                        ))}
                    </div>
                )}
            </section>

            <section className={styles.clinicalPanel}>
                <div className={styles.panelHeader}>
                    <div>
                        <span>Medication plan</span>
                        <h2>Đơn thuốc của tôi</h2>
                    </div>
                </div>

                {prescriptions.length === 0 ? (
                    <ClinicalEmptyState
                        title="Chưa có đơn thuốc"
                        description="Đơn thuốc sẽ được hiển thị sau khi bác sĩ kê đơn."
                    />
                ) : (
                    <div className={styles.prescriptionGrid}>
                        {prescriptions.map((prescription) => (
                            <article key={prescription.id} className={styles.prescriptionCard}>
                                <div className={styles.listTitle}>
                                    <strong>Đơn thuốc</strong>
                                    <Tag color={prescription.status === 'FINALIZED' ? 'green' : 'gold'}>
                                        {prescription.status}
                                    </Tag>
                                </div>

                                <p>{prescription.note || 'Không có ghi chú.'}</p>

                                <div className={styles.medicationList}>
                                    {prescription.items?.map((item) => (
                                        <div key={item.id}>
                                            <strong>{item.medicationName}</strong>
                                            <span>
                                                {item.dosage} · {item.frequency} · {item.duration}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </section>
            <section className={styles.clinicalPanel}>
                <div className={styles.panelHeader}>
                    <div>
                        <span>Booking</span>
                        <h2>Đặt lịch khám mới</h2>
                    </div>

                    <Link href="/dashboard/patient/book-appointment">
                        <Button type="primary">Đặt lịch ngay</Button>
                    </Link>
                </div>

                <p style={{ color: '#6a7c7a', lineHeight: 1.7 }}>
                    Gửi yêu cầu khám để lễ tân xác nhận, chọn slot bác sĩ và tạo lịch hẹn
                    chính thức cho bạn.
                </p>
            </section>
        </div>
    );
}