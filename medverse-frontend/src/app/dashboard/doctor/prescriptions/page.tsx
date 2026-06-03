'use client';

import { Button, Card, List, Skeleton, Tag, message } from 'antd';
import { useEffect, useState } from 'react';
import DashboardFrame from '../../_components/DashboardFrame';
import ClinicalEmptyState from '../../_components/ClinicalEmptyState';
import { useAuthSession } from '@/lib/auth/use-auth-session';
import { getAppointments } from '@/services/appointment.service';
import { getMedicalRecordByAppointment } from '@/services/ehr.service';
import {
    getPrescriptionByMedicalRecord,
    runPrescriptionSafetyCheck,
} from '@/services/prescription.service';
import type { Appointment, MedicalRecord, Prescription } from '@/types/clinical';
import styles from '../../dashboard.module.scss';

type PrescriptionCase = {
    appointment: Appointment;
    medicalRecord?: MedicalRecord;
    prescription?: Prescription;
};

export default function DoctorPrescriptionsPage() {
    const { session, loading: authLoading } = useAuthSession();
    const [items, setItems] = useState<PrescriptionCase[]>([]);
    const [loading, setLoading] = useState(true);
    const [checkingId, setCheckingId] = useState<string | null>(null);

    const loadData = async () => {
        try {
            setLoading(true);

            const appointmentPage = await getAppointments();
            const appointments = appointmentPage.content || [];

            const mapped = await Promise.all(
                appointments.map(async (appointment) => {
                    try {
                        const medicalRecord = await getMedicalRecordByAppointment(
                            appointment.id,
                        );

                        try {
                            const prescription = await getPrescriptionByMedicalRecord(
                                medicalRecord.id,
                            );

                            return {
                                appointment,
                                medicalRecord,
                                prescription,
                            };
                        } catch {
                            return {
                                appointment,
                                medicalRecord,
                            };
                        }
                    } catch {
                        return {
                            appointment,
                        };
                    }
                }),
            );

            setItems(mapped);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (session?.role === 'DOCTOR') {
            loadData();
        }
    }, [session]);

    const handleSafetyCheck = async (prescriptionId: string) => {
        try {
            setCheckingId(prescriptionId);
            await runPrescriptionSafetyCheck(prescriptionId);
            message.success('Đã chạy AI safety check.');
            await loadData();
        } catch (error) {
            message.error(
                error instanceof Error
                    ? error.message
                    : 'Không thể chạy kiểm tra AI.',
            );
        } finally {
            setCheckingId(null);
        }
    };

    if (authLoading || !session || loading) {
        return <Skeleton active paragraph={{ rows: 8 }} />;
    }

    const prescriptions = items.filter((item) => item.prescription);

    return (
        <DashboardFrame
            session={session}
            title="Quản lý đơn thuốc"
            subtitle="Theo dõi đơn thuốc, thuốc đã kê và cảnh báo AI"
        >
            {prescriptions.length === 0 ? (
                <ClinicalEmptyState
                    title="Chưa có đơn thuốc"
                    description="Đơn thuốc sẽ hiển thị khi bác sĩ tạo prescription từ bệnh án."
                />
            ) : (
                <div className={styles.prescriptionGrid}>
                    {prescriptions.map((item) => (
                        <Card
                            key={item.prescription!.id}
                            className={styles.detailCard}
                            title={
                                <div className={styles.listTitle}>
                                    <span>
                                        {item.appointment.patientName || 'Bệnh nhân demo'}
                                    </span>

                                    <Tag
                                        color={
                                            item.prescription!.status === 'FINALIZED'
                                                ? 'green'
                                                : 'gold'
                                        }
                                    >
                                        {item.prescription!.status}
                                    </Tag>
                                </div>
                            }
                            extra={
                                <Button
                                    type="primary"
                                    loading={checkingId === item.prescription!.id}
                                    onClick={() => handleSafetyCheck(item.prescription!.id)}
                                >
                                    Chạy AI safety
                                </Button>
                            }
                        >
                            <p>{item.prescription!.note || 'Không có ghi chú.'}</p>

                            <List
                                dataSource={item.prescription!.items || []}
                                renderItem={(drug) => (
                                    <List.Item>
                                        <List.Item.Meta
                                            title={drug.medicationName}
                                            description={`${drug.dosage || ''} · ${drug.frequency || ''
                                                } · ${drug.duration || ''}`}
                                        />
                                    </List.Item>
                                )}
                            />

                            {item.prescription!.safetyAlerts?.length ? (
                                <div className={styles.alertStrip}>
                                    {item.prescription!.safetyAlerts.map((alert) => (
                                        <Tag
                                            key={alert.id}
                                            color={
                                                alert.severity === 'HIGH' ||
                                                    alert.severity === 'CRITICAL'
                                                    ? 'red'
                                                    : 'gold'
                                            }
                                        >
                                            {alert.type}: {alert.title || alert.severity}
                                        </Tag>
                                    ))}
                                </div>
                            ) : null}
                        </Card>
                    ))}
                </div>
            )}
        </DashboardFrame>
    );
}