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
import Link from 'next/link';

type DoctorCase = {
    appointment: Appointment;
    medicalRecord?: MedicalRecord;
    prescription?: Prescription;
};

export default function DoctorCasesPage() {
    const { session, loading: authLoading } = useAuthSession();
    const [cases, setCases] = useState<DoctorCase[]>([]);
    const [loading, setLoading] = useState(true);
    const [checkingId, setCheckingId] = useState<string | null>(null);

    const loadCases = async () => {
        const appointmentPage = await getAppointments();
        const appointments = appointmentPage.content || [];

        const mapped = await Promise.all(
            appointments.map(async (appointment) => {
                try {
                    const medicalRecord = await getMedicalRecordByAppointment(appointment.id);

                    try {
                        const prescription = await getPrescriptionByMedicalRecord(medicalRecord.id);

                        return { appointment, medicalRecord, prescription };
                    } catch {
                        return { appointment, medicalRecord };
                    }
                } catch {
                    return { appointment };
                }
            }),
        );

        setCases(mapped);
        setLoading(false);
    };

    useEffect(() => {
        if (session?.role === 'DOCTOR') loadCases();
    }, [session]);

    const handleSafetyCheck = async (prescriptionId: string) => {
        try {
            setCheckingId(prescriptionId);
            await runPrescriptionSafetyCheck(prescriptionId);
            message.success('Đã chạy AI safety check.');
            await loadCases();
        } catch (error) {
            message.error(error instanceof Error ? error.message : 'Không thể chạy kiểm tra AI.');
        } finally {
            setCheckingId(null);
        }
    };

    if (authLoading || !session || loading) {
        return <Skeleton active paragraph={{ rows: 8 }} />;
    }

    return (
        <DashboardFrame
            session={session}
            title="Ca khám"
            subtitle="Liên kết appointment, bệnh án, đơn thuốc và AI safety"
        >
            <Card className={styles.detailCard}>
                {cases.length === 0 ? (
                    <ClinicalEmptyState
                        title="Chưa có ca khám"
                        description="Dữ liệu ca khám sẽ xuất hiện khi có appointment."
                    />
                ) : (
                    <List
                        dataSource={cases}
                        renderItem={(item) => (
                            <List.Item className={styles.caseItem}>
                                <div className={styles.caseContent}>
                                    <div>
                                        <div className={styles.listTitle}>
                                            <strong>{item.appointment.patientName || 'Bệnh nhân demo'}</strong>
                                            <Tag color="blue">{item.appointment.status}</Tag>
                                        </div>

                                        <p>
                                            {item.medicalRecord?.chiefComplaint ||
                                                item.appointment.diagnosis ||
                                                'Chưa có ghi chú khám.'}
                                        </p>

                                        <div className={styles.caseMeta}>
                                            <span>
                                                Bệnh án: <b>{item.medicalRecord?.status || 'Chưa tạo'}</b>
                                            </span>
                                            <span>
                                                Đơn thuốc: <b>{item.prescription?.status || 'Chưa có'}</b>
                                            </span>
                                        </div>
                                    </div>

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

                                    <Link href={`/dashboard/doctor/cases/${item.appointment.id}`}>
                                        <Button type="primary">Mở ca khám</Button>
                                    </Link>
                                </div>

                                {item.prescription?.safetyAlerts?.length ? (
                                    <div className={styles.alertStrip}>
                                        {item.prescription.safetyAlerts.map((alert) => (
                                            <Tag
                                                key={alert.id}
                                                color={
                                                    alert.severity === 'HIGH' || alert.severity === 'CRITICAL'
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
            </Card>
        </DashboardFrame>
    );
}