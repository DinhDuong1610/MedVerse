'use client';

import {
    CalendarOutlined,
    FileProtectOutlined,
    MedicineBoxOutlined,
    RobotOutlined,
} from '@ant-design/icons';
import { Alert, Button, List, Skeleton, Tag, message } from 'antd';
import { useEffect, useState } from 'react';
import MetricCard from './MetricCard';
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

export default function DoctorDashboard() {
    const [loading, setLoading] = useState(true);
    const [aiHealth, setAiHealth] = useState<AiHealth | null>(null);
    const [cases, setCases] = useState<DoctorCase[]>([]);
    const [checkingId, setCheckingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const loadDashboard = async () => {
        try {
            setLoading(true);

            const [ai, appointmentPage] = await Promise.all([
                getAiHealth(),
                getAppointments(),
            ]);

            setAiHealth(ai);

            const appointments = appointmentPage.content || [];

            const mappedCases = await Promise.all(
                appointments.map(async (appointment) => {
                    try {
                        const medicalRecord = await getMedicalRecordByAppointment(
                            appointment.id,
                        );

                        let prescription: Prescription | undefined;

                        try {
                            prescription = await getPrescriptionByMedicalRecord(
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
            setError(err instanceof Error ? err.message : 'Không thể tải dữ liệu bác sĩ.');
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
            message.success('Đã chạy kiểm tra an toàn đơn thuốc.');

            await loadDashboard();
        } catch (err) {
            message.error(
                err instanceof Error ? err.message : 'Không thể chạy AI safety check.',
            );
        } finally {
            setCheckingId(null);
        }
    };

    if (loading) {
        return <Skeleton active paragraph={{ rows: 8 }} />;
    }

    const prescriptionCount = cases.filter((item) => item.prescription).length;
    const alertCount = cases.reduce(
        (sum, item) => sum + (item.prescription?.safetyAlerts?.length || 0),
        0,
    );

    return (
        <div className={styles.roleDashboard}>
            {error && <Alert type="error" showIcon message={error} />}

            <section className={styles.metricGrid}>
                <MetricCard
                    label="Lịch khám"
                    value={cases.length}
                    caption="Dữ liệu demo đã seed"
                    icon={<CalendarOutlined />}
                />

                <MetricCard
                    label="Bệnh án"
                    value={cases.filter((item) => item.medicalRecord).length}
                    caption="Theo appointment"
                    icon={<FileProtectOutlined />}
                />

                <MetricCard
                    label="Đơn thuốc"
                    value={prescriptionCount}
                    caption="Sẵn sàng kiểm tra AI"
                    icon={<MedicineBoxOutlined />}
                />

                <MetricCard
                    label="AI"
                    value={aiHealth?.status || 'DOWN'}
                    caption="MedVerse AI service"
                    icon={<RobotOutlined />}
                />
            </section>

            <section className={styles.clinicalPanel}>
                <div className={styles.panelHeader}>
                    <div>
                        <span>Doctor cockpit</span>
                        <h2>Danh sách ca khám demo</h2>
                    </div>

                    <Tag color={alertCount > 0 ? 'red' : 'cyan'}>
                        {alertCount} cảnh báo AI
                    </Tag>
                </div>

                {cases.length === 0 ? (
                    <ClinicalEmptyState
                        title="Chưa có lịch khám"
                        description="Hãy bật DEMO_DATA_ENABLED=true hoặc tạo appointment demo."
                    />
                ) : (
                    <List
                        dataSource={cases}
                        renderItem={(item) => (
                            <List.Item className={styles.caseItem}>
                                <div className={styles.caseContent}>
                                    <div>
                                        <div className={styles.listTitle}>
                                            <strong>
                                                {item.appointment.patientName || 'Bệnh nhân demo'}
                                            </strong>
                                            <Tag color="blue">{item.appointment.status}</Tag>
                                        </div>

                                        <p>
                                            {item.medicalRecord?.chiefComplaint ||
                                                item.appointment.diagnosis ||
                                                'Chưa có ghi chú khám.'}
                                        </p>

                                        <div className={styles.caseMeta}>
                                            <span>
                                                Bệnh án:{' '}
                                                <b>{item.medicalRecord?.status || 'Chưa tạo'}</b>
                                            </span>
                                            <span>
                                                Đơn thuốc:{' '}
                                                <b>{item.prescription?.status || 'Chưa có'}</b>
                                            </span>
                                        </div>
                                    </div>

                                    <div className={styles.caseAction}>
                                        {item.prescription ? (
                                            <Button
                                                type="primary"
                                                loading={checkingId === item.prescription.id}
                                                onClick={() => handleSafetyCheck(item.prescription!.id)}
                                            >
                                                Chạy AI safety
                                            </Button>
                                        ) : (
                                            <Button disabled>Chưa có đơn thuốc</Button>
                                        )}
                                    </div>
                                </div>

                                {item.prescription?.safetyAlerts?.length ? (
                                    <div className={styles.alertStrip}>
                                        {item.prescription.safetyAlerts.map((alert) => (
                                            <Tag
                                                key={alert.id}
                                                color={
                                                    alert.severity === 'CRITICAL' ||
                                                        alert.severity === 'HIGH'
                                                        ? 'red'
                                                        : 'gold'
                                                }
                                            >
                                                {alert.type}: {alert.title || alert.severity}
                                            </Tag>
                                        ))}
                                    </div>
                                ) : null}
                            </List.Item>
                        )}
                    />
                )}
            </section>
        </div>
    );
}