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
} from '@/types/clinical';
import styles from '../../dashboard.module.scss';

type AppointmentView = Appointment & {
    patientId?: string;
    patientName?: string;
    patientEmail?: string;
    patientPhone?: string;

    doctorId?: string;
    doctorName?: string;
    doctorEmail?: string;

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
    diagnosis?: string;

    createdAt?: string;
    updatedAt?: string;
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
    diagnoses?: Array<{
        id?: string;
        diagnosisText?: string;
        icdCode?: string;
        icdDisplay?: string;
        note?: string;
        primary?: boolean;
    }>;
    createdAt?: string;
    updatedAt?: string;
    completedAt?: string;
};

type PrescriptionView = Prescription & {
    id: string;
    status?: string;
    note?: string;
    safetyLevel?: string;
    safetySummary?: string;
    safetyAlerts?: Array<{
        id?: string;
        severity?: string;
        type?: string;
        title?: string;
        message?: string;
    }>;
    items?: Array<{
        id?: string;
        medicationName?: string;
        medicineName?: string;
        name?: string;
    }>;
    prescriptionItems?: Array<{
        id?: string;
        medicationName?: string;
        medicineName?: string;
        name?: string;
    }>;
};

type DoctorCase = {
    appointment: AppointmentView;
    medicalRecord?: MedicalRecordView;
    prescription?: PrescriptionView;
};

type AppointmentStatusFilter = AppointmentStatus | 'ALL';

