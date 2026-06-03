'use client';

import { Alert, Card, Collapse, List, Space, Statistic, Tag, Timeline } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import ClinicalPageState from '../../_components/ClinicalPageState';
import PatientPortalFrame from '../../_components/PatientPortalFrame';
import StatusTag from '../../_components/StatusTag';
import { hasRole } from '@/lib/auth/roles';
import { useAuthSession } from '@/lib/auth/use-auth-session';
import { getMyMedicalRecords } from '@/services/ehr.service';
import type { MedicalRecord } from '@/types/clinical';
import styles from '../../_components/patient-portal.module.scss';

function formatDateTime(value?: string) {
    if (!value) return 'Chưa rõ';

    return new Date(value).toLocaleString('vi-VN');
}

export default function PatientMedicalRecordsPage() {
    const { session, loading: authLoading } = useAuthSession();

    const [records, setRecords] = useState<MedicalRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadRecords = async () => {
        try {
            setLoading(true);
            setError(null);

            const page = await getMyMedicalRecords();
            setRecords(page.content || []);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Không thể tải bệnh án.',
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

        loadRecords();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session]);

    const metrics = useMemo(() => {
        const completed = records.filter(
            (record) => record.status === 'COMPLETED',
        ).length;

        const draft = records.filter((record) => record.status === 'DRAFT').length;

        const totalDiagnoses = records.reduce(
            (sum, record) => sum + (record.diagnoses?.length || 0),
            0,
        );

        return {
            total: records.length,
            completed,
            draft,
            totalDiagnoses,
        };
    }, [records]);

    if (authLoading || !session) {
        return <ClinicalPageState loading>Loading</ClinicalPageState>;
    }

    return (
        <PatientPortalFrame session={session}>
            <section className={styles.hero}>
                <div>
                    <div className={styles.heroKicker}>Medical records</div>
                    <h1 className={styles.heroTitle}>Kết quả khám của tôi</h1>
                    <p className={styles.heroDescription}>
                        Theo dõi lịch sử khám, chẩn đoán, kế hoạch điều trị và
                        dặn dò tái khám từ bác sĩ.
                    </p>
                </div>

                <article className={styles.heroCard}>
                    <span>Tổng bệnh án</span>
                    <strong>{metrics.total}</strong>
                    <p>Bệnh án hoàn tất sẽ xuất hiện trong timeline này.</p>
                </article>
            </section>

            <section className={styles.contentGrid}>
                <Card className={styles.portalPanel} style={{ marginTop: 24 }}>
                    <Statistic title="Đã hoàn tất" value={metrics.completed} />
                </Card>

                <Card className={styles.portalPanel} style={{ marginTop: 24 }}>
                    <Statistic title="Đang nháp" value={metrics.draft} />
                </Card>

                <Card className={styles.portalPanel} style={{ marginTop: 24 }}>
                    <Statistic
                        title="Chẩn đoán ICD"
                        value={metrics.totalDiagnoses}
                    />
                </Card>
            </section>

            <section className={styles.portalPanel} style={{ marginTop: 24 }}>
                <div className={styles.panelHeader}>
                    <div>
                        <span>Clinical timeline</span>
                        <h2>Lịch sử khám</h2>
                        <p>
                            Mỗi lần khám có thể bao gồm ghi chú lâm sàng, chẩn
                            đoán ICD, kế hoạch điều trị và hướng dẫn tái khám.
                        </p>
                    </div>
                </div>

                <ClinicalPageState
                    loading={loading}
                    error={error}
                    empty={records.length === 0}
                    emptyTitle="Chưa có bệnh án"
                    emptyDescription="Bệnh án sẽ hiển thị sau khi bác sĩ tạo và hoàn tất hồ sơ khám."
                >
                    <Timeline
                        items={records.map((record) => ({
                            color:
                                record.status === 'COMPLETED'
                                    ? 'green'
                                    : 'blue',
                            children: (
                                <article className={styles.listCard}>
                                    <div className={styles.listTitle}>
                                        <strong>
                                            {record.diagnosisText ||
                                                record.chiefComplaint ||
                                                'Bệnh án'}
                                        </strong>

                                        <StatusTag value={record.status} />
                                    </div>

                                    <p className={styles.muted}>
                                        Thời gian tạo:{' '}
                                        <b>{formatDateTime(record.createdAt)}</b>
                                    </p>

                                    <p className={styles.muted}>
                                        Bác sĩ:{' '}
                                        <b>
                                            {record.doctorName ||
                                                record.doctorEmail ||
                                                'Chưa rõ'}
                                        </b>
                                    </p>

                                    <Collapse
                                        bordered={false}
                                        items={[
                                            {
                                                key: 'summary',
                                                label: 'Xem chi tiết kết quả khám',
                                                children: (
                                                    <div>
                                                        <Alert
                                                            type={
                                                                record.status ===
                                                                    'COMPLETED'
                                                                    ? 'success'
                                                                    : 'info'
                                                            }
                                                            showIcon
                                                            message={
                                                                record.status ===
                                                                    'COMPLETED'
                                                                    ? 'Bệnh án đã hoàn tất'
                                                                    : 'Bệnh án đang được cập nhật'
                                                            }
                                                            description="Thông tin này được ghi nhận bởi bác sĩ điều trị."
                                                            style={{
                                                                marginBottom: 16,
                                                            }}
                                                        />

                                                        <p className={styles.muted}>
                                                            Lý do khám:{' '}
                                                            <b>
                                                                {record.chiefComplaint ||
                                                                    'Không ghi nhận'}
                                                            </b>
                                                        </p>

                                                        <p className={styles.muted}>
                                                            Triệu chứng:{' '}
                                                            {record.symptoms ||
                                                                'Không có ghi chú triệu chứng.'}
                                                        </p>

                                                        <p className={styles.muted}>
                                                            Ghi chú lâm sàng:{' '}
                                                            {record.clinicalNote ||
                                                                'Không có ghi chú.'}
                                                        </p>

                                                        <p className={styles.muted}>
                                                            Chẩn đoán chính:{' '}
                                                            <b>
                                                                {record.diagnosisText ||
                                                                    'Chưa có chẩn đoán chính.'}
                                                            </b>
                                                        </p>

                                                        <p className={styles.muted}>
                                                            Kế hoạch điều trị:{' '}
                                                            {record.treatmentPlan ||
                                                                'Chưa có kế hoạch điều trị.'}
                                                        </p>

                                                        <p className={styles.muted}>
                                                            Dặn dò tái khám:{' '}
                                                            {record.followUpNote ||
                                                                'Chưa có dặn dò tái khám.'}
                                                        </p>

                                                        <div style={{ marginTop: 16 }}>
                                                            <h3>Chẩn đoán ICD</h3>

                                                            {record.diagnoses?.length ? (
                                                                <Space wrap>
                                                                    {record.diagnoses.map(
                                                                        (diagnosis) => (
                                                                            <Tag
                                                                                key={
                                                                                    diagnosis.id
                                                                                }
                                                                                color="blue"
                                                                            >
                                                                                {diagnosis.icdCode ||
                                                                                    'ICD'}{' '}
                                                                                ·{' '}
                                                                                {
                                                                                    diagnosis.diagnosisText
                                                                                }
                                                                            </Tag>
                                                                        ),
                                                                    )}
                                                                </Space>
                                                            ) : (
                                                                <p
                                                                    className={
                                                                        styles.muted
                                                                    }
                                                                >
                                                                    Chưa có mã ICD.
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                ),
                                            },
                                        ]}
                                    />
                                </article>
                            ),
                        }))}
                    />
                </ClinicalPageState>
            </section>
        </PatientPortalFrame>
    );
}