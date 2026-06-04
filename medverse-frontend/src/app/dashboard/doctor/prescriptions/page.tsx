'use client';

import {
    Alert,
    Button,
    Card,
    DatePicker,
    Descriptions,
    Drawer,
    Input,
    List,
    Select,
    Skeleton,
    Space,
    Statistic,
    Tag,
    message,
} from 'antd';
import {
    CalendarOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    EyeOutlined,
    FileProtectOutlined,
    MedicineBoxOutlined,
    ReloadOutlined,
    SafetyCertificateOutlined,
    SearchOutlined,
    UserOutlined,
    WarningOutlined,
} from '@ant-design/icons';
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
    PrescriptionItem,
} from '@/types/clinical';
import styles from '../../dashboard.module.scss';

type AppointmentStatusFilter = AppointmentStatus | 'ALL' | string;

type PrescriptionStatusFilter =
    | 'ALL'
    | 'DRAFT'
    | 'FINALIZED'
    | 'CANCELLED'
    | 'HAS_ALERTS'
    | 'HIGH_RISK'
    | string;

type AppointmentView = Appointment & {
    id: string;
    patientId?: string;
    patientName?: string;
    patientEmail?: string;
    patientPhone?: string;
    doctorId?: string;
    doctorName?: string;
    specialtyName?: string;
    startTime?: string;
    endTime?: string;
    scheduledAt?: string;
    appointmentDate?: string;
    appointmentTime?: string;
    type?: string;
    roomName?: string;
    location?: string;
    meetingUrl?: string;
    reason?: string;
    symptoms?: string;
    note?: string;
    status?: string;
    createdAt?: string;
};

type MedicalRecordView = MedicalRecord & {
    id: string;
    status?: string;
    chiefComplaint?: string;
    symptoms?: string;
    clinicalNote?: string;
    diagnosisText?: string;
    diagnosisSummary?: string;
    treatmentPlan?: string;
    followUpNote?: string;
    doctorAdvice?: string;
    createdAt?: string;
    updatedAt?: string;
    completedAt?: string;
};

type SafetyAlertView = {
    id?: string;
    severity?: string;
    type?: string;
    title?: string;
    message?: string;
    description?: string;
};

type PrescriptionItemView = PrescriptionItem & {
    id?: string;
    medicationName?: string;
    medicineName?: string;
    name?: string;
    dosage?: string;
    frequency?: string;
    duration?: string;
    quantity?: number;
    instruction?: string;
};

type PrescriptionView = Prescription & {
    id: string;
    status?: string;
    note?: string;
    safetyLevel?: string;
    safetySummary?: string;
    safetyAlerts?: SafetyAlertView[];
    safetyWarnings?: string[];
    items?: PrescriptionItemView[];
    prescriptionItems?: PrescriptionItemView[];
    createdAt?: string;
    updatedAt?: string;
    finalizedAt?: string;
    cancelledAt?: string;
};

type PrescriptionCase = {
    appointment: AppointmentView;
    medicalRecord?: MedicalRecordView;
    prescription?: PrescriptionView;
};

const appointmentStatusOptions: Array<{
    value: AppointmentStatusFilter;
    label: string;
}> = [
        { value: 'ALL', label: 'Tất cả lịch khám' },
        { value: 'SCHEDULED', label: 'Đã lên lịch' },
        { value: 'CONFIRMED', label: 'Đã xác nhận' },
        { value: 'COMPLETED', label: 'Đã hoàn thành' },
        { value: 'CANCELLED', label: 'Đã hủy' },
        { value: 'NO_SHOW', label: 'Không đến khám' },
    ];

const prescriptionStatusOptions: Array<{
    value: PrescriptionStatusFilter;
    label: string;
}> = [
        { value: 'ALL', label: 'Tất cả đơn thuốc' },
        { value: 'DRAFT', label: 'Đơn nháp' },
        { value: 'FINALIZED', label: 'Đã hoàn tất' },
        { value: 'CANCELLED', label: 'Đã hủy' },
        { value: 'HAS_ALERTS', label: 'Có cảnh báo' },
        { value: 'HIGH_RISK', label: 'Nguy cơ cao' },
    ];

function normalizeKeyword(value?: string) {
    return String(value || '')
        .trim()
        .toLowerCase();
}

function getDayRange(date: Dayjs) {
    return {
        from: date.startOf('day').toISOString(),
        to: date.endOf('day').toISOString(),
    };
}

function formatDateTime(value?: string) {
    if (!value) return 'Chưa ghi nhận';

    const parsed = dayjs(value);

    if (!parsed.isValid()) return value;

    return parsed.format('DD/MM/YYYY HH:mm');
}

function formatTime(value?: string) {
    if (!value) return 'Chưa rõ';

    const parsed = dayjs(value);

    if (!parsed.isValid()) return value;

    return parsed.format('HH:mm');
}