const statusOptions: Array<{
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

function getAppointmentEnd(appointment: AppointmentView) {
    return appointment.endTime;
}

function getAppointmentTimeLabel(appointment: AppointmentView) {
    if (appointment.appointmentDate) {
        const date = dayjs(appointment.appointmentDate);

        return `${date.isValid() ? date.format('DD/MM/YYYY') : appointment.appointmentDate} · ${appointment.appointmentTime || 'Chưa rõ giờ'
            }`;
    }

    return formatDateTime(getAppointmentStart(appointment));
}

function getAppointmentTypeLabel(value?: string) {
    const type = String(value || 'OFFLINE').toUpperCase();

    if (type === 'ONLINE') return 'Khám online';

    return 'Khám trực tiếp';
}

function getAppointmentPlace(appointment: AppointmentView) {
    const type = String(appointment.type || 'OFFLINE').toUpperCase();

    if (type === 'ONLINE') {
        return appointment.meetingUrl || 'Khám trực tuyến';
    }

    return appointment.roomName || appointment.location || 'Phòng khám';
}

function getPatientName(item: DoctorCase) {
    return item.appointment.patientName || 'Bệnh nhân';
}

function getCaseReason(item: DoctorCase) {
    return (
        item.medicalRecord?.chiefComplaint ||
        item.medicalRecord?.symptoms ||
        item.appointment.symptoms ||
        item.appointment.reason ||
        item.appointment.note ||
        item.appointment.diagnosis ||
        'Chưa có ghi chú khám.'
    );
}

function getMedicalRecordStatus(item: DoctorCase) {
    return item.medicalRecord?.status || 'Chưa tạo';
}

function getPrescriptionStatus(item: DoctorCase) {
    return item.prescription?.status || 'Chưa có';
}

function getPrescriptionItems(item: DoctorCase) {
    return item.prescription?.items || item.prescription?.prescriptionItems || [];
}

function hasHighSafetyAlert(item: DoctorCase) {
    const alerts = item.prescription?.safetyAlerts || [];

    return alerts.some((alert) =>
        ['HIGH', 'CRITICAL'].includes(String(alert.severity || '').toUpperCase()),
    );
}

function getCaseUrgencyTag(item: DoctorCase) {
    if (hasHighSafetyAlert(item)) {
        return <Tag color="red">Cảnh báo thuốc mức cao</Tag>;
    }

    if (!item.medicalRecord) {
        return <Tag color="gold">Chưa tạo bệnh án</Tag>;
    }

    if (String(item.medicalRecord.status || '').toUpperCase() === 'DRAFT') {
        return <Tag color="blue">Bệnh án đang nháp</Tag>;
    }

    if (!item.prescription) {
        return <Tag color="purple">Chưa có đơn thuốc</Tag>;
    }

    if (String(item.prescription.status || '').toUpperCase() === 'DRAFT') {
        return <Tag color="orange">Đơn thuốc đang nháp</Tag>;
    }

    return <Tag color="green">Đã xử lý</Tag>;
}

function getCaseTone(item: DoctorCase) {
    if (hasHighSafetyAlert(item)) {
        return {
            color: '#ef4444',
            label: 'Cần kiểm tra an toàn thuốc',
        };
    }

    if (!item.medicalRecord) {
        return {
            color: '#f59e0b',
            label: 'Cần mở bệnh án',
        };
    }

    if (String(item.medicalRecord.status || '').toUpperCase() === 'DRAFT') {
        return {
            color: '#2563eb',
            label: 'Cần hoàn thiện bệnh án',
        };
    }

    if (item.prescription && String(item.prescription.status || '').toUpperCase() === 'DRAFT') {
        return {
            color: '#f97316',
            label: 'Cần hoàn tất đơn thuốc',
        };
    }

    return {
        color: '#16a34a',
        label: 'Ca khám ổn định',
    };
}

function sortCases(a: DoctorCase, b: DoctorCase) {
    return String(getAppointmentStart(a.appointment) || '').localeCompare(
        String(getAppointmentStart(b.appointment) || ''),
    );
}

export default function DoctorCasesPage() {
    const { session, loading: authLoading } = useAuthSession();

    const [cases, setCases] = useState<DoctorCase[]>([]);
    const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());
    const [status, setStatus] = useState<AppointmentStatusFilter>('ALL');
    const [keyword, setKeyword] = useState('');

    const [selectedCase, setSelectedCase] = useState<DoctorCase | null>(null);
    const [detailOpen, setDetailOpen] = useState(false);

    const [loading, setLoading] = useState(true);
    const [checkingId, setCheckingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const canReadCases = session
        ? hasAnyPermission(session, ['EHR:READ_ANY', 'EHR:WRITE'])
        : false;

    const canWritePrescription = session
        ? hasAnyPermission(session, ['PRESCRIPTION:WRITE'])
        : false;

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

            setCases(mapped.sort(sortCases));
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

    const filteredCases = useMemo(() => {
        const search = normalizeKeyword(keyword);

        return cases.filter((item) => {
            const searchText = [
                item.appointment.patientName,
                item.appointment.patientEmail,
                item.appointment.patientPhone,
                item.appointment.specialtyName,
                item.appointment.symptoms,
                item.appointment.reason,
                item.appointment.note,
                item.medicalRecord?.chiefComplaint,
                item.medicalRecord?.symptoms,
                item.medicalRecord?.diagnosisText,
                item.medicalRecord?.diagnosisSummary,
                item.medicalRecord?.treatmentPlan,
                item.prescription?.status,
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();

            return !search || searchText.includes(search);
        });
    }, [cases, keyword]);

    const metrics = useMemo(() => {
        const total = cases.length;
        const withoutRecord = cases.filter((item) => !item.medicalRecord).length;
        const draftRecords = cases.filter(
            (item) =>
                String(item.medicalRecord?.status || '').toUpperCase() === 'DRAFT',
        ).length;
        const completedRecords = cases.filter(
            (item) =>
                String(item.medicalRecord?.status || '').toUpperCase() ===
                'COMPLETED',
        ).length;
        const withPrescription = cases.filter((item) => item.prescription).length;
        const withCriticalAlert = cases.filter(hasHighSafetyAlert).length;

        return {
            total,
            withoutRecord,
            draftRecords,
            completedRecords,
            withPrescription,
            withCriticalAlert,
        };
    }, [cases]);

    const focusCases = useMemo(() => {
        return [...cases]
            .sort((a, b) => {
                const aWeight = hasHighSafetyAlert(a)
                    ? 0
                    : !a.medicalRecord
                        ? 1
                        : String(a.medicalRecord.status || '').toUpperCase() === 'DRAFT'
                            ? 2
                            : !a.prescription
                                ? 3
                                : 4;

                const bWeight = hasHighSafetyAlert(b)
                    ? 0
                    : !b.medicalRecord
                        ? 1
                        : String(b.medicalRecord.status || '').toUpperCase() === 'DRAFT'
                            ? 2
                            : !b.prescription
                                ? 3
                                : 4;

                return aWeight - bWeight;
            })
            .slice(0, 4);
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

    const handleResetFilter = () => {
        setKeyword('');
        setStatus('ALL');
        setSelectedDate(dayjs());
        loadCases(dayjs(), 'ALL');
    };

    const handleSafetyCheck = async (prescriptionId: string) => {
        try {
            setCheckingId(prescriptionId);

            await runPrescriptionSafetyCheck(prescriptionId);

            message.success('Đã chạy kiểm tra an toàn đơn thuốc.');
            await loadCases();
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

    const openDetail = (item: DoctorCase) => {
        setSelectedCase(item);
        setDetailOpen(true);
    };

    if (authLoading || !session) {
        return <Skeleton active paragraph={{ rows: 8 }} />;
    }

    return (
        <DashboardFrame
            session={session}
            title="Bảng ca khám"
            subtitle="Theo dõi ca khám theo ngày, bệnh án, đơn thuốc và kiểm tra an toàn"
        >
            <RoleGuardState
                session={session}
                anyPermissions={['EHR:READ_ANY', 'EHR:WRITE']}
            >
                <div className={styles.roleDashboard}>
                    <section className={styles.heroCard}>
                        <div>
                            <span>Clinical Case Board</span>
                            <h2>Quản lý các ca khám trong ngày.</h2>
                            <p>
                                Bảng này giúp bác sĩ theo dõi từng lịch khám, biết ca
                                nào chưa mở bệnh án, ca nào còn đơn thuốc nháp và ca
                                nào có cảnh báo an toàn thuốc cần xử lý.
                            </p>

                            <Space wrap style={{ marginTop: 20 }}>
                                <Button
                                    type="primary"
                                    icon={<ReloadOutlined />}
                                    loading={loading}
                                    onClick={() => loadCases()}
                                >
                                    Làm mới
                                </Button>

                                {/* <Link href="/dashboard/doctor/appointments">
                                    <Button icon={<CalendarOutlined />}>
                                        Xem lịch khám
                                    </Button>
                                </Link> */}
                            </Space>
                        </div>

                        <div className={styles.pulseCard}>
                            <strong>{metrics.total}</strong>
                            <span>ca khám theo bộ lọc</span>
                        </div>
                    </section>

                    <section className={styles.metricGrid}>
                        <Card className={styles.metricCard}>
                            <Statistic
                                title="Tổng ca"
                                value={metrics.total}
                                prefix={<CheckCircleOutlined />}
                            />
                            <p>Ca khám theo ngày và trạng thái đang chọn.</p>
                        </Card>

                        <Card className={styles.metricCard}>
                            <Statistic
                                title="Chưa có bệnh án"
                                value={metrics.withoutRecord}
                                prefix={<FileProtectOutlined />}
                            />
                            <p>Cần mở bệnh án để ghi nhận thông tin khám.</p>
                        </Card>

                        <Card className={styles.metricCard}>
                            <Statistic
                                title="Đơn thuốc"
                                value={metrics.withPrescription}
                                prefix={<MedicineBoxOutlined />}
                            />
                            <p>Số ca đã có đơn thuốc liên quan.</p>
                        </Card>

                        <Card className={styles.metricCard}>
                            <Statistic
                                title="Cảnh báo thuốc"
                                value={metrics.withCriticalAlert}
                                prefix={<WarningOutlined />}
                            />
                            <p>Cần kiểm tra trước khi hoàn tất ca khám.</p>
                        </Card>
                    </section>

                    <section className={styles.detailGrid}>
                        <Card
                            className={styles.detailCard}
                            title="Ca cần ưu tiên"
                        >
                            {focusCases.length === 0 ? (
                                <ClinicalEmptyState
                                    title="Không có ca khám cần xử lý"
                                    description="Hiện tại chưa có ca khám nào theo bộ lọc."
                                />
                            ) : (
                                <Space
                                    direction="vertical"
                                    size={12}
                                    style={{ width: '100%' }}
                                >
                                    {focusCases.map((item) => {
                                        const tone = getCaseTone(item);

                                        return (
                                            <article
                                                key={item.appointment.id}
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
                                                            <UserOutlined />
                                                        </span>

                                                        <strong>
                                                            {getPatientName(item)}
                                                        </strong>
                                                    </Space>

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
                                                        {getAppointmentTimeLabel(
                                                            item.appointment,
                                                        )}
                                                    </b>
                                                </p>

                                                <p>{getCaseReason(item)}</p>

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

                                                    <Link
                                                        href={`/dashboard/doctor/cases/${item.appointment.id}`}
                                                    >
                                                        <Button
                                                            size="small"
                                                            type="primary"
                                                            icon={
                                                                <CheckCircleOutlined />
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
                            title="Tổng quan xử lý"
                        >
                            <Space
                                direction="vertical"
                                size={12}
                                style={{ width: '100%' }}
                            >
                                <Alert
                                    type="info"
                                    showIcon
                                    message={`${metrics.draftRecords} bệnh án đang nháp`}
                                    description="Các bệnh án nháp cần được hoàn thiện trước khi kết thúc ca khám."
                                />

                                <Alert
                                    type="success"
                                    showIcon
                                    message={`${metrics.completedRecords} bệnh án đã hoàn tất`}
                                    description="Bệnh nhân có thể xem kết quả khám trong Patient Portal."
                                />

                                <Alert
                                    type="warning"
                                    showIcon
                                    message={`${metrics.withCriticalAlert} ca có cảnh báo thuốc`}
                                    description="Hãy chạy kiểm tra an toàn và xử lý cảnh báo trước khi hoàn tất đơn thuốc."
                                />
                            </Space>
                        </Card>
                    </section>

                    <Card className={styles.detailCard}>
                        <div className={styles.panelHeader}>
                            <div>
                                <span>Doctor cases</span>
                                <h2>Danh sách ca khám của tôi</h2>
                                <p>
                                    Chỉ hiển thị lịch hẹn thuộc bác sĩ đang đăng
                                    nhập. Dùng bộ lọc để xem ca theo ngày, trạng thái
                                    và tìm kiếm nhanh theo bệnh nhân.
                                </p>
                            </div>

                            <Button
                                icon={<ReloadOutlined />}
                                loading={loading}
                                onClick={() => loadCases()}
                            >
                                Làm mới
                            </Button>
                        </div>

                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns:
                                    'minmax(260px, 1fr) 190px 220px auto',
                                gap: 12,
                                marginTop: 20,
                                marginBottom: 20,
                            }}
                        >
                            <Input
                                allowClear
                                prefix={<SearchOutlined />}
                                placeholder="Tìm bệnh nhân, chuyên khoa, triệu chứng, chẩn đoán"
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
                                value={status}
                                onChange={handleStatusChange}
                                options={statusOptions}
                            />

                            <Button onClick={handleResetFilter}>Đặt lại</Button>
                        </div>

                        {error && (
                            <Alert
                                type="error"
                                showIcon
                                message="Không thể tải bảng ca khám"
                                description={error}
                                style={{ marginBottom: 16 }}
                            />
                        )}

                        <ClinicalPageState loading={loading}>
                            {filteredCases.length === 0 ? (
                                <ClinicalEmptyState
                                    title="Chưa có ca khám"
                                    description="Không tìm thấy ca khám nào theo bộ lọc hiện tại."
                                />
                            ) : (
                                <List
                                    dataSource={filteredCases}
                                    renderItem={(item) => {
                                        const tone = getCaseTone(item);

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
                                                                    <CheckCircleOutlined />
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
                                                                        item
                                                                            .appointment
                                                                            .status
                                                                    }
                                                                />
                                                                {getCaseUrgencyTag(
                                                                    item,
                                                                )}
                                                                <Tag color="cyan">
                                                                    {getAppointmentTypeLabel(
                                                                        item
                                                                            .appointment
                                                                            .type,
                                                                    )}
                                                                </Tag>
                                                            </Space>
                                                        </div>
                                                    }
                                                    description={
                                                        <div>
                                                            <p>
                                                                Thời gian:{' '}
                                                                <b>
                                                                    {getAppointmentTimeLabel(
                                                                        item.appointment,
                                                                    )}
                                                                </b>{' '}
                                                                →{' '}
                                                                {formatTime(
                                                                    getAppointmentEnd(
                                                                        item.appointment,
                                                                    ),
                                                                )}
                                                            </p>

                                                            <p>
                                                                Địa điểm / hình thức:{' '}
                                                                <b>
                                                                    {getAppointmentPlace(
                                                                        item.appointment,
                                                                    )}
                                                                </b>
                                                            </p>

                                                            <p>
                                                                Lý do khám:{' '}
                                                                {getCaseReason(item)}
                                                            </p>

                                                            <div
                                                                style={{
                                                                    display: 'flex',
                                                                    flexWrap: 'wrap',
                                                                    gap: 8,
                                                                    marginTop: 10,
                                                                }}
                                                            >
                                                                <Tag>
                                                                    Bệnh án:{' '}
                                                                    <b>
                                                                        {getMedicalRecordStatus(
                                                                            item,
                                                                        )}
                                                                    </b>
                                                                </Tag>

                                                                <Tag>
                                                                    Chẩn đoán:{' '}
                                                                    <b>
                                                                        {item
                                                                            .medicalRecord
                                                                            ?.diagnoses
                                                                            ?.length ||
                                                                            0}
                                                                    </b>
                                                                </Tag>

                                                                <Tag>
                                                                    Đơn thuốc:{' '}
                                                                    <b>
                                                                        {getPrescriptionStatus(
                                                                            item,
                                                                        )}
                                                                    </b>
                                                                </Tag>

                                                                <Tag>
                                                                    Thuốc:{' '}
                                                                    <b>
                                                                        {
                                                                            getPrescriptionItems(
                                                                                item,
                                                                            )
                                                                                .length
                                                                        }
                                                                    </b>
                                                                </Tag>
                                                            </div>

                                                            {item.prescription
                                                                ?.safetyAlerts
                                                                ?.length ? (
                                                                <Alert
                                                                    type={
                                                                        hasHighSafetyAlert(
                                                                            item,
                                                                        )
                                                                            ? 'warning'
                                                                            : 'info'
                                                                    }
                                                                    showIcon
                                                                    style={{
                                                                        marginTop: 12,
                                                                    }}
                                                                    message="Cảnh báo an toàn thuốc"
                                                                    description={
                                                                        <Space
                                                                            wrap
                                                                        >
                                                                            {item.prescription.safetyAlerts.map(
                                                                                (
                                                                                    alert,
                                                                                ) => (
                                                                                    <Tag
                                                                                        key={
                                                                                            alert.id ||
                                                                                            `${alert.severity}-${alert.title}`
                                                                                        }
                                                                                        color={
                                                                                            [
                                                                                                'HIGH',
                                                                                                'CRITICAL',
                                                                                            ].includes(
                                                                                                String(
                                                                                                    alert.severity ||
                                                                                                    '',
                                                                                                ).toUpperCase(),
                                                                                            )
                                                                                                ? 'red'
                                                                                                : 'gold'
                                                                                        }
                                                                                    >
                                                                                        {
                                                                                            alert.severity
                                                                                        }{' '}
                                                                                        ·{' '}
                                                                                        {
                                                                                            alert.type
                                                                                        }
                                                                                        :{' '}
                                                                                        {alert.title ||
                                                                                            alert.message}
                                                                                    </Tag>
                                                                                ),
                                                                            )}
                                                                        </Space>
                                                                    }
                                                                />
                                                            ) : null}
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

                                                    {item.prescription ? (
                                                        <Button
                                                            icon={
                                                                <SafetyCertificateOutlined />
                                                            }
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
                                                            Kiểm tra thuốc
                                                        </Button>
                                                    ) : (
                                                        <Button disabled>
                                                            Chưa có đơn thuốc
                                                        </Button>
                                                    )}

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
                    title="Chi tiết ca khám"
                    open={detailOpen}
                    width={720}
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
                    {selectedCase && (
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
                                <Descriptions.Item label="Trạng thái lịch hẹn">
                                    <StatusTag
                                        value={selectedCase.appointment.status}
                                    />
                                </Descriptions.Item>

                                <Descriptions.Item label="Bệnh nhân">
                                    {selectedCase.appointment.patientName ||
                                        'Chưa rõ'}
                                </Descriptions.Item>

                                <Descriptions.Item label="Email">
                                    {selectedCase.appointment.patientEmail ||
                                        'Chưa cập nhật'}
                                </Descriptions.Item>

                                <Descriptions.Item label="Số điện thoại">
                                    {selectedCase.appointment.patientPhone ||
                                        'Chưa cập nhật'}
                                </Descriptions.Item>

                                <Descriptions.Item label="Chuyên khoa">
                                    {selectedCase.appointment.specialtyName ||
                                        'Chưa cập nhật'}
                                </Descriptions.Item>

                                <Descriptions.Item label="Thời gian">
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

                                <Descriptions.Item label="Lý do khám">
                                    {getCaseReason(selectedCase)}
                                </Descriptions.Item>

                                <Descriptions.Item label="Bệnh án">
                                    {selectedCase.medicalRecord ? (
                                        <Space wrap>
                                            <StatusTag
                                                value={
                                                    selectedCase.medicalRecord
                                                        .status || 'DRAFT'
                                                }
                                            />
                                            <Tag color="blue">
                                                {selectedCase.medicalRecord
                                                    .diagnoses?.length || 0}{' '}
                                                chẩn đoán
                                            </Tag>
                                        </Space>
                                    ) : (
                                        'Chưa tạo bệnh án'
                                    )}
                                </Descriptions.Item>

                                <Descriptions.Item label="Đơn thuốc">
                                    {selectedCase.prescription ? (
                                        <Space wrap>
                                            <StatusTag
                                                value={
                                                    selectedCase.prescription
                                                        .status || 'DRAFT'
                                                }
                                            />
                                            <Tag color="green">
                                                {
                                                    getPrescriptionItems(
                                                        selectedCase,
                                                    ).length
                                                }{' '}
                                                thuốc
                                            </Tag>
                                        </Space>
                                    ) : (
                                        'Chưa có đơn thuốc'
                                    )}
                                </Descriptions.Item>
                            </Descriptions>

                            {selectedCase.prescription?.safetyAlerts?.length ? (
                                <Alert
                                    type={
                                        hasHighSafetyAlert(selectedCase)
                                            ? 'warning'
                                            : 'info'
                                    }
                                    showIcon
                                    message="Cảnh báo an toàn đơn thuốc"
                                    description={
                                        <Space wrap>
                                            {selectedCase.prescription.safetyAlerts.map(
                                                (alert) => (
                                                    <Tag
                                                        key={
                                                            alert.id ||
                                                            `${alert.severity}-${alert.title}`
                                                        }
                                                        color={
                                                            [
                                                                'HIGH',
                                                                'CRITICAL',
                                                            ].includes(
                                                                String(
                                                                    alert.severity ||
                                                                    '',
                                                                ).toUpperCase(),
                                                            )
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
                                        </Space>
                                    }
                                />
                            ) : (
                                <Alert
                                    type="success"
                                    showIcon
                                    message="Chưa ghi nhận cảnh báo thuốc mức cao"
                                    description="Bạn có thể chạy kiểm tra an toàn đơn thuốc nếu ca khám đã có đơn thuốc."
                                />
                            )}
                        </Space>
                    )}
                </Drawer>
            </RoleGuardState>
        </DashboardFrame>
    );
}