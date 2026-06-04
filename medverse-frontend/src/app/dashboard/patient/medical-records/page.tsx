'use client';

import {
    CalendarOutlined,
    CheckCircleOutlined,
    EyeOutlined,
    FileProtectOutlined,
    MedicineBoxOutlined,
    ReloadOutlined,
    SearchOutlined,
    WarningOutlined,
} from '@ant-design/icons';
import {
    Alert,
    Button,
    Descriptions,
    Drawer,
    Input,
    Select,
    Space,
    Tag,
    Timeline,
} from 'antd';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import ClinicalPageState from '../../_components/ClinicalPageState';
import PatientPortalFrame from '../../_components/PatientPortalFrame';
import StatusTag from '../../_components/StatusTag';
import { hasRole } from '@/lib/auth/roles';
import { useAuthSession } from '@/lib/auth/use-auth-session';
import { getMyMedicalRecords } from '@/services/ehr.service';
import type { MedicalRecord } from '@/types/clinical';
import styles from '../../_components/patient-portal.module.scss';

type MedicalRecordDiagnosisView = {
    id?: string;
    icdCode?: string;
    icdName?: string;
    diagnosisName?: string;
    name?: string;
    note?: string;
    type?: string;
    primary?: boolean;
    source?: string;
};

type PatientMedicalRecordView = MedicalRecord & {
    appointmentId?: string;
    appointmentCode?: string;

    doctorId?: string;
    doctorName?: string;
    doctorEmail?: string;

    specialtyName?: string;

    appointmentDate?: string;
    appointmentTime?: string;
    startTime?: string;
    endTime?: string;

    chiefComplaint?: string;
    reason?: string;
    symptoms?: string;

    clinicalNote?: string;
    diagnosisSummary?: string;
    treatmentPlan?: string;
    followUpNote?: string;
    doctorAdvice?: string;

    status?: string;

    diagnoses?: MedicalRecordDiagnosisView[];

    prescriptionId?: string;

    createdAt?: string;
    updatedAt?: string;
    completedAt?: string;
};

const statusOptions = [
    {
        label: 'Tất cả bệnh án',
        value: 'ALL',
    },
    {
        label: 'Đã hoàn tất',
        value: 'COMPLETED',
    },
    {
        label: 'Bản nháp',
        value: 'DRAFT',
    },
    {
        label: 'Đã hủy',
        value: 'CANCELLED',
    },
];

function normalizeKeyword(value?: string) {
    return String(value || '')
        .trim()
        .toLowerCase();
}

function formatDate(value?: string) {
    if (!value) return 'Chưa ghi nhận';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleDateString('vi-VN');
}

function formatDateTime(value?: string) {
    if (!value) return 'Chưa ghi nhận';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleString('vi-VN');
}

function getRecordDate(record: PatientMedicalRecordView) {
    return (
        record.completedAt ||
        record.appointmentDate ||
        record.startTime ||
        record.createdAt
    );
}

function getRecordTitle(record: PatientMedicalRecordView) {
    if (record.specialtyName && record.doctorName) {
        return `${record.specialtyName} · ${record.doctorName}`;
    }

    return (
        record.specialtyName ||
        record.doctorName ||
        record.diagnosisSummary ||
        'Bệnh án điện tử'
    );
}

function getRecordMainText(record: PatientMedicalRecordView) {
    return (
        record.diagnosisSummary ||
        record.chiefComplaint ||
        record.reason ||
        record.symptoms ||
        'Chưa có tóm tắt kết quả khám.'
    );
}

function getAppointmentTime(record: PatientMedicalRecordView) {
    if (record.appointmentDate) {
        return `${formatDate(record.appointmentDate)} · ${record.appointmentTime || 'Chưa ghi nhận giờ'
            }`;
    }

    if (record.startTime) {
        return formatDateTime(record.startTime);
    }

    return formatDateTime(record.createdAt);
}

function isCompleted(record: PatientMedicalRecordView) {
    return String(record.status || '').toUpperCase() === 'COMPLETED';
}