function getAppointmentStart(appointment: AppointmentView) {
    return (
        appointment.startTime ||
        appointment.scheduledAt ||
        appointment.appointmentDate ||
        appointment.createdAt
    );
}

function getAppointmentTimeLabel(appointment: AppointmentView) {
    if (appointment.appointmentDate) {
        const date = dayjs(appointment.appointmentDate);

        return `${date.isValid() ? date.format('DD/MM/YYYY') : appointment.appointmentDate} · ${appointment.appointmentTime || 'Chưa rõ giờ'
            }`;
    }

    return formatDateTime(getAppointmentStart(appointment));
}

function getAppointmentPlace(appointment: AppointmentView) {
    const type = String(appointment.type || 'OFFLINE').toUpperCase();

    if (type === 'ONLINE') {
        return appointment.meetingUrl || 'Khám trực tuyến';
    }

    return appointment.roomName || appointment.location || 'Phòng khám';
}

function getAppointmentTypeLabel(value?: string) {
    const type = String(value || 'OFFLINE').toUpperCase();

    if (type === 'ONLINE') return 'Khám online';

    return 'Khám trực tiếp';
}

function getPatientName(item: PrescriptionCase) {
    return item.appointment.patientName || 'Bệnh nhân';
}

function getPatientContact(item: PrescriptionCase) {
    return [
        item.appointment.patientEmail,
        item.appointment.patientPhone,
    ]
        .filter(Boolean)
        .join(' · ');
}

function getCaseReason(item: PrescriptionCase) {
    return (
        item.medicalRecord?.chiefComplaint ||
        item.medicalRecord?.symptoms ||
        item.appointment.symptoms ||
        item.appointment.reason ||
        item.appointment.note ||
        'Chưa có ghi chú khám.'
    );
}

function getDiagnosisText(item: PrescriptionCase) {
    return (
        item.medicalRecord?.diagnosisSummary ||
        item.medicalRecord?.diagnosisText ||
        item.medicalRecord?.clinicalNote ||
        'Chưa cập nhật chẩn đoán.'
    );
}

function getPrescriptionItems(prescription?: PrescriptionView) {
    if (!prescription) return [];

    return (
        prescription.items ||
        prescription.prescriptionItems ||
        []
    ) as PrescriptionItemView[];
}

function getMedicationName(item: PrescriptionItemView) {
    return (
        item.medicationName ||
        item.medicineName ||
        item.name ||
        'Thuốc chưa cập nhật tên'
    );
}

function getSafetyAlerts(prescription?: PrescriptionView) {
    return prescription?.safetyAlerts || [];
}

function getSafetyWarnings(prescription?: PrescriptionView) {
    return prescription?.safetyWarnings || [];
}

function hasSafetyAlerts(prescription?: PrescriptionView) {
    return (
        getSafetyAlerts(prescription).length > 0 ||
        getSafetyWarnings(prescription).length > 0 ||
        Boolean(prescription?.safetySummary)
    );
}

function hasHighRiskAlerts(prescription?: PrescriptionView) {
    const safetyLevel = String(prescription?.safetyLevel || '').toUpperCase();

    if (['HIGH', 'CRITICAL'].includes(safetyLevel)) return true;

    return getSafetyAlerts(prescription).some((alert) =>
        ['HIGH', 'CRITICAL'].includes(String(alert.severity || '').toUpperCase()),
    );
}

function getPrescriptionRiskTag(prescription?: PrescriptionView) {
    if (!prescription) return <Tag>Chưa có đơn</Tag>;

    if (hasHighRiskAlerts(prescription)) {
        return <Tag color="red">Nguy cơ cao</Tag>;
    }

    if (hasSafetyAlerts(prescription)) {
        return <Tag color="gold">Có cảnh báo</Tag>;
    }

    return <Tag color="green">An toàn tương đối</Tag>;
}

function getPrescriptionTone(item: PrescriptionCase) {
    const prescription = item.prescription;

    if (!prescription) {
        return {
            color: '#64748b',
            label: 'Chưa có đơn thuốc',
        };
    }

    if (hasHighRiskAlerts(prescription)) {
        return {
            color: '#ef4444',
            label: 'Cần kiểm tra cảnh báo thuốc',
        };
    }

    if (String(prescription.status || '').toUpperCase() === 'DRAFT') {
        return {
            color: '#f59e0b',
            label: 'Đơn thuốc đang nháp',
        };
    }

    if (String(prescription.status || '').toUpperCase() === 'CANCELLED') {
        return {
            color: '#64748b',
            label: 'Đơn thuốc đã hủy',
        };
    }

    return {
        color: '#16a34a',
        label: 'Đơn thuốc đã hoàn tất',
    };
}

function sortCases(a: PrescriptionCase, b: PrescriptionCase) {
    return String(getAppointmentStart(a.appointment) || '').localeCompare(
        String(getAppointmentStart(b.appointment) || ''),
    );
}

