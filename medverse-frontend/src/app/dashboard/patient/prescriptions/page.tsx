'use client';

import { Collapse, List } from 'antd';
import { useEffect, useState } from 'react';
import ClinicalPageState from '../../_components/ClinicalPageState';
import PatientPortalFrame from '../../_components/PatientPortalFrame';
import StatusTag from '../../_components/StatusTag';
import { hasRole } from '@/lib/auth/roles';
import { useAuthSession } from '@/lib/auth/use-auth-session';
import { getMyPrescriptions } from '@/services/prescription.service';
import type { Prescription } from '@/types/clinical';
import styles from '../../_components/patient-portal.module.scss';

export default function PatientPrescriptionsPage() {
    const { session, loading: authLoading } = useAuthSession();

    const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadPrescriptions = async () => {
        try {
            setLoading(true);
            setError(null);

            const page = await getMyPrescriptions();
            setPrescriptions(page.content || []);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Không thể tải đơn thuốc.',
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

        loadPrescriptions();
    }, [session]);

    if (authLoading || !session) {
        return <ClinicalPageState loading>Loading</ClinicalPageState>;
    }

    return (
        <PatientPortalFrame session={session}>
            <section className={styles.hero}>
                <div>
                    <div className={styles.heroKicker}>Medication plan</div>
                    <h1 className={styles.heroTitle}>Đơn thuốc của tôi</h1>
                    <p className={styles.heroDescription}>
                        Xem thuốc đã được kê, liều dùng, tần suất sử dụng và
                        hướng dẫn điều trị từ bác sĩ.
                    </p>
                </div>

                <article className={styles.heroCard}>
                    <span>Tổng đơn thuốc</span>
                    <strong>{prescriptions.length}</strong>
                    <p>Đơn thuốc đã hoàn tất sẽ được hiển thị cho bệnh nhân.</p>
                </article>
            </section>

            <section className={styles.portalPanel} style={{ marginTop: 24 }}>
                <div className={styles.panelHeader}>
                    <div>
                        <span>Prescriptions</span>
                        <h2>Danh sách đơn thuốc</h2>
                    </div>
                </div>

                <ClinicalPageState
                    loading={loading}
                    error={error}
                    empty={prescriptions.length === 0}
                    emptyTitle="Chưa có đơn thuốc"
                    emptyDescription="Đơn thuốc sẽ xuất hiện sau khi bác sĩ kê đơn và hoàn tất."
                >
                    <Collapse
                        bordered={false}
                        items={prescriptions.map((prescription) => ({
                            key: prescription.id,
                            label: (
                                <div className={styles.listTitle}>
                                    <strong>
                                        Đơn thuốc ·{' '}
                                        {prescription.doctorName ||
                                            'Bác sĩ điều trị'}
                                    </strong>
                                    <StatusTag value={prescription.status} />
                                </div>
                            ),
                            children: (
                                <div>
                                    <p className={styles.muted}>
                                        Ghi chú:{' '}
                                        {prescription.note ||
                                            'Không có ghi chú.'}
                                    </p>

                                    <List
                                        dataSource={prescription.items || []}
                                        locale={{
                                            emptyText:
                                                'Đơn thuốc chưa có thuốc.',
                                        }}
                                        renderItem={(item) => (
                                            <List.Item>
                                                <List.Item.Meta
                                                    title={item.medicationName}
                                                    description={
                                                        <div>
                                                            <p>
                                                                Liều dùng:{' '}
                                                                <b>
                                                                    {item.dosage ||
                                                                        'N/A'}
                                                                </b>
                                                            </p>
                                                            <p>
                                                                Tần suất:{' '}
                                                                <b>
                                                                    {item.frequency ||
                                                                        'N/A'}
                                                                </b>
                                                            </p>
                                                            <p>
                                                                Thời gian:{' '}
                                                                <b>
                                                                    {item.duration ||
                                                                        'N/A'}
                                                                </b>
                                                            </p>
                                                            <p>
                                                                Hướng dẫn:{' '}
                                                                {item.instruction ||
                                                                    'Không có hướng dẫn thêm.'}
                                                            </p>
                                                        </div>
                                                    }
                                                />
                                            </List.Item>
                                        )}
                                    />
                                </div>
                            ),
                        }))}
                    />
                </ClinicalPageState>
            </section>
        </PatientPortalFrame>
    );
}