function isDraft(record: PatientMedicalRecordView) {
    return String(record.status || '').toUpperCase() === 'DRAFT';
}

function isCancelled(record: PatientMedicalRecordView) {
    return String(record.status || '').toUpperCase() === 'CANCELLED';
}

function countDiagnoses(records: PatientMedicalRecordView[]) {
    return records.reduce(
        (total, record) => total + Number(record.diagnoses?.length || 0),
        0,
    );
}

function getDiagnosisLabel(diagnosis: MedicalRecordDiagnosisView) {
    return (
        diagnosis.icdName ||
        diagnosis.diagnosisName ||
        diagnosis.name ||
        diagnosis.icdCode ||
        'Chẩn đoán'
    );
}

function getDiagnosisTag(diagnosis: MedicalRecordDiagnosisView) {
    if (diagnosis.icdCode) {
        return `${diagnosis.icdCode} · ${getDiagnosisLabel(diagnosis)}`;
    }

    return getDiagnosisLabel(diagnosis);
}

export default function PatientMedicalRecordsPage() {
    const { session, loading: authLoading } = useAuthSession();

    const [records, setRecords] = useState<PatientMedicalRecordView[]>([]);
    const [keyword, setKeyword] = useState('');
    const [status, setStatus] = useState('ALL');

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [selectedRecord, setSelectedRecord] =
        useState<PatientMedicalRecordView | null>(null);
    const [openDetailDrawer, setOpenDetailDrawer] = useState(false);

    const loadRecords = async () => {
        try {
            setLoading(true);
            setError(null);

            const result = await getMyMedicalRecords();

            const content = Array.isArray(result)
                ? result
                : result?.content || [];

            setRecords(content as PatientMedicalRecordView[]);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Không thể tải danh sách bệnh án.',
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

        loadRecords();
    }, [session]);

    const filteredRecords = useMemo(() => {
        const search = normalizeKeyword(keyword);

        return records.filter((record) => {
            const recordStatus = String(record.status || '').toUpperCase();

            const diagnosisText = (record.diagnoses || [])
                .map((item) => getDiagnosisTag(item))
                .join(' ')
                .toLowerCase();

            const matchStatus = status === 'ALL' || recordStatus === status;

            const matchKeyword =
                !search ||
                record.doctorName?.toLowerCase().includes(search) ||
                record.specialtyName?.toLowerCase().includes(search) ||
                record.chiefComplaint?.toLowerCase().includes(search) ||
                record.reason?.toLowerCase().includes(search) ||
                record.symptoms?.toLowerCase().includes(search) ||
                record.diagnosisSummary?.toLowerCase().includes(search) ||
                record.treatmentPlan?.toLowerCase().includes(search) ||
                diagnosisText.includes(search);

            return matchStatus && matchKeyword;
        });
    }, [records, keyword, status]);

    const metrics = useMemo(() => {
        return {
            total: records.length,
            completed: records.filter(isCompleted).length,
            draft: records.filter(isDraft).length,
            cancelled: records.filter(isCancelled).length,
            diagnoses: countDiagnoses(records),
        };
    }, [records]);

    const timelineRecords = useMemo(() => {
        return [...records]
            .sort((a, b) => {
                const timeA = new Date(getRecordDate(a) || 0).getTime();
                const timeB = new Date(getRecordDate(b) || 0).getTime();

                return timeB - timeA;
            })
            .slice(0, 5);
    }, [records]);

    const openDetail = (record: PatientMedicalRecordView) => {
        setSelectedRecord(record);
        setOpenDetailDrawer(true);
    };

    const handleReset = () => {
        setKeyword('');
        setStatus('ALL');
    };

    if (authLoading || !session) {
        return <ClinicalPageState loading>Loading</ClinicalPageState>;
    }

    return (
        <PatientPortalFrame session={session}>
            <section className={styles.hero}>
                <div>
                    <div className={styles.heroKicker}>Bệnh án điện tử</div>
                    <h1 className={styles.heroTitle}>
                        Theo dõi kết quả khám của bạn
                    </h1>
                    <p className={styles.heroDescription}>
                        Các bệnh án sau khi bác sĩ hoàn tất sẽ được hiển thị tại
                        đây, bao gồm chẩn đoán, kế hoạch điều trị, dặn dò và các
                        thông tin liên quan.
                    </p>

                    <Space wrap style={{ marginTop: 20 }}>
                        <Link href="/dashboard/patient/appointments">
                            <Button type="primary" icon={<CalendarOutlined />}>
                                Xem lịch hẹn
                            </Button>
                        </Link>

                        <Link href="/dashboard/patient/prescriptions">
                            <Button icon={<MedicineBoxOutlined />}>
                                Xem đơn thuốc
                            </Button>
                        </Link>
                    </Space>
                </div>

                <article className={styles.heroCard}>
                    <span>Bệnh án đã hoàn tất</span>
                    <strong>{metrics.completed}</strong>
                    <p>
                        Các bệnh án hoàn tất có thể được dùng để theo dõi lịch sử
                        điều trị và tái khám.
                    </p>
                </article>
            </section>

            <section
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                    gap: 16,
                    marginTop: 24,
                }}
            >
                <article className={styles.listCard}>
                    <div className={styles.listTitle}>
                        <strong>Tổng bệnh án</strong>
                        <Tag color="blue">{metrics.total}</Tag>
                    </div>
                    <p className={styles.muted}>
                        Toàn bộ bệnh án điện tử của bạn.
                    </p>
                </article>

                <article className={styles.listCard}>
                    <div className={styles.listTitle}>
                        <strong>Chẩn đoán ICD</strong>
                        <Tag color="purple">{metrics.diagnoses}</Tag>
                    </div>
                    <p className={styles.muted}>
                        Số chẩn đoán đã được ghi nhận trong bệnh án.
                    </p>
                </article>

                <article className={styles.listCard}>
                    <div className={styles.listTitle}>
                        <strong>Cần chú ý</strong>
                        <Tag color="orange">{metrics.draft + metrics.cancelled}</Tag>
                    </div>
                    <p className={styles.muted}>
                        Bệnh án còn nháp hoặc đã hủy, chưa phải kết quả cuối cùng.
                    </p>
                </article>
            </section>

            <section className={styles.portalPanel} style={{ marginTop: 24 }}>
                <div className={styles.panelHeader}>
                    <div>
                        <span>Dòng thời gian</span>
                        <h2>Lịch sử khám gần đây</h2>
                    </div>

                    <Button icon={<ReloadOutlined />} onClick={loadRecords}>
                        Làm mới
                    </Button>
                </div>

                <ClinicalPageState
                    loading={loading}
                    error={error}
                    empty={timelineRecords.length === 0}
                    emptyTitle="Chưa có bệnh án"
                    emptyDescription="Sau khi bác sĩ hoàn tất buổi khám, bệnh án sẽ xuất hiện tại đây."
                    actionText="Xem lịch hẹn"
                    actionHref="/dashboard/patient/appointments"
                >
                    <Timeline
                        style={{ marginTop: 24 }}
                        items={timelineRecords.map((record) => ({
                            color: isCompleted(record)
                                ? 'green'
                                : isCancelled(record)
                                    ? 'red'
                                    : 'blue',
                            dot: isCompleted(record) ? (
                                <CheckCircleOutlined />
                            ) : isCancelled(record) ? (
                                <WarningOutlined />
                            ) : (
                                <FileProtectOutlined />
                            ),
                            children: (
                                <article className={styles.listCard}>
                                    <div className={styles.listTitle}>
                                        <strong>{getRecordTitle(record)}</strong>
                                        <StatusTag value={record.status || 'DRAFT'} />
                                    </div>

                                    <p className={styles.muted}>
                                        Thời gian khám:{' '}
                                        <b>{getAppointmentTime(record)}</b>
                                    </p>

                                    <p className={styles.muted}>
                                        {getRecordMainText(record)}
                                    </p>

                                    <Button
                                        icon={<EyeOutlined />}
                                        onClick={() => openDetail(record)}
                                    >
                                        Xem chi tiết
                                    </Button>
                                </article>
                            ),
                        }))}
                    />
                </ClinicalPageState>
            </section>

            <section className={styles.portalPanel} style={{ marginTop: 24 }}>
                <div className={styles.panelHeader}>
                    <div>
                        <span>Bộ lọc</span>
                        <h2>Tìm bệnh án</h2>
                    </div>
                </div>

                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 220px auto',
                        gap: 12,
                        marginTop: 16,
                    }}
                >
                    <Input
                        allowClear
                        prefix={<SearchOutlined />}
                        placeholder="Tìm theo bác sĩ, chuyên khoa, triệu chứng, chẩn đoán hoặc kế hoạch điều trị"
                        value={keyword}
                        onChange={(event) => setKeyword(event.target.value)}
                    />

                    <Select
                        value={status}
                        options={statusOptions}
                        onChange={setStatus}
                    />

                    <Button onClick={handleReset}>Đặt lại</Button>
                </div>
            </section>

            <section className={styles.portalPanel} style={{ marginTop: 24 }}>
                <div className={styles.panelHeader}>
                    <div>
                        <span>Danh sách</span>
                        <h2>Bệnh án của tôi</h2>
                    </div>

                    <Tag color="blue">{filteredRecords.length} bệnh án</Tag>
                </div>

                <ClinicalPageState
                    loading={loading}
                    error={error}
                    empty={filteredRecords.length === 0}
                    emptyTitle="Không có bệnh án phù hợp"
                    emptyDescription="Bạn có thể thay đổi bộ lọc hoặc quay lại xem lịch hẹn."
                    actionText="Xem lịch hẹn"
                    actionHref="/dashboard/patient/appointments"
                >
                    {filteredRecords.map((record) => (
                        <article key={record.id} className={styles.listCard}>
                            <div className={styles.listTitle}>
                                <Space size={10} wrap>
                                    <span
                                        style={{
                                            width: 36,
                                            height: 36,
                                            borderRadius: 999,
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: isCompleted(record)
                                                ? '#16a34a'
                                                : isCancelled(record)
                                                    ? '#ef4444'
                                                    : '#2563eb',
                                            background: '#f8fafc',
                                            border: '1px solid #e2e8f0',
                                        }}
                                    >
                                        <FileProtectOutlined />
                                    </span>

                                    <strong>{getRecordTitle(record)}</strong>
                                </Space>

                                <StatusTag value={record.status || 'DRAFT'} />
                            </div>

                            <p className={styles.muted}>
                                Bác sĩ:{' '}
                                <b>{record.doctorName || 'Chưa cập nhật'}</b>
                            </p>

                            <p className={styles.muted}>
                                Thời gian khám:{' '}
                                <b>{getAppointmentTime(record)}</b>
                            </p>

                            <p className={styles.muted}>
                                {getRecordMainText(record)}
                            </p>

                            {record.diagnoses && record.diagnoses.length > 0 && (
                                <Space wrap style={{ marginBottom: 12 }}>
                                    {record.diagnoses.slice(0, 4).map((diagnosis) => (
                                        <Tag
                                            key={
                                                diagnosis.id ||
                                                diagnosis.icdCode ||
                                                getDiagnosisTag(diagnosis)
                                            }
                                            color={diagnosis.primary ? 'red' : 'blue'}
                                        >
                                            {getDiagnosisTag(diagnosis)}
                                        </Tag>
                                    ))}

                                    {record.diagnoses.length > 4 && (
                                        <Tag>+{record.diagnoses.length - 4}</Tag>
                                    )}
                                </Space>
                            )}

                            <Space wrap>
                                <Button
                                    icon={<EyeOutlined />}
                                    onClick={() => openDetail(record)}
                                >
                                    Xem chi tiết
                                </Button>

                                {record.prescriptionId && (
                                    <Link href="/dashboard/patient/prescriptions">
                                        <Button icon={<MedicineBoxOutlined />}>
                                            Xem đơn thuốc
                                        </Button>
                                    </Link>
                                )}
                            </Space>
                        </article>
                    ))}
                </ClinicalPageState>
            </section>

            <Drawer
                title="Chi tiết bệnh án"
                open={openDetailDrawer}
                width={660}
                onClose={() => setOpenDetailDrawer(false)}
                extra={
                    selectedRecord?.prescriptionId && (
                        <Link href="/dashboard/patient/prescriptions">
                            <Button type="primary" icon={<MedicineBoxOutlined />}>
                                Xem đơn thuốc
                            </Button>
                        </Link>
                    )
                }
            >
                {selectedRecord && (
                    <Space direction="vertical" size={20} style={{ width: '100%' }}>
                        <Descriptions
                            bordered
                            column={1}
                            size="small"
                            title={getRecordTitle(selectedRecord)}
                        >
                            <Descriptions.Item label="Trạng thái">
                                <StatusTag value={selectedRecord.status || 'DRAFT'} />
                            </Descriptions.Item>

                            <Descriptions.Item label="Chuyên khoa">
                                {selectedRecord.specialtyName || 'Chưa cập nhật'}
                            </Descriptions.Item>

                            <Descriptions.Item label="Bác sĩ">
                                {selectedRecord.doctorName || 'Chưa cập nhật'}
                            </Descriptions.Item>

                            <Descriptions.Item label="Email bác sĩ">
                                {selectedRecord.doctorEmail || 'Chưa cập nhật'}
                            </Descriptions.Item>

                            <Descriptions.Item label="Thời gian khám">
                                {getAppointmentTime(selectedRecord)}
                            </Descriptions.Item>

                            <Descriptions.Item label="Lý do khám">
                                {selectedRecord.reason ||
                                    selectedRecord.chiefComplaint ||
                                    'Chưa cập nhật'}
                            </Descriptions.Item>

                            <Descriptions.Item label="Triệu chứng">
                                {selectedRecord.symptoms || 'Chưa cập nhật'}
                            </Descriptions.Item>

                            <Descriptions.Item label="Ghi chú lâm sàng">
                                {selectedRecord.clinicalNote || 'Chưa cập nhật'}
                            </Descriptions.Item>

                            <Descriptions.Item label="Tóm tắt chẩn đoán">
                                {selectedRecord.diagnosisSummary ||
                                    'Chưa cập nhật'}
                            </Descriptions.Item>

                            <Descriptions.Item label="Kế hoạch điều trị">
                                {selectedRecord.treatmentPlan || 'Chưa cập nhật'}
                            </Descriptions.Item>

                            <Descriptions.Item label="Dặn dò / tái khám">
                                {selectedRecord.followUpNote ||
                                    selectedRecord.doctorAdvice ||
                                    'Chưa cập nhật'}
                            </Descriptions.Item>

                            <Descriptions.Item label="Ngày hoàn tất">
                                {formatDateTime(selectedRecord.completedAt)}
                            </Descriptions.Item>

                            <Descriptions.Item label="Cập nhật gần nhất">
                                {formatDateTime(selectedRecord.updatedAt)}
                            </Descriptions.Item>
                        </Descriptions>

                        <section>
                            <h3 style={{ marginBottom: 12 }}>Chẩn đoán ICD</h3>

                            {selectedRecord.diagnoses &&
                                selectedRecord.diagnoses.length > 0 ? (
                                <Space wrap>
                                    {selectedRecord.diagnoses.map((diagnosis) => (
                                        <Tag
                                            key={
                                                diagnosis.id ||
                                                diagnosis.icdCode ||
                                                getDiagnosisTag(diagnosis)
                                            }
                                            color={diagnosis.primary ? 'red' : 'blue'}
                                        >
                                            {getDiagnosisTag(diagnosis)}
                                        </Tag>
                                    ))}
                                </Space>
                            ) : (
                                <Alert
                                    type="info"
                                    showIcon
                                    message="Chưa có chẩn đoán ICD"
                                    description="Bệnh án này chưa ghi nhận danh sách chẩn đoán ICD chi tiết."
                                />
                            )}
                        </section>
                    </Space>
                )}
            </Drawer>
        </PatientPortalFrame>
    );
}