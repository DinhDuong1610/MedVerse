'use client';

import {
    CalendarOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
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
} from 'antd';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import ClinicalPageState from '../../_components/ClinicalPageState';
import PatientPortalFrame from '../../_components/PatientPortalFrame';
import StatusTag from '../../_components/StatusTag';
import { hasRole } from '@/lib/auth/roles';
import { useAuthSession } from '@/lib/auth/use-auth-session';
import { getMyPrescriptions } from '@/services/prescription.service';
import type { Prescription } from '@/types/clinical';
import styles from '../../_components/patient-portal.module.scss';

type PrescriptionItemView = {
    id?: string;
    medicationId?: string;
    medicationCode?: string;
    medicationName?: string;
    medicineName?: string;
    name?: string;
    activeIngredient?: string;
    dosage?: string;
    frequency?: string;
    duration?: string;
    quantity?: number;
    unit?: string;
    instruction?: string;
    usageInstruction?: string;
    note?: string;
};

type PatientPrescriptionView = Prescription & {
    code?: string;
    prescriptionCode?: string;

    appointmentId?: string;
    medicalRecordId?: string;

    doctorId?: string;
    doctorName?: string;
    doctorEmail?: string;
    specialtyName?: string;

    diagnosisSummary?: string;
    diagnosis?: string;

    note?: string;
    advice?: string;
    status?: string;

    issuedAt?: string;
    createdAt?: string;
    updatedAt?: string;
    dispensedAt?: string;
    cancelledAt?: string;

    items?: PrescriptionItemView[];
    prescriptionItems?: PrescriptionItemView[];
    medications?: PrescriptionItemView[];
};

