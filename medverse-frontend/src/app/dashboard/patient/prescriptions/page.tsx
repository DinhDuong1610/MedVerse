'use client';

import {
    Alert,
    Card,
    Collapse,
    List,
    Space,
    Statistic,
    Tag,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';
import ClinicalPageState from '../../_components/ClinicalPageState';
import PatientPortalFrame from '../../_components/PatientPortalFrame';
import StatusTag from '../../_components/StatusTag';
import { hasRole } from '@/lib/auth/roles';
import { useAuthSession } from '@/lib/auth/use-auth-session';
import { getMyPrescriptions } from '@/services/prescription.service';
import type { Prescription } from '@/types/clinical';
import styles from '../../_components/patient-portal.module.scss';

function formatDateTime(value?: string) {
    if (!value) return 'Chưa hoàn tất';

    return new Date(value).toLocaleString('vi-VN');
}

function hasHighRiskAlert(prescription: Prescription) {
    return prescription.safetyAlerts?.some((alert) =>
        ['HIGH', 'CRITICAL'].includes(alert.severity),
    );
}

function getSafetyMessage(prescription: Prescription) {
    if (!prescription.safetyAlerts?.length) {
        return {
            type: 'success' as const,
            message: 'Chưa ghi nhận cảnh báo an toàn thuốc',
            description:
                'Không có cảnh báo từ hệ thống tại thời điểm kiểm tra. Hãy dùng thuốc đúng hướng dẫn của bác sĩ.',
        };
    }

    if (hasHighRiskAlert(prescription)) {
        return {
            type: 'warning' as const,
            message: 'Đơn thuốc có cảnh báo cần chú ý',
            description:
                'Bạn không nên tự ý thay đổi thuốc. Hãy liên hệ bác sĩ hoặc cơ sở y tế nếu có dấu hiệu bất thường.',
        };
    }

    return {
        type: 'info' as const,
        message: 'Đơn thuốc có một số lưu ý an toàn',
        description:
            'Hãy đọc kỹ hướng dẫn và dùng thuốc đúng liều, đúng thời gian.',
    };
}

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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session]);

    const metrics = useMemo(() => {
        const finalized = prescriptions.filter(
            (item) => item.status === 'FINALIZED',
        ).length;

        const draft = prescriptions.filter(
            (item) => item.status === 'DRAFT',
        ).length;

        const alerts = prescriptions.reduce(
            (sum, item) => sum + (item.safetyAlerts?.length || 0),
            0,
        );

        const highRisk = prescriptions.filter(hasHighRiskAlert).length;

        return {
            total: prescriptions.length,
            finalized,
            draft,
            alerts,
            highRisk,
        };
    }, [prescriptions]);

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
                        Xem thuốc đã được kê, liều dùng, tần suất sử dụng,
                        hướng dẫn điều trị và các lưu ý an toàn.
                    </p>
                </div>

                <article className={styles.heroCard}>
                    <span>Tổng đơn thuốc</span>
                    <strong>{metrics.total}</strong>
                    <p>Đơn thuốc hoàn tất sẽ được hiển thị cho bệnh nhân.</p>
                </article>
            </section>

            <section className={styles.contentGrid}>
                <Card className={styles.portalPanel} style={{ marginTop: 24 }}>
                    <Statistic title="Đã hoàn tất" value={metrics.finalized} />
                </Card>

                <Card className={styles.portalPanel} style={{ marginTop: 24 }}>
                    <Statistic title="Đang nháp" value={metrics.draft} />
                </Card>

                <Card className={styles.portalPanel} style={{ marginTop: 24 }}>
                    <Statistic title="Cảnh báo" value={metrics.alerts} />
                </Card>
            </section>

            <section className={styles.portalPanel} style={{ marginTop: 24 }}>
                <div className={styles.panelHeader}>
                    <div>
                        <span>Prescriptions</span>
                        <h2>Danh sách đơn thuốc</h2>
                        <p>
                            Dùng thuốc đúng hướng dẫn. Không tự ý dừng thuốc,
                            đổi thuốc hoặc tăng liều nếu chưa hỏi bác sĩ.
                        </p>
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
                        items={prescriptions.map((prescription) => {
                            const safety = getSafetyMessage(prescription);

                            return {
                                key: prescription.id,
                                label: (
                                    <div className={styles.listTitle}>
                                        <strong>
                                            Đơn thuốc ·{' '}
                                            {prescription.doctorName ||
                                                'Bác sĩ điều trị'}
                                        </strong>

                                        <Space wrap>
                                            <StatusTag value={prescription.status} />

                                            {hasHighRiskAlert(prescription) && (
                                                <Tag color="red">
                                                    Cần chú ý
                                                </Tag>
                                            )}
                                        </Space>
                                    </div>
                                ),
                                children: (
                                    <div>
                                        <Alert
                                            type={safety.type}
                                            showIcon
                                            message={safety.message}
                                            description={safety.description}
                                            style={{ marginBottom: 16 }}
                                        />

                                        <p className={styles.muted}>
                                            Hoàn tất lúc:{' '}
                                            <b>
                                                {formatDateTime(
                                                    prescription.finalizedAt,
                                                )}
                                            </b>
                                        </p>

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
                                                        title={
                                                            <span>
                                                                {
                                                                    item.medicationName
                                                                }{' '}
                                                                {item.atcCode && (
                                                                    <Tag color="cyan">
                                                                        {
                                                                            item.atcCode
                                                                        }
                                                                    </Tag>
                                                                )}
                                                            </span>
                                                        }
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
                                                                    Số lượng:{' '}
                                                                    <b>
                                                                        {item.quantity ||
                                                                            0}
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

                                        {prescription.safetyAlerts?.length ? (
                                            <div style={{ marginTop: 16 }}>
                                                <h3>Lưu ý an toàn thuốc</h3>

                                                <Space wrap>
                                                    {prescription.safetyAlerts.map(
                                                        (alert) => (
                                                            <Tag
                                                                key={alert.id}
                                                                color={
                                                                    alert.severity ===
                                                                        'HIGH' ||
                                                                        alert.severity ===
                                                                        'CRITICAL'
                                                                        ? 'red'
                                                                        : 'gold'
                                                                }
                                                            >
                                                                {alert.severity}{' '}
                                                                ·{' '}
                                                                {alert.title ||
                                                                    alert.message}
                                                            </Tag>
                                                        ),
                                                    )}
                                                </Space>
                                            </div>
                                        ) : null}
                                    </div>
                                ),
                            };
                        })}
                    />
                </ClinicalPageState>
            </section>
        </PatientPortalFrame>
    );
}