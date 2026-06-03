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

type PrescriptionCase = {
    appointment: Appointment;
    medicalRecord?: MedicalRecord;
    prescription?: Prescription;
};

type AppointmentStatusFilter = AppointmentStatus | 'ALL';
type PrescriptionStatusFilter =
    | 'ALL'
    | 'DRAFT'
    | 'FINALIZED'
    | 'CANCELLED'
    | 'HAS_ALERTS'
    | 'HIGH_RISK';

const appointmentStatusOptions: Array<{
    value: AppointmentStatusFilter;
    label: string;
}> = [
        { value: 'ALL', label: 'Tất cả lịch hẹn' },
        { value: 'SCHEDULED', label: 'SCHEDULED' },
        { value: 'CONFIRMED', label: 'CONFIRMED' },
        { value: 'COMPLETED', label: 'COMPLETED' },
        { value: 'CANCELLED', label: 'CANCELLED' },
        { value: 'NO_SHOW', label: 'NO_SHOW' },
    ];

const prescriptionStatusOptions: Array<{
    value: PrescriptionStatusFilter;
    label: string;
}> = [
        { value: 'ALL', label: 'Tất cả đơn thuốc' },
        { value: 'DRAFT', label: 'DRAFT' },
        { value: 'FINALIZED', label: 'FINALIZED' },
        { value: 'CANCELLED', label: 'CANCELLED' },
        { value: 'HAS_ALERTS', label: 'Có cảnh báo AI' },
        { value: 'HIGH_RISK', label: 'Cảnh báo cao/nguy kịch' },
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

function hasSafetyAlerts(prescription?: Prescription) {
    return Boolean(prescription?.safetyAlerts?.length);
}

function hasHighRiskAlerts(prescription?: Prescription) {
    return Boolean(
        prescription?.safetyAlerts?.some((alert) =>
            ['HIGH', 'CRITICAL'].includes(alert.severity),
        ),
    );
}

function getPrescriptionRiskTag(prescription: Prescription) {
    if (hasHighRiskAlerts(prescription)) {
        return <Tag color="red">High risk</Tag>;
    }

    if (hasSafetyAlerts(prescription)) {
        return <Tag color="gold">Có cảnh báo</Tag>;
    }

    return <Tag color="green">Chưa có cảnh báo</Tag>;
}

export default function DoctorPrescriptionsPage() {
    const { session, loading: authLoading } = useAuthSession();

    const [items, setItems] = useState<PrescriptionCase[]>([]);
    const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());
    const [appointmentStatus, setAppointmentStatus] =
        useState<AppointmentStatusFilter>('ALL');
    const [prescriptionStatus, setPrescriptionStatus] =
        useState<PrescriptionStatusFilter>('ALL');

    const [loading, setLoading] = useState(true);
    const [checkingId, setCheckingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const canReadPrescriptions = hasAnyPermission(session, [
        'PRESCRIPTION:READ_ANY',
        'PRESCRIPTION:WRITE',
    ]);

    const canWritePrescriptions = hasAnyPermission(session, [
        'PRESCRIPTION:WRITE',
    ]);

    const loadData = async (
        nextDate = selectedDate,
        nextAppointmentStatus = appointmentStatus,
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
                status: nextAppointmentStatus,
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

            setItems(mapped);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Không thể tải danh sách đơn thuốc.',
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!session) return;

        if (!canReadPrescriptions) {
            setError('Tài khoản hiện tại không có quyền xem đơn thuốc.');
            setLoading(false);
            return;
        }

        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session]);

    const prescriptionCases = useMemo(
        () => items.filter((item) => item.prescription),
        [items],
    );

    const filteredPrescriptionCases = useMemo(() => {
        return prescriptionCases.filter((item) => {
            const prescription = item.prescription!;

            if (prescriptionStatus === 'ALL') return true;

            if (prescriptionStatus === 'HAS_ALERTS') {
                return hasSafetyAlerts(prescription);
            }

            if (prescriptionStatus === 'HIGH_RISK') {
                return hasHighRiskAlerts(prescription);
            }

            return prescription.status === prescriptionStatus;
        });
    }, [prescriptionCases, prescriptionStatus]);

    const metrics = useMemo(() => {
        const total = prescriptionCases.length;

        const draft = prescriptionCases.filter(
            (item) => item.prescription?.status === 'DRAFT',
        ).length;

        const finalized = prescriptionCases.filter(
            (item) => item.prescription?.status === 'FINALIZED',
        ).length;

        const cancelled = prescriptionCases.filter(
            (item) => item.prescription?.status === 'CANCELLED',
        ).length;

        const withAlerts = prescriptionCases.filter((item) =>
            hasSafetyAlerts(item.prescription),
        ).length;

        const highRisk = prescriptionCases.filter((item) =>
            hasHighRiskAlerts(item.prescription),
        ).length;

        return {
            total,
            draft,
            finalized,
            cancelled,
            withAlerts,
            highRisk,
        };
    }, [prescriptionCases]);

    const handleDateChange = (value: Dayjs | null) => {
        const nextDate = value || dayjs();

        setSelectedDate(nextDate);
        loadData(nextDate, appointmentStatus);
    };

    const handleAppointmentStatusChange = (value: AppointmentStatusFilter) => {
        setAppointmentStatus(value);
        loadData(selectedDate, value);
    };

    const handlePrescriptionStatusChange = (
        value: PrescriptionStatusFilter,
    ) => {
        setPrescriptionStatus(value);
    };

    const handleSafetyCheck = async (prescriptionId: string) => {
        try {
            setCheckingId(prescriptionId);

            await runPrescriptionSafetyCheck(prescriptionId);

            message.success('Đã chạy AI safety check.');
            await loadData();
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
            title="Prescription Workspace"
            subtitle="Theo dõi đơn thuốc, trạng thái kê đơn và cảnh báo AI safety"
        >
            <RoleGuardState
                session={session}
                anyPermissions={['PRESCRIPTION:READ_ANY', 'PRESCRIPTION:WRITE']}
            >
                <section className={styles.metricGrid}>
                    <Card className={styles.metricCard}>
                        <Statistic title="Tổng đơn" value={metrics.total} />
                    </Card>

                    <Card className={styles.metricCard}>
                        <Statistic title="Draft" value={metrics.draft} />
                    </Card>

                    <Card className={styles.metricCard}>
                        <Statistic
                            title="Finalized"
                            value={metrics.finalized}
                        />
                    </Card>

                    <Card className={styles.metricCard}>
                        <Statistic
                            title="Cảnh báo cao"
                            value={metrics.highRisk}
                        />
                    </Card>
                </section>

                <Card className={styles.detailCard} style={{ marginTop: 24 }}>
                    <div className={styles.panelHeader}>
                        <div>
                            <span>Prescription board</span>
                            <h2>Đơn thuốc theo ngày khám</h2>
                            <p>
                                Chỉ hiển thị đơn thuốc thuộc các ca khám của bác
                                sĩ đang đăng nhập.
                            </p>
                        </div>

                        <Space wrap>
                            <DatePicker
                                value={selectedDate}
                                onChange={handleDateChange}
                                allowClear={false}
                            />

                            <Select
                                value={appointmentStatus}
                                onChange={handleAppointmentStatusChange}
                                options={appointmentStatusOptions}
                                style={{ width: 190 }}
                            />

                            <Select
                                value={prescriptionStatus}
                                onChange={handlePrescriptionStatusChange}
                                options={prescriptionStatusOptions}
                                style={{ width: 210 }}
                            />

                            <Button onClick={() => loadData()}>
                                Làm mới
                            </Button>
                        </Space>
                    </div>

                    {error && (
                        <Alert
                            type="error"
                            showIcon
                            message="Không thể tải prescription board"
                            description={error}
                            style={{ marginBottom: 16 }}
                        />
                    )}

                    <ClinicalPageState loading={loading}>
                        {filteredPrescriptionCases.length === 0 ? (
                            <ClinicalEmptyState
                                title="Chưa có đơn thuốc"
                                description="Không tìm thấy đơn thuốc nào theo bộ lọc hiện tại."
                            />
                        ) : (
                            <List
                                dataSource={filteredPrescriptionCases}
                                renderItem={(item) => {
                                    const prescription = item.prescription!;

                                    return (
                                        <List.Item className={styles.caseItem}>
                                            <div className={styles.caseContent}>
                                                <div>
                                                    <div
                                                        className={
                                                            styles.listTitle
                                                        }
                                                    >
                                                        <strong>
                                                            {item.appointment
                                                                .patientName ||
                                                                prescription.patientName ||
                                                                'Bệnh nhân'}
                                                        </strong>

                                                        <Space wrap>
                                                            <StatusTag
                                                                value={
                                                                    prescription.status
                                                                }
                                                            />

                                                            {getPrescriptionRiskTag(
                                                                prescription,
                                                            )}
                                                        </Space>
                                                    </div>

                                                    <p>
                                                        Thời gian khám:{' '}
                                                        <b>
                                                            {formatDateTime(
                                                                item.appointment
                                                                    .startTime,
                                                            )}
                                                        </b>{' '}
                                                        →{' '}
                                                        {formatTime(
                                                            item.appointment
                                                                .endTime,
                                                        )}
                                                    </p>

                                                    <p>
                                                        Bệnh án:{' '}
                                                        <b>
                                                            {item.medicalRecord
                                                                ?.status ||
                                                                'Không rõ'}
                                                        </b>{' '}
                                                        · Lịch hẹn:{' '}
                                                        <b>
                                                            {
                                                                item.appointment
                                                                    .status
                                                            }
                                                        </b>
                                                    </p>

                                                    <p>
                                                        Ghi chú đơn thuốc:{' '}
                                                        {prescription.note ||
                                                            'Không có ghi chú.'}
                                                    </p>

                                                    <div
                                                        className={
                                                            styles.caseMeta
                                                        }
                                                    >
                                                        <span>
                                                            Số thuốc:{' '}
                                                            <b>
                                                                {prescription
                                                                    .items
                                                                    ?.length ||
                                                                    0}
                                                            </b>
                                                        </span>

                                                        <span>
                                                            Safety alerts:{' '}
                                                            <b>
                                                                {prescription
                                                                    .safetyAlerts
                                                                    ?.length ||
                                                                    0}
                                                            </b>
                                                        </span>

                                                        <span>
                                                            Finalized:{' '}
                                                            <b>
                                                                {prescription.finalizedAt
                                                                    ? formatDateTime(
                                                                        prescription.finalizedAt,
                                                                    )
                                                                    : 'Chưa'}
                                                            </b>
                                                        </span>
                                                    </div>
                                                </div>

                                                <Space wrap>
                                                    <Button
                                                        loading={
                                                            checkingId ===
                                                            prescription.id
                                                        }
                                                        disabled={
                                                            !canWritePrescriptions ||
                                                            prescription.status ===
                                                            'CANCELLED'
                                                        }
                                                        onClick={() =>
                                                            handleSafetyCheck(
                                                                prescription.id,
                                                            )
                                                        }
                                                    >
                                                        AI safety
                                                    </Button>

                                                    <Link
                                                        href={`/dashboard/doctor/cases/${item.appointment.id}`}
                                                    >
                                                        <Button type="primary">
                                                            Mở ca khám
                                                        </Button>
                                                    </Link>
                                                </Space>
                                            </div>

                                            <DividerLike />

                                            <List
                                                size="small"
                                                dataSource={
                                                    prescription.items || []
                                                }
                                                locale={{
                                                    emptyText:
                                                        'Đơn thuốc chưa có thuốc.',
                                                }}
                                                renderItem={(drug) => (
                                                    <List.Item>
                                                        <List.Item.Meta
                                                            title={
                                                                <span>
                                                                    {
                                                                        drug.medicationName
                                                                    }{' '}
                                                                    {drug.atcCode && (
                                                                        <Tag color="cyan">
                                                                            {
                                                                                drug.atcCode
                                                                            }
                                                                        </Tag>
                                                                    )}
                                                                </span>
                                                            }
                                                            description={
                                                                <div>
                                                                    <p>
                                                                        {drug.dosage ||
                                                                            'N/A'}{' '}
                                                                        ·{' '}
                                                                        {drug.frequency ||
                                                                            'N/A'}{' '}
                                                                        ·{' '}
                                                                        {drug.duration ||
                                                                            'N/A'}{' '}
                                                                        · SL:{' '}
                                                                        {drug.quantity ||
                                                                            0}
                                                                    </p>
                                                                    <p>
                                                                        {drug.instruction ||
                                                                            'Không có hướng dẫn.'}
                                                                    </p>
                                                                </div>
                                                            }
                                                        />
                                                    </List.Item>
                                                )}
                                            />

                                            {prescription.safetyAlerts
                                                ?.length ? (
                                                <div
                                                    className={
                                                        styles.alertStrip
                                                    }
                                                >
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
                                                                · {alert.type}:{' '}
                                                                {alert.title ||
                                                                    alert.message}
                                                            </Tag>
                                                        ),
                                                    )}
                                                </div>
                                            ) : null}
                                        </List.Item>
                                    );
                                }}
                            />
                        )}
                    </ClinicalPageState>
                </Card>
            </RoleGuardState>
        </DashboardFrame>
    );
}

function DividerLike() {
    return (
        <div
            style={{
                height: 1,
                background: 'rgba(16, 32, 31, 0.08)',
                margin: '16px 0',
                width: '100%',
            }}
        />
    );
}