export default function DoctorPrescriptionsPage() {
    const { session, loading: authLoading } = useAuthSession();

    const [items, setItems] = useState<PrescriptionCase[]>([]);
    const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());
    const [appointmentStatus, setAppointmentStatus] =
        useState<AppointmentStatusFilter>('ALL');
    const [prescriptionStatus, setPrescriptionStatus] =
        useState<PrescriptionStatusFilter>('ALL');
    const [keyword, setKeyword] = useState('');

    const [selectedCase, setSelectedCase] = useState<PrescriptionCase | null>(
        null,
    );
    const [detailOpen, setDetailOpen] = useState(false);

    const [loading, setLoading] = useState(true);
    const [checkingId, setCheckingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const canReadPrescriptions = session
        ? hasAnyPermission(session, [
            'PRESCRIPTION:READ_ANY',
            'PRESCRIPTION:WRITE',
        ])
        : false;

    const canWritePrescriptions = session
        ? hasAnyPermission(session, ['PRESCRIPTION:WRITE'])
        : false;

    const prescriptionCases = useMemo(
        () => items.filter((item) => item.prescription),
        [items],
    );

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

            const appointments = Array.isArray(appointmentPage)
                ? appointmentPage
                : appointmentPage?.content || [];

            const mapped = await Promise.all(
                appointments.map(async (appointment) => {
                    const currentAppointment = appointment as AppointmentView;

                    try {
                        const medicalRecord =
                            await getMedicalRecordByAppointment(
                                currentAppointment.id,
                            );

                        try {
                            const prescription =
                                await getPrescriptionByMedicalRecord(
                                    medicalRecord.id,
                                );

                            return {
                                appointment: currentAppointment,
                                medicalRecord:
                                    medicalRecord as MedicalRecordView,
                                prescription:
                                    prescription as PrescriptionView,
                            };
                        } catch {
                            return {
                                appointment: currentAppointment,
                                medicalRecord:
                                    medicalRecord as MedicalRecordView,
                            };
                        }
                    } catch {
                        return {
                            appointment: currentAppointment,
                        };
                    }
                }),
            );

            setItems(mapped.sort(sortCases));
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

    const filteredPrescriptionCases = useMemo(() => {
        const search = normalizeKeyword(keyword);

        return prescriptionCases.filter((item) => {
            const prescription = item.prescription!;

            let matchPrescriptionStatus = true;

            if (prescriptionStatus === 'HAS_ALERTS') {
                matchPrescriptionStatus = hasSafetyAlerts(prescription);
            } else if (prescriptionStatus === 'HIGH_RISK') {
                matchPrescriptionStatus = hasHighRiskAlerts(prescription);
            } else if (prescriptionStatus !== 'ALL') {
                matchPrescriptionStatus =
                    String(prescription.status || '').toUpperCase() ===
                    prescriptionStatus;
            }

            const medicationText = getPrescriptionItems(prescription)
                .map((drug) => getMedicationName(drug))
                .join(' ');

            const searchText = [
                item.appointment.patientName,
                item.appointment.patientEmail,
                item.appointment.patientPhone,
                item.appointment.specialtyName,
                item.appointment.reason,
                item.appointment.symptoms,
                item.appointment.note,
                item.medicalRecord?.chiefComplaint,
                item.medicalRecord?.symptoms,
                item.medicalRecord?.diagnosisText,
                item.medicalRecord?.diagnosisSummary,
                item.medicalRecord?.treatmentPlan,
                prescription.note,
                prescription.status,
                prescription.safetyLevel,
                prescription.safetySummary,
                medicationText,
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();

            const matchKeyword = !search || searchText.includes(search);

            return matchPrescriptionStatus && matchKeyword;
        });
    }, [prescriptionCases, prescriptionStatus, keyword]);

    const metrics = useMemo(() => {
        const total = prescriptionCases.length;

        const draft = prescriptionCases.filter(
            (item) =>
                String(item.prescription?.status || '').toUpperCase() === 'DRAFT',
        ).length;

        const finalized = prescriptionCases.filter((item) =>
            ['FINALIZED', 'DISPENSED', 'COMPLETED'].includes(
                String(item.prescription?.status || '').toUpperCase(),
            ),
        ).length;

        const cancelled = prescriptionCases.filter(
            (item) =>
                String(item.prescription?.status || '').toUpperCase() ===
                'CANCELLED',
        ).length;

        const withAlerts = prescriptionCases.filter((item) =>
            hasSafetyAlerts(item.prescription),
        ).length;

        const highRisk = prescriptionCases.filter((item) =>
            hasHighRiskAlerts(item.prescription),
        ).length;

        const medicationCount = prescriptionCases.reduce(
            (totalCount, item) =>
                totalCount + getPrescriptionItems(item.prescription).length,
            0,
        );

        return {
            total,
            draft,
            finalized,
            cancelled,
            withAlerts,
            highRisk,
            medicationCount,
        };
    }, [prescriptionCases]);

    const focusPrescriptions = useMemo(() => {
        return [...prescriptionCases]
            .sort((a, b) => {
                const aWeight = hasHighRiskAlerts(a.prescription)
                    ? 0
                    : String(a.prescription?.status || '').toUpperCase() ===
                        'DRAFT'
                        ? 1
                        : hasSafetyAlerts(a.prescription)
                            ? 2
                            : 3;

                const bWeight = hasHighRiskAlerts(b.prescription)
                    ? 0
                    : String(b.prescription?.status || '').toUpperCase() ===
                        'DRAFT'
                        ? 1
                        : hasSafetyAlerts(b.prescription)
                            ? 2
                            : 3;

                return aWeight - bWeight;
            })
            .slice(0, 4);
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

    const handleResetFilter = () => {
        const today = dayjs();

        setKeyword('');
        setAppointmentStatus('ALL');
        setPrescriptionStatus('ALL');
        setSelectedDate(today);

        loadData(today, 'ALL');
    };

    const handleSafetyCheck = async (prescriptionId: string) => {
        try {
            setCheckingId(prescriptionId);

            await runPrescriptionSafetyCheck(prescriptionId);

            message.success('Đã chạy kiểm tra an toàn đơn thuốc.');
            await loadData();
        } catch (err) {
            message.error(
                err instanceof Error
                    ? err.message
                    : 'Không thể chạy kiểm tra an toàn.',
            );
        } finally {
            setCheckingId(null);
        }
    };

    const openDetail = (item: PrescriptionCase) => {
        setSelectedCase(item);
        setDetailOpen(true);
    };

    if (authLoading || !session) {
        return <Skeleton active paragraph={{ rows: 8 }} />;
    }

    return (
        <DashboardFrame
            session={session}
            title="Đơn thuốc"
            subtitle="Theo dõi đơn thuốc theo ca khám, trạng thái và cảnh báo an toàn"
        >
            <RoleGuardState
                session={session}
                anyPermissions={['PRESCRIPTION:READ_ANY', 'PRESCRIPTION:WRITE']}
            >
                <div className={styles.roleDashboard}>
                    <section className={styles.heroCard}>
                        <div>
                            <span>Prescription Board</span>
                            <h2>Quản lý đơn thuốc theo từng ca khám.</h2>
                            <p>
                                Trang này giúp bác sĩ theo dõi đơn nháp, đơn đã
                                hoàn tất, cảnh báo an toàn thuốc và mở lại ca khám
                                để chỉnh sửa khi cần.
                            </p>

                            <Space wrap style={{ marginTop: 20 }}>
                                <Button
                                    type="primary"
                                    icon={<ReloadOutlined />}
                                    loading={loading}
                                    onClick={() => loadData()}
                                >
                                    Làm mới
                                </Button>
                            </Space>
                        </div>

                        <div className={styles.pulseCard}>
                            <strong>{metrics.total}</strong>
                            <span>đơn thuốc theo bộ lọc</span>
                        </div>
                    </section>

                    <section className={styles.metricGrid}>
                        <Card className={styles.metricCard}>
                            <Statistic
                                title="Tổng đơn thuốc"
                                value={metrics.total}
                                prefix={<MedicineBoxOutlined />}
                            />
                            <p>Đơn thuốc phát sinh từ ca khám trong ngày.</p>
                        </Card>

                        <Card className={styles.metricCard}>
                            <Statistic
                                title="Đơn nháp"
                                value={metrics.draft}
                                prefix={<ClockCircleOutlined />}
                            />
                            <p>Cần kiểm tra và hoàn tất trước khi đóng ca.</p>
                        </Card>

                        <Card className={styles.metricCard}>
                            <Statistic
                                title="Đã hoàn tất"
                                value={metrics.finalized}
                                prefix={<CheckCircleOutlined />}
                            />
                            <p>Đơn thuốc đã sẵn sàng cho bệnh nhân.</p>
                        </Card>

                        <Card className={styles.metricCard}>
                            <Statistic
                                title="Cảnh báo cao"
                                value={metrics.highRisk}
                                prefix={<WarningOutlined />}
                            />
                            <p>Cần bác sĩ kiểm tra kỹ trước khi dùng thuốc.</p>
                        </Card>
                    </section>

                    <section className={styles.detailGrid}>
                        <Card
                            className={styles.detailCard}
                            title="Đơn thuốc cần chú ý"
                        >
                            {focusPrescriptions.length === 0 ? (
                                <ClinicalEmptyState
                                    title="Chưa có đơn thuốc"
                                    description="Các đơn thuốc từ ca khám sẽ xuất hiện tại đây."
                                />
                            ) : (
                                <Space
                                    direction="vertical"
                                    size={12}
                                    style={{ width: '100%' }}
                                >
                                    {focusPrescriptions.map((item) => {
                                        const tone = getPrescriptionTone(item);
                                        const prescription = item.prescription!;

                                        return (
                                            <article
                                                key={prescription.id}
                                                className={styles.cleanListItem}
                                                style={{
                                                    borderRadius: 18,
                                                    padding: 16,
                                                    border: '1px solid #e5e7eb',
                                                }}
                                            >
                                                <div className={styles.listTitle}>
                                                    <Space wrap>
                                                        <span
                                                            style={{
                                                                width: 36,
                                                                height: 36,
                                                                borderRadius: 999,
                                                                display:
                                                                    'inline-flex',
                                                                alignItems:
                                                                    'center',
                                                                justifyContent:
                                                                    'center',
                                                                color: tone.color,
                                                                background:
                                                                    '#f8fafc',
                                                                border:
                                                                    '1px solid #e2e8f0',
                                                            }}
                                                        >
                                                            <MedicineBoxOutlined />
                                                        </span>

                                                        <strong>
                                                            {getPatientName(item)}
                                                        </strong>
                                                    </Space>

                                                    <Space wrap>
                                                        <StatusTag
                                                            value={
                                                                prescription.status ||
                                                                'DRAFT'
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
                                                        {getAppointmentTimeLabel(
                                                            item.appointment,
                                                        )}
                                                    </b>
                                                </p>

                                                <p>{getDiagnosisText(item)}</p>

                                                <Space wrap>
                                                    <Button
                                                        size="small"
                                                        icon={<EyeOutlined />}
                                                        onClick={() =>
                                                            openDetail(item)
                                                        }
                                                    >
                                                        Chi tiết
                                                    </Button>

                                                    <Button
                                                        size="small"
                                                        icon={
                                                            <SafetyCertificateOutlined />
                                                        }
                                                        loading={
                                                            checkingId ===
                                                            prescription.id
                                                        }
                                                        disabled={
                                                            !canWritePrescriptions
                                                        }
                                                        onClick={() =>
                                                            handleSafetyCheck(
                                                                prescription.id,
                                                            )
                                                        }
                                                    >
                                                        Kiểm tra thuốc
                                                    </Button>

                                                    <Link
                                                        href={`/dashboard/doctor/cases/${item.appointment.id}`}
                                                    >
                                                        <Button
                                                            size="small"
                                                            type="primary"
                                                            icon={
                                                                <FileProtectOutlined />
                                                            }
                                                        >
                                                            Mở ca khám
                                                        </Button>
                                                    </Link>
                                                </Space>
                                            </article>
                                        );
                                    })}
                                </Space>
                            )}
                        </Card>

                        <Card
                            className={styles.detailCard}
                            title="Tổng quan đơn thuốc"
                        >
                            <Space
                                direction="vertical"
                                size={12}
                                style={{ width: '100%' }}
                            >
                                <Alert
                                    type="info"
                                    showIcon
                                    message={`${metrics.draft} đơn thuốc đang nháp`}
                                    description="Các đơn nháp cần được hoàn tất hoặc hủy trước khi kết thúc ca khám."
                                />

                                <Alert
                                    type="success"
                                    showIcon
                                    message={`${metrics.finalized} đơn thuốc đã hoàn tất`}
                                    description="Bệnh nhân có thể xem đơn thuốc đã hoàn tất trong Patient Portal."
                                />

                                <Alert
                                    type="warning"
                                    showIcon
                                    message={`${metrics.withAlerts} đơn thuốc có cảnh báo`}
                                    description="Hãy chạy kiểm tra an toàn nếu đơn thuốc có nhiều loại thuốc hoặc bệnh nhân có dị ứng."
                                />

                                <Alert
                                    type="error"
                                    showIcon
                                    message={`${metrics.highRisk} cảnh báo nguy cơ cao`}
                                    description="Cần xử lý các cảnh báo HIGH/CRITICAL trước khi hoàn tất đơn thuốc."
                                />
                            </Space>
                        </Card>
                    </section>

                    <Card className={styles.detailCard}>
                        <div className={styles.panelHeader}>
                            <div>
                                <span>Prescription list</span>
                                <h2>Danh sách đơn thuốc</h2>
                                <p>
                                    Tìm kiếm theo bệnh nhân, chẩn đoán, thuốc,
                                    trạng thái đơn và cảnh báo an toàn.
                                </p>
                            </div>

                            <Button
                                icon={<ReloadOutlined />}
                                loading={loading}
                                onClick={() => loadData()}
                            >
                                Làm mới
                            </Button>
                        </div>

                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns:
                                    'minmax(260px, 1fr) 180px 210px 210px auto',
                                gap: 12,
                                marginTop: 20,
                                marginBottom: 20,
                            }}
                        >
                            <Input
                                allowClear
                                prefix={<SearchOutlined />}
                                placeholder="Tìm bệnh nhân, chẩn đoán, thuốc, ghi chú"
                                value={keyword}
                                onChange={(event) =>
                                    setKeyword(event.target.value)
                                }
                            />

                            <DatePicker
                                value={selectedDate}
                                onChange={handleDateChange}
                                allowClear={false}
                            />

                            <Select
                                value={appointmentStatus}
                                onChange={handleAppointmentStatusChange}
                                options={appointmentStatusOptions}
                            />

                            <Select
                                value={prescriptionStatus}
                                onChange={setPrescriptionStatus}
                                options={prescriptionStatusOptions}
                            />

                            <Button onClick={handleResetFilter}>Đặt lại</Button>
                        </div>

                        {error && (
                            <Alert
                                type="error"
                                showIcon
                                message="Không thể tải đơn thuốc"
                                description={error}
                                style={{ marginBottom: 16 }}
                            />
                        )}

                        <ClinicalPageState loading={loading}>
                            {filteredPrescriptionCases.length === 0 ? (
                                <ClinicalEmptyState
                                    title="Không có đơn thuốc phù hợp"
                                    description="Không tìm thấy đơn thuốc nào theo bộ lọc hiện tại."
                                />
                            ) : (
                                <List
                                    dataSource={filteredPrescriptionCases}
                                    renderItem={(item) => {
                                        const prescription = item.prescription!;
                                        const tone = getPrescriptionTone(item);
                                        const drugs =
                                            getPrescriptionItems(prescription);

                                        return (
                                            <List.Item
                                                className={styles.cleanListItem}
                                            >
                                                <List.Item.Meta
                                                    title={
                                                        <div
                                                            className={
                                                                styles.listTitle
                                                            }
                                                        >
                                                            <Space wrap>
                                                                <span
                                                                    style={{
                                                                        width: 36,
                                                                        height: 36,
                                                                        borderRadius:
                                                                            999,
                                                                        display:
                                                                            'inline-flex',
                                                                        alignItems:
                                                                            'center',
                                                                        justifyContent:
                                                                            'center',
                                                                        color:
                                                                            tone.color,
                                                                        background:
                                                                            '#f8fafc',
                                                                        border:
                                                                            '1px solid #e2e8f0',
                                                                    }}
                                                                >
                                                                    <UserOutlined />
                                                                </span>

                                                                <strong>
                                                                    {getPatientName(
                                                                        item,
                                                                    )}
                                                                </strong>
                                                            </Space>

                                                            <Space wrap>
                                                                <StatusTag
                                                                    value={
                                                                        prescription.status ||
                                                                        'DRAFT'
                                                                    }
                                                                />
                                                                {getPrescriptionRiskTag(
                                                                    prescription,
                                                                )}
                                                                <Tag color="cyan">
                                                                    {drugs.length}{' '}
                                                                    thuốc
                                                                </Tag>
                                                            </Space>
                                                        </div>
                                                    }
                                                    description={
                                                        <div>
                                                            <p>
                                                                Thời gian khám:{' '}
                                                                <b>
                                                                    {getAppointmentTimeLabel(
                                                                        item.appointment,
                                                                    )}
                                                                </b>{' '}
                                                                →{' '}
                                                                {formatTime(
                                                                    item
                                                                        .appointment
                                                                        .endTime,
                                                                )}
                                                            </p>

                                                            <p>
                                                                Hình thức / địa điểm:{' '}
                                                                <b>
                                                                    {getAppointmentTypeLabel(
                                                                        item
                                                                            .appointment
                                                                            .type,
                                                                    )}
                                                                    {' · '}
                                                                    {getAppointmentPlace(
                                                                        item.appointment,
                                                                    )}
                                                                </b>
                                                            </p>

                                                            <p>
                                                                Chẩn đoán:{' '}
                                                                {getDiagnosisText(
                                                                    item,
                                                                )}
                                                            </p>

                                                            <p>
                                                                Ghi chú đơn thuốc:{' '}
                                                                {prescription.note ||
                                                                    'Chưa có ghi chú.'}
                                                            </p>

                                                            {drugs.length > 0 && (
                                                                <Space
                                                                    wrap
                                                                    style={{
                                                                        marginTop: 8,
                                                                    }}
                                                                >
                                                                    {drugs
                                                                        .slice(0, 4)
                                                                        .map(
                                                                            (
                                                                                drug,
                                                                                index,
                                                                            ) => (
                                                                                <Tag
                                                                                    key={
                                                                                        drug.id ||
                                                                                        `${getMedicationName(
                                                                                            drug,
                                                                                        )}-${index}`
                                                                                    }
                                                                                    color="blue"
                                                                                >
                                                                                    {getMedicationName(
                                                                                        drug,
                                                                                    )}
                                                                                </Tag>
                                                                            ),
                                                                        )}

                                                                    {drugs.length >
                                                                        4 && (
                                                                            <Tag>
                                                                                +
                                                                                {drugs.length -
                                                                                    4}
                                                                            </Tag>
                                                                        )}
                                                                </Space>
                                                            )}

                                                            {prescription.safetySummary && (
                                                                <Alert
                                                                    type={
                                                                        hasHighRiskAlerts(
                                                                            prescription,
                                                                        )
                                                                            ? 'warning'
                                                                            : 'info'
                                                                    }
                                                                    showIcon
                                                                    style={{
                                                                        marginTop: 12,
                                                                    }}
                                                                    message="Tóm tắt kiểm tra an toàn"
                                                                    description={
                                                                        prescription.safetySummary
                                                                    }
                                                                />
                                                            )}
                                                        </div>
                                                    }
                                                />

                                                <Space wrap>
                                                    <Button
                                                        icon={<EyeOutlined />}
                                                        onClick={() =>
                                                            openDetail(item)
                                                        }
                                                    >
                                                        Chi tiết
                                                    </Button>

                                                    <Button
                                                        icon={
                                                            <SafetyCertificateOutlined />
                                                        }
                                                        loading={
                                                            checkingId ===
                                                            prescription.id
                                                        }
                                                        disabled={
                                                            !canWritePrescriptions
                                                        }
                                                        onClick={() =>
                                                            handleSafetyCheck(
                                                                prescription.id,
                                                            )
                                                        }
                                                    >
                                                        Kiểm tra thuốc
                                                    </Button>

                                                    <Link
                                                        href={`/dashboard/doctor/cases/${item.appointment.id}`}
                                                    >
                                                        <Button
                                                            type="primary"
                                                            icon={
                                                                <CheckCircleOutlined />
                                                            }
                                                        >
                                                            Mở ca khám
                                                        </Button>
                                                    </Link>
                                                </Space>
                                            </List.Item>
                                        );
                                    }}
                                />
                            )}
                        </ClinicalPageState>
                    </Card>
                </div>

                <Drawer
                    title="Chi tiết đơn thuốc"
                    open={detailOpen}
                    width={760}
                    onClose={() => setDetailOpen(false)}
                    extra={
                        selectedCase && (
                            <Link
                                href={`/dashboard/doctor/cases/${selectedCase.appointment.id}`}
                            >
                                <Button
                                    type="primary"
                                    icon={<CheckCircleOutlined />}
                                >
                                    Mở ca khám
                                </Button>
                            </Link>
                        )
                    }
                >
                    {selectedCase?.prescription && (
                        <Space
                            direction="vertical"
                            size={20}
                            style={{ width: '100%' }}
                        >
                            <Descriptions
                                bordered
                                column={1}
                                size="small"
                                title={getPatientName(selectedCase)}
                            >
                                <Descriptions.Item label="Trạng thái đơn thuốc">
                                    <Space wrap>
                                        <StatusTag
                                            value={
                                                selectedCase.prescription.status ||
                                                'DRAFT'
                                            }
                                        />
                                        {getPrescriptionRiskTag(
                                            selectedCase.prescription,
                                        )}
                                    </Space>
                                </Descriptions.Item>

                                <Descriptions.Item label="Bệnh nhân">
                                    {getPatientName(selectedCase)}
                                </Descriptions.Item>

                                <Descriptions.Item label="Liên hệ">
                                    {getPatientContact(selectedCase) ||
                                        'Chưa cập nhật'}
                                </Descriptions.Item>

                                <Descriptions.Item label="Thời gian khám">
                                    {getAppointmentTimeLabel(
                                        selectedCase.appointment,
                                    )}
                                </Descriptions.Item>

                                <Descriptions.Item label="Hình thức">
                                    {getAppointmentTypeLabel(
                                        selectedCase.appointment.type,
                                    )}
                                </Descriptions.Item>

                                <Descriptions.Item label="Địa điểm / link khám">
                                    {getAppointmentPlace(
                                        selectedCase.appointment,
                                    )}
                                </Descriptions.Item>

                                <Descriptions.Item label="Chẩn đoán">
                                    {getDiagnosisText(selectedCase)}
                                </Descriptions.Item>

                                <Descriptions.Item label="Kế hoạch điều trị">
                                    {selectedCase.medicalRecord?.treatmentPlan ||
                                        'Chưa cập nhật'}
                                </Descriptions.Item>

                                <Descriptions.Item label="Dặn dò / tái khám">
                                    {selectedCase.medicalRecord?.followUpNote ||
                                        selectedCase.medicalRecord?.doctorAdvice ||
                                        'Chưa cập nhật'}
                                </Descriptions.Item>

                                <Descriptions.Item label="Ghi chú đơn thuốc">
                                    {selectedCase.prescription.note ||
                                        'Chưa có ghi chú'}
                                </Descriptions.Item>

                                <Descriptions.Item label="Ngày tạo">
                                    {formatDateTime(
                                        selectedCase.prescription.createdAt,
                                    )}
                                </Descriptions.Item>

                                <Descriptions.Item label="Cập nhật gần nhất">
                                    {formatDateTime(
                                        selectedCase.prescription.updatedAt,
                                    )}
                                </Descriptions.Item>

                                <Descriptions.Item label="Ngày hoàn tất">
                                    {formatDateTime(
                                        selectedCase.prescription.finalizedAt,
                                    )}
                                </Descriptions.Item>
                            </Descriptions>

                            <section>
                                <h3 style={{ marginBottom: 12 }}>
                                    Thuốc trong đơn
                                </h3>

                                {getPrescriptionItems(
                                    selectedCase.prescription,
                                ).length === 0 ? (
                                    <Alert
                                        type="info"
                                        showIcon
                                        message="Đơn thuốc chưa có thuốc"
                                    />
                                ) : (
                                    <List
                                        dataSource={getPrescriptionItems(
                                            selectedCase.prescription,
                                        )}
                                        renderItem={(drug, index) => (
                                            <List.Item
                                                className={styles.cleanListItem}
                                            >
                                                <List.Item.Meta
                                                    title={
                                                        <Space wrap>
                                                            <strong>
                                                                {index + 1}.{' '}
                                                                {getMedicationName(
                                                                    drug,
                                                                )}
                                                            </strong>
                                                            <Tag color="blue">
                                                                {drug.quantity ||
                                                                    0}{' '}
                                                                đơn vị
                                                            </Tag>
                                                        </Space>
                                                    }
                                                    description={
                                                        <div>
                                                            <p>
                                                                Liều:{' '}
                                                                <b>
                                                                    {drug.dosage ||
                                                                        'N/A'}
                                                                </b>{' '}
                                                                · Tần suất:{' '}
                                                                <b>
                                                                    {drug.frequency ||
                                                                        'N/A'}
                                                                </b>{' '}
                                                                · Thời gian:{' '}
                                                                <b>
                                                                    {drug.duration ||
                                                                        'N/A'}
                                                                </b>
                                                            </p>

                                                            <p>
                                                                Hướng dẫn:{' '}
                                                                {drug.instruction ||
                                                                    'Chưa có hướng dẫn'}
                                                            </p>
                                                        </div>
                                                    }
                                                />
                                            </List.Item>
                                        )}
                                    />
                                )}
                            </section>

                            <section>
                                <h3 style={{ marginBottom: 12 }}>
                                    Kiểm tra an toàn
                                </h3>

                                {selectedCase.prescription.safetySummary && (
                                    <Alert
                                        type={
                                            hasHighRiskAlerts(
                                                selectedCase.prescription,
                                            )
                                                ? 'warning'
                                                : 'info'
                                        }
                                        showIcon
                                        message="Tóm tắt kiểm tra"
                                        description={
                                            selectedCase.prescription
                                                .safetySummary
                                        }
                                        style={{ marginBottom: 12 }}
                                    />
                                )}

                                {getSafetyAlerts(selectedCase.prescription)
                                    .length === 0 &&
                                    getSafetyWarnings(selectedCase.prescription)
                                        .length === 0 ? (
                                    <Alert
                                        type="success"
                                        showIcon
                                        message="Chưa ghi nhận cảnh báo an toàn"
                                        description="Bạn có thể chạy kiểm tra an toàn để cập nhật lại kết quả mới nhất."
                                    />
                                ) : (
                                    <Space wrap>
                                        {getSafetyAlerts(
                                            selectedCase.prescription,
                                        ).map((alert, index) => (
                                            <Tag
                                                key={
                                                    alert.id ||
                                                    `${alert.severity}-${index}`
                                                }
                                                color={
                                                    [
                                                        'HIGH',
                                                        'CRITICAL',
                                                    ].includes(
                                                        String(
                                                            alert.severity || '',
                                                        ).toUpperCase(),
                                                    )
                                                        ? 'red'
                                                        : 'gold'
                                                }
                                            >
                                                {alert.severity || 'ALERT'} ·{' '}
                                                {alert.type || 'Safety'}:{' '}
                                                {alert.title ||
                                                    alert.message ||
                                                    alert.description}
                                            </Tag>
                                        ))}

                                        {getSafetyWarnings(
                                            selectedCase.prescription,
                                        ).map((warning, index) => (
                                            <Tag
                                                key={`${warning}-${index}`}
                                                color="gold"
                                            >
                                                {warning}
                                            </Tag>
                                        ))}
                                    </Space>
                                )}

                                <div style={{ marginTop: 16 }}>
                                    <Button
                                        icon={<SafetyCertificateOutlined />}
                                        loading={
                                            checkingId ===
                                            selectedCase.prescription.id
                                        }
                                        disabled={!canWritePrescriptions}
                                        onClick={() =>
                                            handleSafetyCheck(
                                                selectedCase.prescription!.id,
                                            )
                                        }
                                    >
                                        Chạy kiểm tra an toàn
                                    </Button>
                                </div>
                            </section>
                        </Space>
                    )}
                </Drawer>
            </RoleGuardState>
        </DashboardFrame>
    );
}