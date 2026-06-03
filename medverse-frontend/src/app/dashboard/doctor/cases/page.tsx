'use client';

import {
    Alert,
    Button,
    Card,
    DatePicker,
    List,
    Select,
    Skeleton,
    Space,
    Statistic,
    Tag,
    message,
} from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import ClinicalEmptyState from '../../_components/ClinicalEmptyState';
import ClinicalPageState from '../../_components/ClinicalPageState';
import DashboardFrame from '../../_components/DashboardFrame';
import RoleGuardState from '../../_components/RoleGuardState';
import StatusTag from '../../_components/StatusTag';
import { hasAnyPermission } from '@/lib/auth/roles';
import { useAuthSession } from '@/lib/auth/use-auth-session';
import { getAppointments } from '@/services/appointment.service';
import { getMedicalRecordByAppointment } from '@/services/ehr.service';
import {
    getPrescriptionByMedicalRecord,
    runPrescriptionSafetyCheck,
} from '@/services/prescription.service';
import type {
    Appointment,
    AppointmentStatus,
    MedicalRecord,
    Prescription,
} from '@/types/clinical';
import styles from '../../dashboard.module.scss';

type DoctorCase = {
    appointment: Appointment;
    medicalRecord?: MedicalRecord;
    prescription?: Prescription;
};

type AppointmentStatusFilter = AppointmentStatus | 'ALL';

const statusOptions: Array<{
    value: AppointmentStatusFilter;
    label: string;
}> = [
        { value: 'ALL', label: 'Tất cả' },
        { value: 'SCHEDULED', label: 'SCHEDULED' },
        { value: 'CONFIRMED', label: 'CONFIRMED' },
        { value: 'COMPLETED', label: 'COMPLETED' },
        { value: 'CANCELLED', label: 'CANCELLED' },
        { value: 'NO_SHOW', label: 'NO_SHOW' },
    ];

function getDayRange(date: Dayjs) {
    return {
        from: date.startOf('day').toISOString(),
        to: date.endOf('day').toISOString(),
    };
}

function formatDateTime(value?: string) {
    if (!value) return 'Chưa rõ';

    return new Date(value).toLocaleString('vi-VN');
}

function formatTime(value?: string) {
    if (!value) return 'Chưa rõ';

    return new Date(value).toLocaleTimeString('vi-VN');
}

function getCaseUrgencyTag(item: DoctorCase) {
    if (item.prescription?.safetyAlerts?.some((alert) =>
        ['HIGH', 'CRITICAL'].includes(alert.severity),
    )) {
        return <Tag color="red">Có cảnh báo thuốc</Tag>;
    }

    if (!item.medicalRecord) {
        return <Tag color="gold">Chưa tạo bệnh án</Tag>;
    }

    if (!item.prescription) {
        return <Tag color="blue">Chưa kê đơn</Tag>;
    }

    return <Tag color="green">Đã xử lý</Tag>;
}

