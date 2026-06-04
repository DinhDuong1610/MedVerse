'use client';

import {
    CalendarOutlined,
    FileProtectOutlined,
    MedicineBoxOutlined,
    RobotOutlined,
} from '@ant-design/icons';
import { Alert, Button, Card, List, Skeleton, Space, Statistic, Tag, message } from 'antd';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import ClinicalEmptyState from './ClinicalEmptyState';
import { getAiHealth } from '@/services/ai.service';
import { getAppointments } from '@/services/appointment.service';
import { getMedicalRecordByAppointment } from '@/services/ehr.service';
import {
    getPrescriptionByMedicalRecord,
    runPrescriptionSafetyCheck,
} from '@/services/prescription.service';
import type {
    AiHealth,
    Appointment,
    MedicalRecord,
    Prescription,
} from '@/types/clinical';
import styles from '../dashboard.module.scss';

type DoctorCase = {
    appointment: Appointment;
    medicalRecord?: MedicalRecord;
    prescription?: Prescription;
};

function formatDateTime(value?: string) {
    if (!value) return 'Chưa xác định';

    return new Date(value).toLocaleString('vi-VN');
}

export default function DoctorDashboard() {
    const [loading, setLoading] = useState(true);
    const [aiHealth, setAiHealth] = useState<AiHealth | null>(null);
    const [cases, setCases] = useState<DoctorCase[]>([]);
    const [checkingId, setCheckingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const loadDashboard = async () => {
        try {
            setLoading(true);
            setError(null);

            const [ai, appointmentPage] = await Promise.all([
                getAiHealth(),
                getAppointments({ size: 20 }),
            ]);

            setAiHealth(ai);

            const appointments = appointmentPage.content || [];

            const mappedCases = await Promise.all(
                appointments.map(async (appointment) => {
                    try {
                        const medicalRecord =
                            await getMedicalRecordByAppointment(
                                appointment.id,
                            );

                        let prescription: Prescription | undefined;

                        try {
                            prescription =
                                await getPrescriptionByMedicalRecord(
                                    medicalRecord.id,
                                );
                        } catch {
                            prescription = undefined;
                        }

                        return {
                            appointment,
                            medicalRecord,
                            prescription,
                        };
                    } catch {
                        return {
                            appointment,
                        };
                    }
                }),
            );

            setCases(mappedCases);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Không thể tải dữ liệu bác sĩ.',
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDashboard();
    }, []);

    const handleSafetyCheck = async (prescriptionId: string) => {
        try {
            setCheckingId(prescriptionId);

            await runPrescriptionSafetyCheck(prescriptionId);
            message.success('Đã kiểm tra an toàn đơn thuốc.');

            await loadDashboard();
        } catch (err) {
            message.error(
                err instanceof Error
                    ? err.message
                    : 'Không thể kiểm tra an toàn đơn thuốc.',
            );
        } finally {
            setCheckingId(null);
        }
    };

    const todayCases = useMemo(() => {
        const today = new Date().toISOString().slice(0, 10);

        return cases.filter((item) =>
            String(item.appointment.startTime || '').startsWith(today),
        );
    }, [cases]);

    const pendingMedicalRecords = cases.filter(
        (item) => !item.medicalRecord || item.medicalRecord.status !== 'COMPLETED',
    );

    const prescriptionCount = cases.filter((item) => item.prescription).length;

    const alertCount = cases.reduce(
        (sum, item) => sum + (item.prescription?.safetyAlerts?.length || 0),
        0,
    );

    if (loading) {
        return <Skeleton active paragraph={{ rows: 8 }} />;
    }

    return (
        <div className={styles.roleDashboard}>
            {error && (
                <Alert
                    type="error"
                    showIcon
                    message="Không thể tải dashboard bác sĩ"
                    description={error}
                    style={{ marginBottom: 20 }}
                />
            )}

            <section className={styles.heroCard}>
                <div>
                    <span>Điều phối lâm sàng</span>
                    <h2>Tập trung vào lịch khám và hồ sơ cần xử lý.</h2>
                    <p>
                        Theo dõi ca khám, cập nhật bệnh án, kê đơn thuốc và
                        kiểm tra an toàn điều trị trước khi hoàn tất hồ sơ.
                    </p>
                </div>

                <div className={styles.pulseCard}>
                    <strong>{todayCases.length}</strong>
                    <span>ca khám hôm nay</span>
                </div>
            </section>

            <section className={styles.metricGrid}>
                <Card className={styles.metricCard}>
                    <Statistic
                        title="Lịch khám"
                        value={cases.length}
                        prefix={<CalendarOutlined />}
                    />
                    <p>Lịch khám trong phạm vi phụ trách.</p>
                </Card>

                <Card className={styles.metricCard}>
                    <Statistic
                        title="Hồ sơ cần xử lý"
                        value={pendingMedicalRecords.length}
                        prefix={<FileProtectOutlined />}
                    />
                    <p>Ca khám chưa hoàn tất bệnh án.</p>
                </Card>

                <Card className={styles.metricCard}>
                    <Statistic
                        title="Đơn thuốc"
                        value={prescriptionCount}
                        prefix={<MedicineBoxOutlined />}
                    />
                    <p>Đơn thuốc đã được tạo.</p>
                </Card>

                <Card className={styles.metricCard}>
                    <Statistic
                        title="AI lâm sàng"
                        value={aiHealth?.status === 'UP' ? 'Sẵn sàng' : 'Gián đoạn'}
                        prefix={<RobotOutlined />}
                    />
                    <p>Hỗ trợ kiểm tra an toàn điều trị.</p>
                </Card>
            </section>

            <section className={styles.detailGrid} style={{ marginTop: 24 }}>
                <Card
                    className={styles.detailCard}
                    title="Ca khám cần chú ý"
                    extra={
                        <Link href="/dashboard/doctor/cases">
                            <Button type="link">Xem ca khám</Button>
                        </Link>
                    }
                >
                    {cases.length === 0 ? (
                        <ClinicalEmptyState
                            title="Chưa có lịch khám"
                            description="Khi có lịch khám được phân công, các ca cần xử lý sẽ hiển thị tại đây."
                        />
                    ) : (
                        <List
                            dataSource={cases.slice(0, 6)}
                            renderItem={(item) => (
                                <List.Item className={styles.cleanListItem}>
                                    <List.Item.Meta
                                        title={
                                            <div className={styles.listTitle}>
                                                <strong>
                                                    {item.appointment.patientName ||
                                                        'Bệnh nhân'}
                                                </strong>

                                                <Space wrap>
                                                    <Tag color="blue">
                                                        {item.appointment.status}
                                                    </Tag>

                                                    <Tag
                                                        color={
                                                            item.medicalRecord
                                                                ? 'green'
                                                                : 'orange'
                                                        }
                                                    >
                                                        {item.medicalRecord
                                                            ? 'Có bệnh án'
                                                            : 'Chưa có bệnh án'}
                                                    </Tag>
                                                </Space>
                                            </div>
                                        }
                                        description={
                                            <>
                                                {formatDateTime(
                                                    item.appointment.startTime,
                                                )}
                                                {' · '}
                                                {item.medicalRecord
                                                    ?.chiefComplaint ||
                                                    item.appointment.diagnosis ||
                                                    'Chưa có ghi chú khám.'}
                                            </>
                                        }
                                    />

                                    <Link
                                        href={`/dashboard/doctor/cases/${item.appointment.id}`}
                                    >
                                        <Button type="primary" ghost>
                                            Mở ca khám
                                        </Button>
                                    </Link>
                                </List.Item>
                            )}
                        />
                    )}
                </Card>

                <Card
                    className={styles.detailCard}
                    title="An toàn đơn thuốc"
                    extra={
                        <Tag color={alertCount > 0 ? 'red' : 'green'}>
                            {alertCount} cảnh báo
                        </Tag>
                    }
                >
                    {cases.filter((item) => item.prescription).length === 0 ? (
                        <p className={styles.mutedText}>
                            Chưa có đơn thuốc nào cần kiểm tra.
                        </p>
                    ) : (
                        <List
                            dataSource={cases
                                .filter((item) => item.prescription)
                                .slice(0, 5)}
                            renderItem={(item) => (
                                <List.Item className={styles.cleanListItem}>
                                    <List.Item.Meta
                                        title={
                                            <div className={styles.listTitle}>
                                                <strong>
                                                    {item.appointment.patientName ||
                                                        'Bệnh nhân'}
                                                </strong>

                                                <Tag
                                                    color={
                                                        item.prescription
                                                            ?.safetyAlerts
                                                            ?.length
                                                            ? 'red'
                                                            : 'green'
                                                    }
                                                >
                                                    {item.prescription
                                                        ?.safetyAlerts?.length ||
                                                        0}{' '}
                                                    cảnh báo
                                                </Tag>
                                            </div>
                                        }
                                        description={
                                            <>
                                                Trạng thái đơn thuốc:{' '}
                                                <b>
                                                    {
                                                        item.prescription
                                                            ?.status
                                                    }
                                                </b>
                                            </>
                                        }
                                    />

                                    {item.prescription && (
                                        <Button
                                            type="primary"
                                            loading={
                                                checkingId ===
                                                item.prescription.id
                                            }
                                            onClick={() =>
                                                handleSafetyCheck(
                                                    item.prescription!.id,
                                                )
                                            }
                                        >
                                            Kiểm tra
                                        </Button>
                                    )}
                                </List.Item>
                            )}
                        />
                    )}
                </Card>
            </section>
        </div>
    );
}