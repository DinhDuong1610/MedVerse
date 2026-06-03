'use client';

import { Timeline } from 'antd';
import { useEffect, useState } from 'react';
import ClinicalPageState from '../../_components/ClinicalPageState';
import PatientPortalFrame from '../../_components/PatientPortalFrame';
import StatusTag from '../../_components/StatusTag';
import { hasRole } from '@/lib/auth/roles';
import { useAuthSession } from '@/lib/auth/use-auth-session';
import { getMyMedicalRecords } from '@/services/ehr.service';
import type { MedicalRecord } from '@/types/clinical';
import styles from '../../_components/patient-portal.module.scss';

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
    }, [session]);

    if (authLoading || !session) {
        return <ClinicalPageState loading>Loading</ClinicalPageState>;
    }

    return (
        <PatientPortalFrame session={session}>
            <section className={styles.hero}>
                <div>
                    <div className={styles.heroKicker}>Medical records</div>
                    <h1 className={styles.heroTitle}>Bệnh án của tôi</h1>
                    <p className={styles.heroDescription}>
                        Theo dõi lịch sử khám, chẩn đoán, ghi chú lâm sàng và
                        kế hoạch điều trị đã được bác sĩ hoàn tất.
                    </p>
                </div>

                <article className={styles.heroCard}>
                    <span>Tổng bệnh án</span>
                    <strong>{records.length}</strong>
                    <p>Bệnh án hoàn tất sẽ xuất hiện tại timeline này.</p>
                </article>
            </section>

            <section className={styles.portalPanel} style={{ marginTop: 24 }}>
                <div className={styles.panelHeader}>
                    <div>
                        <span>Clinical timeline</span>
                        <h2>Lịch sử khám</h2>
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
                                        Bác sĩ:{' '}
                                        <b>
                                            {record.doctorName ||
                                                record.doctorEmail ||
                                                'Chưa rõ'}
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
                                        Kế hoạch điều trị:{' '}
                                        {record.treatmentPlan ||
                                            'Chưa có kế hoạch điều trị.'}
                                    </p>
                                </article>
                            ),
                        }))}
                    />
                </ClinicalPageState>
            </section>
        </PatientPortalFrame>
    );
}