export default function DoctorCasesPage() {
    const { session, loading: authLoading } = useAuthSession();

    const [cases, setCases] = useState<DoctorCase[]>([]);
    const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());
    const [status, setStatus] = useState<AppointmentStatusFilter>('ALL');

    const [loading, setLoading] = useState(true);
    const [checkingId, setCheckingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const canReadCases = hasAnyPermission(session, [
        'EHR:READ_ANY',
        'EHR:WRITE',
    ]);

    const canWritePrescription = hasAnyPermission(session, [
        'PRESCRIPTION:WRITE',
    ]);

    const loadCases = async (
        nextDate = selectedDate,
        nextStatus = status,
    ) => {
        if (!session?.userId) {
            setError('Không tìm thấy userId trong session.');
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const { from, to } = getDayRange(nextDate);

            const appointmentPage = await getAppointments({
                doctorId: session.userId,
                from,
                to,
                status: nextStatus,
                size: 100,
            });

            const appointments = appointmentPage.content || [];

            const mapped = await Promise.all(
                appointments.map(async (appointment) => {
                    try {
                        const medicalRecord =
                            await getMedicalRecordByAppointment(
                                appointment.id,
                            );

                        try {
                            const prescription =
                                await getPrescriptionByMedicalRecord(
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

            setCases(mapped);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Không thể tải danh sách ca khám.',
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!session) return;

        if (!canReadCases) {
            setError('Tài khoản hiện tại không có quyền xem ca khám.');
            setLoading(false);
            return;
        }

        loadCases();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session]);

    const metrics = useMemo(() => {
        const total = cases.length;
        const withoutRecord = cases.filter((item) => !item.medicalRecord).length;
        const draftRecords = cases.filter(
            (item) => item.medicalRecord?.status === 'DRAFT',
        ).length;
        const completedRecords = cases.filter(
            (item) => item.medicalRecord?.status === 'COMPLETED',
        ).length;
        const withPrescription = cases.filter((item) => item.prescription).length;
        const withCriticalAlert = cases.filter((item) =>
            item.prescription?.safetyAlerts?.some((alert) =>
                ['HIGH', 'CRITICAL'].includes(alert.severity),
            ),
        ).length;

        return {
            total,
            withoutRecord,
            draftRecords,
            completedRecords,
            withPrescription,
            withCriticalAlert,
        };
    }, [cases]);

    const handleDateChange = (value: Dayjs | null) => {
        const nextDate = value || dayjs();

        setSelectedDate(nextDate);
        loadCases(nextDate, status);
    };

    const handleStatusChange = (value: AppointmentStatusFilter) => {
        setStatus(value);
        loadCases(selectedDate, value);
    };

    const handleSafetyCheck = async (prescriptionId: string) => {
        try {
            setCheckingId(prescriptionId);

            await runPrescriptionSafetyCheck(prescriptionId);

            message.success('Đã chạy AI safety check.');
            await loadCases();
        } catch (err) {
            message.error(
                err instanceof Error
                    ? err.message
                    : 'Không thể chạy kiểm tra AI.',
            );
        } finally {
            setCheckingId(null);
        }
    };

    if (authLoading || !session) {
        return <Skeleton active paragraph={{ rows: 8 }} />;
    }

    return (
        <DashboardFrame
            session={session}
            title="Clinical Case Board"
            subtitle="Danh sách ca khám theo ngày, trạng thái bệnh án, đơn thuốc và AI safety"
        >
            <RoleGuardState
                session={session}
                anyPermissions={['EHR:READ_ANY', 'EHR:WRITE']}
            >
                <section className={styles.metricGrid}>
                    <Card className={styles.metricCard}>
                        <Statistic title="Tổng ca" value={metrics.total} />
                    </Card>

                    <Card className={styles.metricCard}>
                        <Statistic
                            title="Chưa có bệnh án"
                            value={metrics.withoutRecord}
                        />
                    </Card>

                    <Card className={styles.metricCard}>
                        <Statistic
                            title="Bệnh án nháp"
                            value={metrics.draftRecords}
                        />
                    </Card>

                    <Card className={styles.metricCard}>
                        <Statistic
                            title="Cảnh báo thuốc"
                            value={metrics.withCriticalAlert}
                        />
                    </Card>
                </section>

                <Card className={styles.detailCard} style={{ marginTop: 24 }}>
                    <div className={styles.panelHeader}>
                        <div>
                            <span>Doctor cases</span>
                            <h2>Danh sách ca khám của tôi</h2>
                            <p>
                                Chỉ hiển thị lịch hẹn thuộc bác sĩ đang đăng
                                nhập. Dùng bộ lọc để xem ca theo ngày và trạng
                                thái.
                            </p>
                        </div>

                        <Space wrap>
                            <DatePicker
                                value={selectedDate}
                                onChange={handleDateChange}
                                allowClear={false}
                            />

                            <Select
                                value={status}
                                onChange={handleStatusChange}
                                options={statusOptions}
                                style={{ width: 170 }}
                            />

                            <Button onClick={() => loadCases()}>
                                Làm mới
                            </Button>
                        </Space>
                    </div>

                    {error && (
                        <Alert
                            type="error"
                            showIcon
                            message="Không thể tải case board"
                            description={error}
                            style={{ marginBottom: 16 }}
                        />
                    )}

                    <ClinicalPageState loading={loading}>
                        {cases.length === 0 ? (
                            <ClinicalEmptyState
                                title="Chưa có ca khám"
                                description="Không tìm thấy ca khám nào theo bộ lọc hiện tại."
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
                                                        {item.appointment
                                                            .patientName ||
                                                            'Bệnh nhân'}
                                                    </strong>

                                                    <Space wrap>
                                                        <StatusTag
                                                            value={
                                                                item.appointment
                                                                    .status
                                                            }
                                                        />

                                                        {getCaseUrgencyTag(item)}
                                                    </Space>
                                                </div>

                                                <p>
                                                    Thời gian:{' '}
                                                    <b>
                                                        {formatDateTime(
                                                            item.appointment
                                                                .startTime,
                                                        )}
                                                    </b>{' '}
                                                    →{' '}
                                                    {formatTime(
                                                        item.appointment.endTime,
                                                    )}
                                                </p>

                                                <p>
                                                    Lý do khám:{' '}
                                                    {item.medicalRecord
                                                        ?.chiefComplaint ||
                                                        item.appointment
                                                            .diagnosis ||
                                                        'Chưa có ghi chú khám.'}
                                                </p>

                                                <div className={styles.caseMeta}>
                                                    <span>
                                                        Bệnh án:{' '}
                                                        <b>
                                                            {item.medicalRecord
                                                                ?.status ||
                                                                'Chưa tạo'}
                                                        </b>
                                                    </span>

                                                    <span>
                                                        Chẩn đoán:{' '}
                                                        <b>
                                                            {item.medicalRecord
                                                                ?.diagnoses
                                                                ?.length || 0}
                                                        </b>
                                                    </span>

                                                    <span>
                                                        Đơn thuốc:{' '}
                                                        <b>
                                                            {item.prescription
                                                                ?.status ||
                                                                'Chưa có'}
                                                        </b>
                                                    </span>

                                                    <span>
                                                        Thuốc:{' '}
                                                        <b>
                                                            {item.prescription
                                                                ?.items
                                                                ?.length || 0}
                                                        </b>
                                                    </span>
                                                </div>
                                            </div>

                                            <Space wrap>
                                                {item.prescription ? (
                                                    <Button
                                                        loading={
                                                            checkingId ===
                                                            item.prescription.id
                                                        }
                                                        disabled={
                                                            !canWritePrescription
                                                        }
                                                        onClick={() =>
                                                            handleSafetyCheck(
                                                                item
                                                                    .prescription!
                                                                    .id,
                                                            )
                                                        }
                                                    >
                                                        AI safety
                                                    </Button>
                                                ) : (
                                                    <Button disabled>
                                                        Chưa có đơn thuốc
                                                    </Button>
                                                )}

                                                <Link
                                                    href={`/dashboard/doctor/cases/${item.appointment.id}`}
                                                >
                                                    <Button type="primary">
                                                        Mở ca khám
                                                    </Button>
                                                </Link>
                                            </Space>
                                        </div>

                                        {item.prescription?.safetyAlerts
                                            ?.length ? (
                                            <div className={styles.alertStrip}>
                                                {item.prescription.safetyAlerts.map(
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
                                                            {alert.severity} ·{' '}
                                                            {alert.type}:{' '}
                                                            {alert.title ||
                                                                alert.message}
                                                        </Tag>
                                                    ),
                                                )}
                                            </div>
                                        ) : null}
                                    </List.Item>
                                )}
                            />
                        )}
                    </ClinicalPageState>
                </Card>
            </RoleGuardState>
        </DashboardFrame>
    );
}