const statusOptions = [
    {
        label: 'Tất cả đơn thuốc',
        value: 'ALL',
    },
    {
        label: 'Đã kê',
        value: 'ISSUED',
    },
    {
        label: 'Đã cấp thuốc',
        value: 'DISPENSED',
    },
    {
        label: 'Cấp một phần',
        value: 'PARTIALLY_DISPENSED',
    },
    {
        label: 'Hoàn tất',
        value: 'COMPLETED',
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

function formatDateTime(value?: string) {
    if (!value) return 'Chưa ghi nhận';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleString('vi-VN');
}

function getPrescriptionCode(prescription: PatientPrescriptionView) {
    return (
        prescription.prescriptionCode ||
        prescription.code ||
        `Đơn thuốc #${String(prescription.id || '').slice(0, 8)}`
    );
}

function getPrescriptionItems(prescription: PatientPrescriptionView) {
    return (
        prescription.items ||
        prescription.prescriptionItems ||
        prescription.medications ||
        []
    );
}

function getMedicineName(item: PrescriptionItemView) {
    return (
        item.medicationName ||
        item.medicineName ||
        item.name ||
        'Thuốc chưa cập nhật tên'
    );
}

function getPrescriptionTitle(prescription: PatientPrescriptionView) {
    if (prescription.specialtyName && prescription.doctorName) {
        return `${prescription.specialtyName} · ${prescription.doctorName}`;
    }

    return (
        prescription.specialtyName ||
        prescription.doctorName ||
        prescription.diagnosisSummary ||
        prescription.diagnosis ||
        'Đơn thuốc'
    );
}

function getPrescriptionDescription(prescription: PatientPrescriptionView) {
    return (
        prescription.diagnosisSummary ||
        prescription.diagnosis ||
        prescription.note ||
        prescription.advice ||
        'Chưa có ghi chú chi tiết cho đơn thuốc này.'
    );
}

function getPrescriptionDate(prescription: PatientPrescriptionView) {
    return (
        prescription.issuedAt ||
        prescription.createdAt ||
        prescription.updatedAt ||
        prescription.dispensedAt
    );
}

function isActivePrescription(prescription: PatientPrescriptionView) {
    return ['ISSUED', 'PARTIALLY_DISPENSED'].includes(
        String(prescription.status || '').toUpperCase(),
    );
}

function isDispensedPrescription(prescription: PatientPrescriptionView) {
    return ['DISPENSED', 'COMPLETED'].includes(
        String(prescription.status || '').toUpperCase(),
    );
}

function isProblemPrescription(prescription: PatientPrescriptionView) {
    return String(prescription.status || '').toUpperCase() === 'CANCELLED';
}

function getStatusIcon(status?: string) {
    const normalized = String(status || '').toUpperCase();

    if (['DISPENSED', 'COMPLETED'].includes(normalized)) {
        return <CheckCircleOutlined />;
    }

    if (normalized === 'CANCELLED') {
        return <WarningOutlined />;
    }

    return <ClockCircleOutlined />;
}

function getStatusColor(status?: string) {
    const normalized = String(status || '').toUpperCase();

    if (['DISPENSED', 'COMPLETED'].includes(normalized)) return '#16a34a';
    if (normalized === 'CANCELLED') return '#ef4444';
    if (normalized === 'PARTIALLY_DISPENSED') return '#f59e0b';

    return '#2563eb';
}

export default function PatientPrescriptionsPage() {
    const { session, loading: authLoading } = useAuthSession();

    const [prescriptions, setPrescriptions] = useState<PatientPrescriptionView[]>(
        [],
    );
    const [keyword, setKeyword] = useState('');
    const [status, setStatus] = useState('ALL');

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [selectedPrescription, setSelectedPrescription] =
        useState<PatientPrescriptionView | null>(null);
    const [openDetailDrawer, setOpenDetailDrawer] = useState(false);

    const loadPrescriptions = async () => {
        try {
            setLoading(true);
            setError(null);

            const result = await getMyPrescriptions();

            const content = Array.isArray(result)
                ? result
                : result?.content || [];

            setPrescriptions(content as PatientPrescriptionView[]);
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

        if (!hasRole(session, 'PATIENT')) {
            setError('Trang này chỉ dành cho bệnh nhân.');
            setLoading(false);
            return;
        }

        loadPrescriptions();
    }, [session]);

    const filteredPrescriptions = useMemo(() => {
        const search = normalizeKeyword(keyword);

        return prescriptions.filter((prescription) => {
            const prescriptionStatus = String(
                prescription.status || '',
            ).toUpperCase();

            const itemsText = getPrescriptionItems(prescription)
                .map((item) =>
                    [
                        getMedicineName(item),
                        item.medicationCode,
                        item.activeIngredient,
                        item.dosage,
                        item.frequency,
                        item.duration,
                        item.instruction,
                        item.usageInstruction,
                        item.note,
                    ]
                        .filter(Boolean)
                        .join(' '),
                )
                .join(' ')
                .toLowerCase();

            const matchStatus =
                status === 'ALL' || prescriptionStatus === status;

            const matchKeyword =
                !search ||
                prescription.doctorName?.toLowerCase().includes(search) ||
                prescription.specialtyName?.toLowerCase().includes(search) ||
                prescription.diagnosisSummary?.toLowerCase().includes(search) ||
                prescription.diagnosis?.toLowerCase().includes(search) ||
                prescription.note?.toLowerCase().includes(search) ||
                prescription.advice?.toLowerCase().includes(search) ||
                getPrescriptionCode(prescription).toLowerCase().includes(search) ||
                itemsText.includes(search);

            return matchStatus && matchKeyword;
        });
    }, [prescriptions, keyword, status]);

    const metrics = useMemo(() => {
        const active = prescriptions.filter(isActivePrescription).length;
        const dispensed = prescriptions.filter(isDispensedPrescription).length;
        const problem = prescriptions.filter(isProblemPrescription).length;
        const medicineItems = prescriptions.reduce(
            (total, prescription) =>
                total + getPrescriptionItems(prescription).length,
            0,
        );

        return {
            total: prescriptions.length,
            active,
            dispensed,
            problem,
            medicineItems,
        };
    }, [prescriptions]);

    const recentPrescriptions = useMemo(() => {
        return [...prescriptions]
            .sort((a, b) => {
                const timeA = new Date(getPrescriptionDate(a) || 0).getTime();
                const timeB = new Date(getPrescriptionDate(b) || 0).getTime();

                return timeB - timeA;
            })
            .slice(0, 3);
    }, [prescriptions]);

    const openDetail = (prescription: PatientPrescriptionView) => {
        setSelectedPrescription(prescription);
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
                    <div className={styles.heroKicker}>Đơn thuốc của tôi</div>
                    <h1 className={styles.heroTitle}>
                        Theo dõi đơn thuốc sau mỗi lần khám
                    </h1>
                    <p className={styles.heroDescription}>
                        Các đơn thuốc do bác sĩ kê sẽ được lưu tại đây, bao gồm
                        danh sách thuốc, liều dùng, tần suất sử dụng và dặn dò
                        kèm theo.
                    </p>

                    <Space wrap style={{ marginTop: 20 }}>
                        <Link href="/dashboard/patient/medical-records">
                            <Button type="primary" icon={<FileProtectOutlined />}>
                                Xem bệnh án
                            </Button>
                        </Link>

                        <Link href="/dashboard/patient/appointments">
                            <Button icon={<CalendarOutlined />}>
                                Xem lịch hẹn
                            </Button>
                        </Link>
                    </Space>
                </div>

                <article className={styles.heroCard}>
                    <span>Đơn thuốc đang dùng</span>
                    <strong>{metrics.active}</strong>
                    <p>
                        Kiểm tra kỹ liều dùng và hướng dẫn sử dụng trước khi dùng
                        thuốc.
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
                        <strong>Tổng đơn thuốc</strong>
                        <Tag color="blue">{metrics.total}</Tag>
                    </div>
                    <p className={styles.muted}>
                        Toàn bộ đơn thuốc đã được ghi nhận.
                    </p>
                </article>

                <article className={styles.listCard}>
                    <div className={styles.listTitle}>
                        <strong>Số dòng thuốc</strong>
                        <Tag color="purple">{metrics.medicineItems}</Tag>
                    </div>
                    <p className={styles.muted}>
                        Tổng số thuốc trong các đơn đã kê.
                    </p>
                </article>

                <article className={styles.listCard}>
                    <div className={styles.listTitle}>
                        <strong>Đã cấp thuốc</strong>
                        <Tag color="green">{metrics.dispensed}</Tag>
                    </div>
                    <p className={styles.muted}>
                        Đơn thuốc đã được cấp hoặc hoàn tất.
                    </p>
                </article>
            </section>

            <section className={styles.portalPanel} style={{ marginTop: 24 }}>
                <div className={styles.panelHeader}>
                    <div>
                        <span>Gần đây</span>
                        <h2>Đơn thuốc mới nhất</h2>
                    </div>

                    <Button icon={<ReloadOutlined />} onClick={loadPrescriptions}>
                        Làm mới
                    </Button>
                </div>

                <ClinicalPageState
                    loading={loading}
                    error={error}
                    empty={recentPrescriptions.length === 0}
                    emptyTitle="Chưa có đơn thuốc"
                    emptyDescription="Sau khi bác sĩ kê đơn, đơn thuốc sẽ xuất hiện tại đây."
                    actionText="Xem bệnh án"
                    actionHref="/dashboard/patient/medical-records"
                >
                    {recentPrescriptions.map((prescription) => (
                        <article
                            key={prescription.id}
                            className={styles.listCard}
                        >
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
                                            color: getStatusColor(
                                                prescription.status,
                                            ),
                                            background: '#f8fafc',
                                            border: `1px solid ${getStatusColor(
                                                prescription.status,
                                            )}22`,
                                        }}
                                    >
                                        {getStatusIcon(prescription.status)}
                                    </span>

                                    <strong>
                                        {getPrescriptionTitle(prescription)}
                                    </strong>
                                </Space>

                                <StatusTag value={prescription.status || 'ISSUED'} />
                            </div>

                            <p className={styles.muted}>
                                Mã đơn:{' '}
                                <b>{getPrescriptionCode(prescription)}</b> · Ngày
                                kê:{' '}
                                <b>
                                    {formatDateTime(
                                        getPrescriptionDate(prescription),
                                    )}
                                </b>
                            </p>

                            <p className={styles.muted}>
                                {getPrescriptionDescription(prescription)}
                            </p>

                            <Space wrap>
                                {getPrescriptionItems(prescription)
                                    .slice(0, 4)
                                    .map((item) => (
                                        <Tag
                                            key={
                                                item.id ||
                                                item.medicationId ||
                                                getMedicineName(item)
                                            }
                                            color="blue"
                                        >
                                            {getMedicineName(item)}
                                        </Tag>
                                    ))}

                                {getPrescriptionItems(prescription).length > 4 && (
                                    <Tag>
                                        +
                                        {getPrescriptionItems(prescription).length -
                                            4}
                                    </Tag>
                                )}
                            </Space>

                            <div style={{ marginTop: 12 }}>
                                <Button
                                    icon={<EyeOutlined />}
                                    onClick={() => openDetail(prescription)}
                                >
                                    Xem chi tiết
                                </Button>
                            </div>
                        </article>
                    ))}
                </ClinicalPageState>
            </section>

            <section className={styles.portalPanel} style={{ marginTop: 24 }}>
                <div className={styles.panelHeader}>
                    <div>
                        <span>Bộ lọc</span>
                        <h2>Tìm đơn thuốc</h2>
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
                        placeholder="Tìm theo thuốc, bác sĩ, chuyên khoa, chẩn đoán hoặc hướng dẫn"
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
                        <h2>Đơn thuốc của tôi</h2>
                    </div>

                    <Tag color="blue">{filteredPrescriptions.length} đơn thuốc</Tag>
                </div>

                <ClinicalPageState
                    loading={loading}
                    error={error}
                    empty={filteredPrescriptions.length === 0}
                    emptyTitle="Không có đơn thuốc phù hợp"
                    emptyDescription="Bạn có thể thay đổi bộ lọc hoặc quay lại xem bệnh án."
                    actionText="Xem bệnh án"
                    actionHref="/dashboard/patient/medical-records"
                >
                    {filteredPrescriptions.map((prescription) => (
                        <article
                            key={prescription.id}
                            className={styles.listCard}
                        >
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
                                            color: getStatusColor(
                                                prescription.status,
                                            ),
                                            background: '#f8fafc',
                                            border: `1px solid ${getStatusColor(
                                                prescription.status,
                                            )}22`,
                                        }}
                                    >
                                        <MedicineBoxOutlined />
                                    </span>

                                    <strong>
                                        {getPrescriptionTitle(prescription)}
                                    </strong>
                                </Space>

                                <StatusTag value={prescription.status || 'ISSUED'} />
                            </div>

                            <p className={styles.muted}>
                                Mã đơn:{' '}
                                <b>{getPrescriptionCode(prescription)}</b> · Bác
                                sĩ:{' '}
                                <b>
                                    {prescription.doctorName || 'Chưa cập nhật'}
                                </b>
                            </p>

                            <p className={styles.muted}>
                                Ngày kê:{' '}
                                <b>
                                    {formatDateTime(
                                        getPrescriptionDate(prescription),
                                    )}
                                </b>
                            </p>

                            <p className={styles.muted}>
                                {getPrescriptionDescription(prescription)}
                            </p>

                            {getPrescriptionItems(prescription).length > 0 ? (
                                <Space wrap style={{ marginBottom: 12 }}>
                                    {getPrescriptionItems(prescription)
                                        .slice(0, 5)
                                        .map((item) => (
                                            <Tag
                                                key={
                                                    item.id ||
                                                    item.medicationId ||
                                                    getMedicineName(item)
                                                }
                                                color="blue"
                                            >
                                                {getMedicineName(item)}
                                            </Tag>
                                        ))}

                                    {getPrescriptionItems(prescription).length >
                                        5 && (
                                            <Tag>
                                                +
                                                {getPrescriptionItems(prescription)
                                                    .length - 5}
                                            </Tag>
                                        )}
                                </Space>
                            ) : (
                                <p className={styles.muted}>
                                    Đơn thuốc này chưa có danh sách thuốc chi tiết.
                                </p>
                            )}

                            <Space wrap>
                                <Button
                                    icon={<EyeOutlined />}
                                    onClick={() => openDetail(prescription)}
                                >
                                    Xem chi tiết
                                </Button>

                                {prescription.medicalRecordId && (
                                    <Link href="/dashboard/patient/medical-records">
                                        <Button icon={<FileProtectOutlined />}>
                                            Xem bệnh án
                                        </Button>
                                    </Link>
                                )}

                                {prescription.appointmentId && (
                                    <Link href="/dashboard/patient/appointments">
                                        <Button icon={<CalendarOutlined />}>
                                            Xem lịch hẹn
                                        </Button>
                                    </Link>
                                )}
                            </Space>
                        </article>
                    ))}
                </ClinicalPageState>
            </section>

            <Drawer
                title="Chi tiết đơn thuốc"
                open={openDetailDrawer}
                width={680}
                onClose={() => setOpenDetailDrawer(false)}
                extra={
                    selectedPrescription && (
                        <Space>
                            {selectedPrescription.medicalRecordId && (
                                <Link href="/dashboard/patient/medical-records">
                                    <Button icon={<FileProtectOutlined />}>
                                        Xem bệnh án
                                    </Button>
                                </Link>
                            )}

                            {selectedPrescription.appointmentId && (
                                <Link href="/dashboard/patient/appointments">
                                    <Button icon={<CalendarOutlined />}>
                                        Xem lịch hẹn
                                    </Button>
                                </Link>
                            )}
                        </Space>
                    )
                }
            >
                {selectedPrescription && (
                    <Space direction="vertical" size={20} style={{ width: '100%' }}>
                        <Descriptions
                            bordered
                            column={1}
                            size="small"
                            title={getPrescriptionTitle(selectedPrescription)}
                        >
                            <Descriptions.Item label="Mã đơn thuốc">
                                <Tag color="blue">
                                    {getPrescriptionCode(selectedPrescription)}
                                </Tag>
                            </Descriptions.Item>

                            <Descriptions.Item label="Trạng thái">
                                <StatusTag
                                    value={selectedPrescription.status || 'ISSUED'}
                                />
                            </Descriptions.Item>

                            <Descriptions.Item label="Chuyên khoa">
                                {selectedPrescription.specialtyName ||
                                    'Chưa cập nhật'}
                            </Descriptions.Item>

                            <Descriptions.Item label="Bác sĩ">
                                {selectedPrescription.doctorName ||
                                    'Chưa cập nhật'}
                            </Descriptions.Item>

                            <Descriptions.Item label="Email bác sĩ">
                                {selectedPrescription.doctorEmail ||
                                    'Chưa cập nhật'}
                            </Descriptions.Item>

                            <Descriptions.Item label="Chẩn đoán">
                                {selectedPrescription.diagnosisSummary ||
                                    selectedPrescription.diagnosis ||
                                    'Chưa cập nhật'}
                            </Descriptions.Item>

                            <Descriptions.Item label="Dặn dò">
                                {selectedPrescription.advice ||
                                    selectedPrescription.note ||
                                    'Chưa cập nhật'}
                            </Descriptions.Item>

                            <Descriptions.Item label="Ngày kê">
                                {formatDateTime(
                                    getPrescriptionDate(selectedPrescription),
                                )}
                            </Descriptions.Item>

                            <Descriptions.Item label="Ngày cấp thuốc">
                                {formatDateTime(selectedPrescription.dispensedAt)}
                            </Descriptions.Item>

                            <Descriptions.Item label="Ngày hủy">
                                {formatDateTime(selectedPrescription.cancelledAt)}
                            </Descriptions.Item>
                        </Descriptions>

                        <section>
                            <h3 style={{ marginBottom: 12 }}>
                                Danh sách thuốc trong đơn
                            </h3>

                            {getPrescriptionItems(selectedPrescription).length >
                                0 ? (
                                <Space
                                    direction="vertical"
                                    size={12}
                                    style={{ width: '100%' }}
                                >
                                    {getPrescriptionItems(selectedPrescription).map(
                                        (item, index) => (
                                            <article
                                                key={
                                                    item.id ||
                                                    item.medicationId ||
                                                    `${getMedicineName(
                                                        item,
                                                    )}-${index}`
                                                }
                                                className={styles.listCard}
                                            >
                                                <div className={styles.listTitle}>
                                                    <strong>
                                                        {index + 1}.{' '}
                                                        {getMedicineName(item)}
                                                    </strong>

                                                    {item.medicationCode && (
                                                        <Tag color="blue">
                                                            {item.medicationCode}
                                                        </Tag>
                                                    )}
                                                </div>

                                                {item.activeIngredient && (
                                                    <p className={styles.muted}>
                                                        Hoạt chất:{' '}
                                                        <b>
                                                            {
                                                                item.activeIngredient
                                                            }
                                                        </b>
                                                    </p>
                                                )}

                                                <p className={styles.muted}>
                                                    Liều dùng:{' '}
                                                    <b>
                                                        {item.dosage ||
                                                            'Chưa cập nhật'}
                                                    </b>{' '}
                                                    · Tần suất:{' '}
                                                    <b>
                                                        {item.frequency ||
                                                            'Chưa cập nhật'}
                                                    </b>{' '}
                                                    · Thời gian:{' '}
                                                    <b>
                                                        {item.duration ||
                                                            'Chưa cập nhật'}
                                                    </b>
                                                </p>

                                                <p className={styles.muted}>
                                                    Số lượng:{' '}
                                                    <b>
                                                        {item.quantity != null
                                                            ? item.quantity
                                                            : 'Chưa cập nhật'}
                                                    </b>{' '}
                                                    {item.unit || ''}
                                                </p>

                                                <p className={styles.muted}>
                                                    Hướng dẫn:{' '}
                                                    {item.instruction ||
                                                        item.usageInstruction ||
                                                        item.note ||
                                                        'Chưa có hướng dẫn chi tiết.'}
                                                </p>
                                            </article>
                                        ),
                                    )}
                                </Space>
                            ) : (
                                <Alert
                                    type="info"
                                    showIcon
                                    message="Chưa có danh sách thuốc"
                                    description="Đơn thuốc này chưa có dữ liệu chi tiết từng thuốc."
                                />
                            )}
                        </section>
                    </Space>
                )}
            </Drawer>
        </PatientPortalFrame>
    );
}