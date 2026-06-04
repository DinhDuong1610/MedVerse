'use client';

import {
    Alert,
    Button,
    Card,
    Descriptions,
    Divider,
    Drawer,
    Form,
    Input,
    InputNumber,
    List,
    Modal,
    Popconfirm,
    Select,
    Space,
    Steps,
    Tag,
    message,
} from 'antd';
import {
    CheckCircleOutlined,
    DeleteOutlined,
    EditOutlined,
    FileProtectOutlined,
    MedicineBoxOutlined,
    PlusOutlined,
    ReloadOutlined,
    SafetyCertificateOutlined,
    SaveOutlined,
    SearchOutlined,
} from '@ant-design/icons';
import { useEffect, useMemo, useState } from 'react';
import DashboardFrame from '../../../_components/DashboardFrame';
import ClinicalEmptyState from '../../../_components/ClinicalEmptyState';
import ClinicalPageState from '../../../_components/ClinicalPageState';
import RoleGuardState from '../../../_components/RoleGuardState';
import StatusTag from '../../../_components/StatusTag';
import { useAuthSession } from '@/lib/auth/use-auth-session';
import { getAppointmentById } from '@/services/appointment.service';
import {
    addDiagnosis,
    completeMedicalRecord,
    createMedicalRecord,
    deleteDiagnosis,
    getMedicalRecordByAppointment,
    updateMedicalRecord,
} from '@/services/ehr.service';
import {
    getPatientAllergies,
    getPatientMedicalProfile,
    type PatientAllergy,
    type PatientMedicalProfile,
} from '@/services/patient-medical.service';
import {
    addPrescriptionItem,
    cancelPrescription,
    createPrescription,
    deletePrescriptionItem,
    finalizePrescription,
    getPrescriptionByMedicalRecord,
    runPrescriptionSafetyCheck,
    updatePrescription,
    updatePrescriptionItem,
} from '@/services/prescription.service';
import { searchMedications } from '@/services/medication.service';
import type {
    Appointment,
    MedicalRecord,
    Prescription,
    PrescriptionItem,
} from '@/types/clinical';
import styles from '../../../dashboard.module.scss';

type PageProps = {
    params: {
        appointmentId: string;
    };
};

type MedicalRecordView = MedicalRecord & {
    id: string;
    status?: string;
    patientId?: string;
    appointmentId?: string;
    chiefComplaint?: string;
    symptoms?: string;
    clinicalNote?: string;
    diagnosisText?: string;
    diagnosisSummary?: string;
    treatmentPlan?: string;
    followUpNote?: string;
    doctorAdvice?: string;
    diagnoses?: DiagnosisView[];
    createdAt?: string;
    updatedAt?: string;
    completedAt?: string;
};

type DiagnosisView = {
    id: string;
    diagnosisText?: string;
    icdCode?: string;
    icdDisplay?: string;
    note?: string;
    primary?: boolean;
};

type PrescriptionView = Prescription & {
    id: string;
    status?: string;
    note?: string;
    safetyLevel?: string;
    safetySummary?: string;
    safetyWarnings?: string[];
    items?: PrescriptionItemView[];
    prescriptionItems?: PrescriptionItemView[];
    createdAt?: string;
    updatedAt?: string;
    finalizedAt?: string;
    cancelledAt?: string;
};

type PrescriptionItemView = PrescriptionItem & {
    id: string;
    medicationId?: string;
    medicationName?: string;
    medicineName?: string;
    name?: string;
    dosage?: string;
    frequency?: string;
    duration?: string;
    quantity?: number;
    instruction?: string;
};

type MedicationOption = {
    value: string;
    label: string;
    medicationName: string;
    stockQuantity?: number;
    unit?: string;
};

type MedicalRecordFormValues = {
    chiefComplaint?: string;
    symptoms?: string;
    clinicalNote?: string;
    diagnosisText?: string;
    treatmentPlan?: string;
    followUpNote?: string;
};

type DiagnosisFormValues = {
    diagnosisText: string;
    icdCode?: string;
    icdDisplay?: string;
};

type PrescriptionNoteFormValues = {
    note?: string;
};

type PrescriptionItemFormValues = {
    medicationId: string;
    dosage: string;
    frequency: string;
    duration: string;
    quantity: number;
    instruction?: string;
};

type CancelPrescriptionFormValues = {
    reason: string;
};

function normalizeText(value?: string | null) {
    const trimmed = value?.trim();

    return trimmed ? trimmed : undefined;
}

function formatDateTime(value?: string) {
    if (!value) return 'Chưa ghi nhận';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleString('vi-VN');
}

function getAppointmentTitle(appointment?: Appointment | null) {
    if (!appointment) return 'Ca khám';

    return (
        appointment.patientName ||
        appointment.specialtyName ||
        appointment.doctorName ||
        'Ca khám'
    );
}

function getAppointmentTime(appointment?: Appointment | null) {
    if (!appointment) return 'Chưa ghi nhận';

    const start =
        appointment.startTime ||
        appointment.scheduledAt ||
        appointment.appointmentDate ||
        appointment.createdAt;

    return formatDateTime(start);
}

function getPrescriptionItems(prescription?: PrescriptionView | null) {
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
        item.medicationId ||
        'Thuốc chưa cập nhật tên'
    );
}

function isDraftPrescription(prescription?: PrescriptionView | null) {
    return String(prescription?.status || '').toUpperCase() === 'DRAFT';
}

function isFinalPrescription(prescription?: PrescriptionView | null) {
    return ['FINALIZED', 'DISPENSED', 'COMPLETED'].includes(
        String(prescription?.status || '').toUpperCase(),
    );
}

function hasCriticalSafetyAlert(prescription?: PrescriptionView | null) {
    const level = String(prescription?.safetyLevel || '').toUpperCase();

    return ['HIGH', 'CRITICAL'].includes(level);
}

function getCompleteVisitWarning(
    prescription: PrescriptionView | null,
    criticalAlert: boolean,
) {
    if (!prescription) {
        return {
            title: 'Hoàn tất ca khám khi chưa có đơn thuốc?',
            content:
                'Ca khám này chưa có đơn thuốc. Nếu bệnh nhân không cần dùng thuốc, bạn vẫn có thể hoàn tất ca khám.',
        };
    }

    if (isDraftPrescription(prescription)) {
        return {
            title: 'Chưa thể hoàn tất ca khám',
            content:
                'Đơn thuốc vẫn đang ở trạng thái nháp. Hãy hoàn tất hoặc hủy đơn thuốc trước khi hoàn tất ca khám.',
            blocked: true,
        };
    }

    if (criticalAlert) {
        return {
            title: 'Đơn thuốc có cảnh báo an toàn mức cao',
            content:
                'Đơn thuốc có cảnh báo HIGH/CRITICAL. Hãy chắc chắn đã kiểm tra kỹ trước khi hoàn tất ca khám.',
        };
    }

    return {
        title: 'Hoàn tất ca khám?',
        content:
            'Sau khi hoàn tất, bệnh án sẽ được khóa chỉnh sửa và lịch hẹn chuyển sang trạng thái hoàn thành.',
    };
}

function getSafetyTag(prescription?: PrescriptionView | null) {
    const level = String(prescription?.safetyLevel || '').toUpperCase();

    if (!level) return <Tag>Chưa kiểm tra</Tag>;
    if (level === 'CRITICAL') return <Tag color="red">Rất nguy hiểm</Tag>;
    if (level === 'HIGH') return <Tag color="volcano">Nguy cơ cao</Tag>;
    if (level === 'MEDIUM') return <Tag color="orange">Cần chú ý</Tag>;
    if (level === 'LOW') return <Tag color="green">An toàn tương đối</Tag>;

    return <Tag color="blue">{level}</Tag>;
}

export default function DoctorClinicalCasePage({ params }: PageProps) {
    const { session, loading: authLoading } = useAuthSession();

    const [recordForm] = Form.useForm<MedicalRecordFormValues>();
    const [diagnosisForm] = Form.useForm<DiagnosisFormValues>();
    const [prescriptionNoteForm] = Form.useForm<PrescriptionNoteFormValues>();
    const [itemForm] = Form.useForm<PrescriptionItemFormValues>();
    const [cancelForm] = Form.useForm<CancelPrescriptionFormValues>();

    const [appointment, setAppointment] = useState<Appointment | null>(null);
    const [medicalRecord, setMedicalRecord] =
        useState<MedicalRecordView | null>(null);
    const [prescription, setPrescription] =
        useState<PrescriptionView | null>(null);
    const [profile, setProfile] = useState<PatientMedicalProfile | null>(null);
    const [allergies, setAllergies] = useState<PatientAllergy[]>([]);

    const [selectedPrescriptionItem, setSelectedPrescriptionItem] =
        useState<PrescriptionItemView | null>(null);

    const [medicationOptions, setMedicationOptions] = useState<
        MedicationOption[]
    >([]);
    const [medicationSearching, setMedicationSearching] = useState(false);

    const [loading, setLoading] = useState(true);
    const [savingRecord, setSavingRecord] = useState(false);
    const [savingDiagnosis, setSavingDiagnosis] = useState(false);
    const [savingPrescription, setSavingPrescription] = useState(false);
    const [savingItem, setSavingItem] = useState(false);
    const [completingVisit, setCompletingVisit] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [diagnosisOpen, setDiagnosisOpen] = useState(false);
    const [itemOpen, setItemOpen] = useState(false);
    const [cancelPrescriptionOpen, setCancelPrescriptionOpen] = useState(false);
    const [patientInfoOpen, setPatientInfoOpen] = useState(false);

    const prescriptionItems = getPrescriptionItems(prescription);

    const currentStep = useMemo(() => {
        if (!medicalRecord) return 0;
        if (!prescription) return 1;
        if (isDraftPrescription(prescription)) return 2;
        if (String(medicalRecord.status || '').toUpperCase() !== 'COMPLETED') {
            return 3;
        }

        return 4;
    }, [medicalRecord, prescription]);

    const reloadPrescription = async (recordId?: string) => {
        const currentRecordId = recordId || medicalRecord?.id;

        if (!currentRecordId) {
            setPrescription(null);
            return;
        }

        try {
            const data = await getPrescriptionByMedicalRecord(currentRecordId);
            setPrescription(data as PrescriptionView);
            prescriptionNoteForm.setFieldsValue({
                note: data?.note,
            });
        } catch {
            setPrescription(null);
        }
    };

    const loadCase = async () => {
        try {
            setLoading(true);
            setError(null);

            const appointmentData = await getAppointmentById(params.appointmentId);
            setAppointment(appointmentData);

            const currentPatientId = appointmentData.patientId;

            if (currentPatientId) {
                const [profileData, allergyData] = await Promise.all([
                    getPatientMedicalProfile(currentPatientId).catch(() => null),
                    getPatientAllergies(currentPatientId).catch(() => []),
                ]);

                setProfile(profileData);
                setAllergies((allergyData || []) as PatientAllergy[]);
            }

            try {
                const recordData = await getMedicalRecordByAppointment(
                    params.appointmentId,
                );

                setMedicalRecord(recordData as MedicalRecordView);

                recordForm.setFieldsValue({
                    chiefComplaint: recordData.chiefComplaint,
                    symptoms: recordData.symptoms,
                    clinicalNote: recordData.clinicalNote,
                    diagnosisText:
                        recordData.diagnosisText ||
                        recordData.diagnosisSummary,
                    treatmentPlan: recordData.treatmentPlan,
                    followUpNote:
                        recordData.followUpNote ||
                        recordData.doctorAdvice,
                });

                await reloadPrescription(recordData.id);
            } catch {
                setMedicalRecord(null);
                setPrescription(null);
                recordForm.resetFields();
            }
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Không thể tải ca khám.',
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!session) return;

        loadCase();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session, params.appointmentId]);

    const handleSearchMedication = async (keyword: string) => {
        try {
            setMedicationSearching(true);

            const medications = await searchMedications(keyword);

            setMedicationOptions(
                medications.map((medication) => {
                    const item = medication as {
                        id: string;
                        name?: string;
                        medicationName?: string;
                        code?: string;
                        stockQuantity?: number;
                        unit?: string;
                    };

                    const medicationName =
                        item.name ||
                        item.medicationName ||
                        'Thuốc chưa cập nhật tên';

                    return {
                        value: item.id,
                        label: [
                            medicationName,
                            item.code ? `Mã: ${item.code}` : null,
                            item.stockQuantity != null
                                ? `Tồn: ${item.stockQuantity}`
                                : null,
                            item.unit ? `Đơn vị: ${item.unit}` : null,
                        ]
                            .filter(Boolean)
                            .join(' · '),
                        medicationName,
                        stockQuantity: item.stockQuantity,
                        unit: item.unit,
                    };
                }),
            );
        } catch (err) {
            message.error(
                err instanceof Error
                    ? err.message
                    : 'Không thể tìm thuốc trong kho.',
            );
        } finally {
            setMedicationSearching(false);
        }
    };

    const handleCreateRecord = async () => {
        if (!appointment) return;

        try {
            setSavingRecord(true);

            const record = await createMedicalRecord({
                appointmentId: params.appointmentId,
            });

            message.success('Đã mở bệnh án cho ca khám.');
            setMedicalRecord(record as MedicalRecordView);
            await loadCase();
        } catch (err) {
            message.error(
                err instanceof Error
                    ? err.message
                    : 'Không thể tạo bệnh án.',
            );
        } finally {
            setSavingRecord(false);
        }
    };

    const handleSaveRecord = async (values: MedicalRecordFormValues) => {
        if (!medicalRecord) {
            message.warning('Hãy mở bệnh án trước khi lưu thông tin khám.');
            return;
        }

        try {
            setSavingRecord(true);

            const payload = {
                chiefComplaint: normalizeText(values.chiefComplaint),
                symptoms: normalizeText(values.symptoms),
                clinicalNote: normalizeText(values.clinicalNote),
                diagnosisText: normalizeText(values.diagnosisText),
                diagnosisSummary: normalizeText(values.diagnosisText),
                treatmentPlan: normalizeText(values.treatmentPlan),
                followUpNote: normalizeText(values.followUpNote),
                doctorAdvice: normalizeText(values.followUpNote),
            };

            const updated = await updateMedicalRecord(medicalRecord.id, payload);

            setMedicalRecord(updated as MedicalRecordView);
            message.success('Đã lưu bệnh án.');
        } catch (err) {
            message.error(
                err instanceof Error ? err.message : 'Không thể lưu bệnh án.',
            );
        } finally {
            setSavingRecord(false);
        }
    };

    const handleAddDiagnosis = async (values: DiagnosisFormValues) => {
        if (!medicalRecord) return;

        try {
            setSavingDiagnosis(true);

            await addDiagnosis(medicalRecord.id, {
                diagnosisText: values.diagnosisText.trim(),
                icdCode: normalizeText(values.icdCode),
                icdDisplay: normalizeText(values.icdDisplay),
            });

            message.success('Đã thêm chẩn đoán.');
            diagnosisForm.resetFields();
            setDiagnosisOpen(false);
            await loadCase();
        } catch (err) {
            message.error(
                err instanceof Error ? err.message : 'Không thể thêm chẩn đoán.',
            );
        } finally {
            setSavingDiagnosis(false);
        }
    };

    const handleDeleteDiagnosis = async (diagnosisId: string) => {
        if (!medicalRecord) return;

        try {
            await deleteDiagnosis(medicalRecord.id, diagnosisId);
            message.success('Đã xóa chẩn đoán.');
            await loadCase();
        } catch (err) {
            message.error(
                err instanceof Error ? err.message : 'Không thể xóa chẩn đoán.',
            );
        }
    };

    const handleCreatePrescription = async () => {
        if (!medicalRecord) {
            message.warning('Hãy mở bệnh án trước khi tạo đơn thuốc.');
            return;
        }

        try {
            setSavingPrescription(true);

            const data = await createPrescription({
                medicalRecordId: medicalRecord.id,
                note: prescriptionNoteForm.getFieldValue('note'),
            });

            setPrescription(data as PrescriptionView);
            message.success('Đã tạo đơn thuốc.');
            await reloadPrescription(medicalRecord.id);
        } catch (err) {
            message.error(
                err instanceof Error
                    ? err.message
                    : 'Không thể tạo đơn thuốc.',
            );
        } finally {
            setSavingPrescription(false);
        }
    };

    const handleUpdatePrescriptionNote = async (
        values: PrescriptionNoteFormValues,
    ) => {
        if (!prescription) return;

        try {
            setSavingPrescription(true);

            const data = await updatePrescription(prescription.id, {
                note: normalizeText(values.note) || null,
            });

            setPrescription(data as PrescriptionView);
            message.success('Đã lưu ghi chú đơn thuốc.');
            await reloadPrescription();
        } catch (err) {
            message.error(
                err instanceof Error
                    ? err.message
                    : 'Không thể cập nhật đơn thuốc.',
            );
        } finally {
            setSavingPrescription(false);
        }
    };

    const openCreateItem = () => {
        setSelectedPrescriptionItem(null);
        itemForm.resetFields();
        setMedicationOptions([]);
        setItemOpen(true);
    };

    const openEditItem = (item: PrescriptionItemView) => {
        setSelectedPrescriptionItem(item);

        const medicationName = getMedicationName(item);

        setMedicationOptions([
            {
                value: item.medicationId || '',
                label: medicationName,
                medicationName,
            },
        ]);

        itemForm.setFieldsValue({
            medicationId: item.medicationId,
            dosage: item.dosage,
            frequency: item.frequency,
            duration: item.duration,
            quantity: item.quantity,
            instruction: item.instruction,
        });

        setItemOpen(true);
    };

    const handleSaveItem = async (values: PrescriptionItemFormValues) => {
        if (!prescription) return;

        try {
            setSavingItem(true);

            const payload = {
                medicationId: values.medicationId,
                dosage: values.dosage,
                frequency: values.frequency,
                duration: values.duration,
                quantity: values.quantity,
                instruction: normalizeText(values.instruction),
            };

            if (selectedPrescriptionItem) {
                await updatePrescriptionItem(
                    prescription.id,
                    selectedPrescriptionItem.id,
                    payload,
                );
                message.success('Đã cập nhật thuốc trong đơn.');
            } else {
                await addPrescriptionItem(prescription.id, payload);
                message.success('Đã thêm thuốc vào đơn.');
            }

            setItemOpen(false);
            setSelectedPrescriptionItem(null);
            itemForm.resetFields();
            await reloadPrescription();
        } catch (err) {
            message.error(
                err instanceof Error
                    ? err.message
                    : 'Không thể lưu thuốc trong đơn.',
            );
        } finally {
            setSavingItem(false);
        }
    };

    const handleDeleteItem = async (item: PrescriptionItemView) => {
        if (!prescription) return;

        try {
            await deletePrescriptionItem(prescription.id, item.id);
            message.success('Đã xóa thuốc khỏi đơn.');
            await reloadPrescription();
        } catch (err) {
            message.error(
                err instanceof Error
                    ? err.message
                    : 'Không thể xóa thuốc khỏi đơn.',
            );
        }
    };

    const handleSafetyCheck = async () => {
        if (!prescription) return;

        try {
            setSavingPrescription(true);
            const data = await runPrescriptionSafetyCheck(prescription.id);
            setPrescription(data as PrescriptionView);
            message.success('Đã chạy kiểm tra an toàn đơn thuốc.');
            await reloadPrescription();
        } catch (err) {
            message.error(
                err instanceof Error
                    ? err.message
                    : 'Không thể chạy kiểm tra an toàn.',
            );
        } finally {
            setSavingPrescription(false);
        }
    };

    const handleFinalizePrescription = async () => {
        if (!prescription) return;

        try {
            setSavingPrescription(true);
            const data = await finalizePrescription(prescription.id);
            setPrescription(data as PrescriptionView);
            message.success('Đã hoàn tất đơn thuốc.');
            await reloadPrescription();
        } catch (err) {
            message.error(
                err instanceof Error
                    ? err.message
                    : 'Không thể hoàn tất đơn thuốc.',
            );
        } finally {
            setSavingPrescription(false);
        }
    };

    const handleCancelPrescription = async (
        values: CancelPrescriptionFormValues,
    ) => {
        if (!prescription) return;

        try {
            setSavingPrescription(true);
            await cancelPrescription(prescription.id, values.reason.trim());
            message.success('Đã hủy đơn thuốc.');
            setCancelPrescriptionOpen(false);
            cancelForm.resetFields();
            await reloadPrescription();
        } catch (err) {
            message.error(
                err instanceof Error ? err.message : 'Không thể hủy đơn thuốc.',
            );
        } finally {
            setSavingPrescription(false);
        }
    };

    const handleCompleteVisit = () => {
        if (!medicalRecord) return;

        const warning = getCompleteVisitWarning(
            prescription,
            hasCriticalSafetyAlert(prescription),
        );

        Modal.confirm({
            title: warning.title,
            content: warning.content,
            okText: warning.blocked ? 'Đã hiểu' : 'Hoàn tất ca khám',
            cancelText: warning.blocked ? undefined : 'Đóng',
            okButtonProps: {
                danger: hasCriticalSafetyAlert(prescription),
                disabled: false,
            },
            onOk: async () => {
                if (warning.blocked) return;

                try {
                    setCompletingVisit(true);

                    await completeMedicalRecord(medicalRecord.id);

                    message.success('Đã hoàn tất ca khám.');
                    await loadCase();
                } catch (err) {
                    message.error(
                        err instanceof Error
                            ? err.message
                            : 'Không thể hoàn tất ca khám.',
                    );
                } finally {
                    setCompletingVisit(false);
                }
            },
        });
    };

    if (authLoading || !session) {
        return <ClinicalPageState loading>Loading</ClinicalPageState>;
    }

    return (
        <DashboardFrame
            session={session}
            title="Không gian khám bệnh"
            subtitle="Bác sĩ cập nhật bệnh án, chẩn đoán, kê đơn và hoàn tất ca khám"
        >
            <RoleGuardState session={session} allow={['DOCTOR']}>
                <ClinicalPageState loading={loading} error={error}>
                    <div className={styles.roleDashboard}>
                        <section className={styles.heroCard}>
                            <div>
                                <span>Clinical Case Workspace</span>
                                <h2>{getAppointmentTitle(appointment)}</h2>
                                <p>
                                    Thời gian khám:{' '}
                                    <b>{getAppointmentTime(appointment)}</b> ·
                                    Trạng thái:{' '}
                                    <StatusTag
                                        value={appointment?.status || 'SCHEDULED'}
                                    />
                                </p>

                                <Space wrap style={{ marginTop: 20 }}>
                                    {!medicalRecord ? (
                                        <Button
                                            type="primary"
                                            icon={<FileProtectOutlined />}
                                            loading={savingRecord}
                                            onClick={handleCreateRecord}
                                        >
                                            Mở bệnh án
                                        </Button>
                                    ) : (
                                        <Button
                                            type="primary"
                                            icon={<CheckCircleOutlined />}
                                            loading={completingVisit}
                                            onClick={handleCompleteVisit}
                                        >
                                            Hoàn tất ca khám
                                        </Button>
                                    )}

                                    {/* <Button
                                        icon={<ReloadOutlined />}
                                        onClick={loadCase}
                                        loading={loading}
                                    >
                                        Làm mới
                                    </Button>

                                    <Button
                                        icon={<SafetyCertificateOutlined />}
                                        onClick={() => setPatientInfoOpen(true)}
                                    >
                                        Hồ sơ sức khỏe
                                    </Button> */}
                                </Space>
                            </div>

                            <div className={styles.pulseCard}>
                                <strong>{currentStep + 1}/5</strong>
                                <span>tiến độ xử lý ca khám</span>
                            </div>
                        </section>

                        <Card className={styles.detailCard}>
                            <Steps
                                current={currentStep}
                                items={[
                                    { title: 'Mở bệnh án' },
                                    { title: 'Ghi nhận khám' },
                                    { title: 'Kê đơn' },
                                    { title: 'Kiểm tra & hoàn tất' },
                                    { title: 'Đóng ca' },
                                ]}
                            />
                        </Card>

                        <section className={styles.detailGrid}>
                            <Card
                                className={styles.detailCard}
                                title="Thông tin lịch hẹn"
                            >
                                <Descriptions bordered column={1} size="small">
                                    <Descriptions.Item label="Bệnh nhân">
                                        {appointment?.patientName || 'Chưa rõ'}
                                    </Descriptions.Item>

                                    <Descriptions.Item label="Email">
                                        {appointment?.patientEmail ||
                                            'Chưa cập nhật'}
                                    </Descriptions.Item>

                                    <Descriptions.Item label="Số điện thoại">
                                        {appointment?.patientPhone ||
                                            'Chưa cập nhật'}
                                    </Descriptions.Item>

                                    <Descriptions.Item label="Chuyên khoa">
                                        {appointment?.specialtyName ||
                                            'Chưa cập nhật'}
                                    </Descriptions.Item>

                                    <Descriptions.Item label="Hình thức khám">
                                        {appointment?.type || 'OFFLINE'}
                                    </Descriptions.Item>

                                    <Descriptions.Item label="Lý do / triệu chứng">
                                        {appointment?.symptoms ||
                                            appointment?.reason ||
                                            appointment?.note ||
                                            'Chưa cập nhật'}
                                    </Descriptions.Item>
                                </Descriptions>
                            </Card>

                            <Card
                                className={styles.detailCard}
                                title="Cảnh báo sức khỏe"
                            >
                                <Space
                                    direction="vertical"
                                    size={12}
                                    style={{ width: '100%' }}
                                >
                                    <Alert
                                        type={allergies.length > 0 ? 'warning' : 'info'}
                                        showIcon
                                        message={`${allergies.length} dị ứng được ghi nhận`}
                                        description={
                                            allergies.length > 0
                                                ? allergies
                                                    .map((item) => item.allergen)
                                                    .join(', ')
                                                : 'Bệnh nhân chưa ghi nhận dị ứng.'
                                        }
                                    />

                                    <Alert
                                        type="info"
                                        showIcon
                                        message="Thông tin hồ sơ y tế"
                                        description={`Nhóm máu: ${profile?.bloodType || 'Chưa cập nhật'
                                            } · Bệnh nền: ${profile?.chronicDiseases ||
                                            profile?.chronicConditionsNote ||
                                            'Chưa cập nhật'
                                            }`}
                                    />

                                    <Alert
                                        type="success"
                                        showIcon
                                        message="Thuốc đang dùng"
                                        description={
                                            profile?.currentMedicationsNote ||
                                            'Chưa cập nhật thuốc đang sử dụng.'
                                        }
                                    />
                                </Space>
                            </Card>
                        </section>

                        <section className={styles.detailGrid}>
                            <Card
                                className={styles.detailCard}
                                title="Bệnh án lâm sàng"
                                extra={
                                    medicalRecord && (
                                        <StatusTag
                                            value={medicalRecord.status || 'DRAFT'}
                                        />
                                    )
                                }
                            >
                                {!medicalRecord ? (
                                    <ClinicalEmptyState
                                        title="Chưa mở bệnh án"
                                        description="Hãy mở bệnh án để bắt đầu ghi nhận thông tin khám."
                                        actionText="Mở bệnh án"
                                        onAction={handleCreateRecord}
                                    />
                                ) : (
                                    <Form
                                        form={recordForm}
                                        layout="vertical"
                                        onFinish={handleSaveRecord}
                                        requiredMark={false}
                                    >
                                        <Form.Item
                                            label="Lý do khám chính"
                                            name="chiefComplaint"
                                        >
                                            <Input.TextArea rows={2} />
                                        </Form.Item>

                                        <Form.Item
                                            label="Triệu chứng"
                                            name="symptoms"
                                        >
                                            <Input.TextArea rows={3} />
                                        </Form.Item>

                                        <Form.Item
                                            label="Ghi chú lâm sàng"
                                            name="clinicalNote"
                                        >
                                            <Input.TextArea rows={4} />
                                        </Form.Item>

                                        <Form.Item
                                            label="Tóm tắt chẩn đoán"
                                            name="diagnosisText"
                                        >
                                            <Input.TextArea rows={3} />
                                        </Form.Item>

                                        <Form.Item
                                            label="Kế hoạch điều trị"
                                            name="treatmentPlan"
                                        >
                                            <Input.TextArea rows={3} />
                                        </Form.Item>

                                        <Form.Item
                                            label="Dặn dò / tái khám"
                                            name="followUpNote"
                                        >
                                            <Input.TextArea rows={3} />
                                        </Form.Item>

                                        <Button
                                            type="primary"
                                            htmlType="submit"
                                            icon={<SaveOutlined />}
                                            loading={savingRecord}
                                        >
                                            Lưu bệnh án
                                        </Button>
                                    </Form>
                                )}
                            </Card>

                            <Card
                                className={styles.detailCard}
                                title="Chẩn đoán ICD"
                                extra={
                                    medicalRecord && (
                                        <Button
                                            icon={<PlusOutlined />}
                                            onClick={() => setDiagnosisOpen(true)}
                                        >
                                            Thêm chẩn đoán
                                        </Button>
                                    )
                                }
                            >
                                {!medicalRecord ? (
                                    <Alert
                                        type="info"
                                        showIcon
                                        message="Chưa có bệnh án"
                                        description="Mở bệnh án trước khi thêm chẩn đoán."
                                    />
                                ) : !medicalRecord.diagnoses ||
                                    medicalRecord.diagnoses.length === 0 ? (
                                    <ClinicalEmptyState
                                        title="Chưa có chẩn đoán"
                                        description="Thêm chẩn đoán ICD hoặc mô tả chẩn đoán tự do."
                                    />
                                ) : (
                                    <List
                                        dataSource={medicalRecord.diagnoses}
                                        renderItem={(diagnosis) => (
                                            <List.Item
                                                className={styles.cleanListItem}
                                                actions={[
                                                    <Popconfirm
                                                        key="delete"
                                                        title="Xóa chẩn đoán?"
                                                        okText="Xóa"
                                                        cancelText="Đóng"
                                                        onConfirm={() =>
                                                            handleDeleteDiagnosis(
                                                                diagnosis.id,
                                                            )
                                                        }
                                                    >
                                                        <Button
                                                            danger
                                                            icon={
                                                                <DeleteOutlined />
                                                            }
                                                        >
                                                            Xóa
                                                        </Button>
                                                    </Popconfirm>,
                                                ]}
                                            >
                                                <List.Item.Meta
                                                    title={
                                                        <Space wrap>
                                                            <strong>
                                                                {diagnosis.icdCode ||
                                                                    'Chẩn đoán'}
                                                            </strong>
                                                            {diagnosis.primary && (
                                                                <Tag color="red">
                                                                    Chính
                                                                </Tag>
                                                            )}
                                                        </Space>
                                                    }
                                                    description={
                                                        diagnosis.icdDisplay ||
                                                        diagnosis.diagnosisText ||
                                                        diagnosis.note ||
                                                        'Không có mô tả'
                                                    }
                                                />
                                            </List.Item>
                                        )}
                                    />
                                )}
                            </Card>
                        </section>

                        <Card
                            className={styles.detailCard}
                            title="Đơn thuốc"
                            extra={
                                prescription ? (
                                    <Space wrap>
                                        {getSafetyTag(prescription)}

                                        <StatusTag
                                            value={prescription.status || 'DRAFT'}
                                        />
                                    </Space>
                                ) : null
                            }
                        >
                            {!medicalRecord ? (
                                <Alert
                                    type="info"
                                    showIcon
                                    message="Chưa thể kê đơn"
                                    description="Hãy mở bệnh án trước khi tạo đơn thuốc."
                                />
                            ) : !prescription ? (
                                <ClinicalEmptyState
                                    title="Chưa có đơn thuốc"
                                    description="Tạo đơn thuốc nếu bệnh nhân cần sử dụng thuốc sau khám."
                                    actionText="Tạo đơn thuốc"
                                    onAction={handleCreatePrescription}
                                />
                            ) : (
                                <>
                                    <Form
                                        form={prescriptionNoteForm}
                                        layout="vertical"
                                        onFinish={handleUpdatePrescriptionNote}
                                        requiredMark={false}
                                    >
                                        <Form.Item
                                            label="Ghi chú đơn thuốc"
                                            name="note"
                                        >
                                            <Input.TextArea
                                                rows={3}
                                                placeholder="Dặn dò chung cho đơn thuốc..."
                                            />
                                        </Form.Item>

                                        <Space wrap>
                                            <Button
                                                htmlType="submit"
                                                icon={<SaveOutlined />}
                                                loading={savingPrescription}
                                            >
                                                Lưu ghi chú
                                            </Button>

                                            <Button
                                                icon={<PlusOutlined />}
                                                disabled={
                                                    !isDraftPrescription(
                                                        prescription,
                                                    )
                                                }
                                                onClick={openCreateItem}
                                            >
                                                Thêm thuốc
                                            </Button>

                                            <Button
                                                icon={<SafetyCertificateOutlined />}
                                                loading={savingPrescription}
                                                onClick={handleSafetyCheck}
                                            >
                                                Kiểm tra an toàn
                                            </Button>

                                            <Button
                                                type="primary"
                                                icon={<MedicineBoxOutlined />}
                                                disabled={
                                                    !isDraftPrescription(
                                                        prescription,
                                                    ) ||
                                                    prescriptionItems.length === 0
                                                }
                                                loading={savingPrescription}
                                                onClick={handleFinalizePrescription}
                                            >
                                                Hoàn tất đơn thuốc
                                            </Button>

                                            <Button
                                                danger
                                                disabled={
                                                    isFinalPrescription(
                                                        prescription,
                                                    )
                                                }
                                                onClick={() =>
                                                    setCancelPrescriptionOpen(true)
                                                }
                                            >
                                                Hủy đơn thuốc
                                            </Button>
                                        </Space>
                                    </Form>

                                    <Divider />

                                    {prescriptionItems.length === 0 ? (
                                        <ClinicalEmptyState
                                            title="Chưa có thuốc trong đơn"
                                            description="Thêm thuốc, liều dùng, tần suất và hướng dẫn sử dụng."
                                        />
                                    ) : (
                                        <List
                                            dataSource={prescriptionItems}
                                            renderItem={(item, index) => (
                                                <List.Item
                                                    className={
                                                        styles.cleanListItem
                                                    }
                                                    actions={[
                                                        <Button
                                                            key="edit"
                                                            icon={
                                                                <EditOutlined />
                                                            }
                                                            disabled={
                                                                !isDraftPrescription(
                                                                    prescription,
                                                                )
                                                            }
                                                            onClick={() =>
                                                                openEditItem(item)
                                                            }
                                                        >
                                                            Sửa
                                                        </Button>,
                                                        <Popconfirm
                                                            key="delete"
                                                            title="Xóa thuốc khỏi đơn?"
                                                            okText="Xóa"
                                                            cancelText="Đóng"
                                                            onConfirm={() =>
                                                                handleDeleteItem(
                                                                    item,
                                                                )
                                                            }
                                                        >
                                                            <Button
                                                                danger
                                                                icon={
                                                                    <DeleteOutlined />
                                                                }
                                                                disabled={
                                                                    !isDraftPrescription(
                                                                        prescription,
                                                                    )
                                                                }
                                                            >
                                                                Xóa
                                                            </Button>
                                                        </Popconfirm>,
                                                    ]}
                                                >
                                                    <List.Item.Meta
                                                        title={
                                                            <Space wrap>
                                                                <strong>
                                                                    {index + 1}.{' '}
                                                                    {getMedicationName(
                                                                        item,
                                                                    )}
                                                                </strong>
                                                                <Tag color="blue">
                                                                    {item.quantity ||
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
                                                                        {item.dosage ||
                                                                            'N/A'}
                                                                    </b>{' '}
                                                                    · Tần suất:{' '}
                                                                    <b>
                                                                        {item.frequency ||
                                                                            'N/A'}
                                                                    </b>{' '}
                                                                    · Thời gian:{' '}
                                                                    <b>
                                                                        {item.duration ||
                                                                            'N/A'}
                                                                    </b>
                                                                </p>
                                                                <p>
                                                                    Hướng dẫn:{' '}
                                                                    {item.instruction ||
                                                                        'Chưa có hướng dẫn'}
                                                                </p>
                                                            </div>
                                                        }
                                                    />
                                                </List.Item>
                                            )}
                                        />
                                    )}

                                    {prescription.safetySummary && (
                                        <Alert
                                            type={
                                                hasCriticalSafetyAlert(prescription)
                                                    ? 'warning'
                                                    : 'info'
                                            }
                                            showIcon
                                            style={{ marginTop: 16 }}
                                            message="Kết quả kiểm tra an toàn"
                                            description={prescription.safetySummary}
                                        />
                                    )}
                                </>
                            )}
                        </Card>
                    </div>

                    <Modal
                        title="Thêm chẩn đoán"
                        open={diagnosisOpen}
                        onCancel={() => setDiagnosisOpen(false)}
                        footer={null}
                        destroyOnClose
                    >
                        <Form
                            form={diagnosisForm}
                            layout="vertical"
                            onFinish={handleAddDiagnosis}
                            requiredMark={false}
                        >
                            <Form.Item label="Mã ICD" name="icdCode">
                                <Input placeholder="VD: J00, E11..." />
                            </Form.Item>

                            <Form.Item
                                label="Tên chẩn đoán ICD"
                                name="icdDisplay"
                            >
                                <Input placeholder="VD: Viêm mũi họng cấp..." />
                            </Form.Item>

                            <Form.Item
                                label="Mô tả chẩn đoán"
                                name="diagnosisText"
                                rules={[
                                    {
                                        required: true,
                                        message: 'Nhập mô tả chẩn đoán.',
                                    },
                                ]}
                            >
                                <Input.TextArea rows={4} />
                            </Form.Item>

                            <Button
                                type="primary"
                                htmlType="submit"
                                loading={savingDiagnosis}
                                block
                            >
                                Thêm chẩn đoán
                            </Button>
                        </Form>
                    </Modal>

                    <Modal
                        title={
                            selectedPrescriptionItem
                                ? 'Cập nhật thuốc trong đơn'
                                : 'Thêm thuốc từ kho vào đơn'
                        }
                        open={itemOpen}
                        onCancel={() => {
                            setItemOpen(false);
                            setSelectedPrescriptionItem(null);
                        }}
                        footer={null}
                        destroyOnClose
                    >
                        <Form
                            form={itemForm}
                            layout="vertical"
                            onFinish={handleSaveItem}
                            requiredMark={false}
                        >
                            <Form.Item
                                label="Thuốc trong kho"
                                name="medicationId"
                                rules={[
                                    {
                                        required: true,
                                        message: 'Vui lòng chọn thuốc trong kho.',
                                    },
                                ]}
                            >
                                <Select
                                    showSearch
                                    filterOption={false}
                                    placeholder="Nhập tên thuốc hoặc mã thuốc để tìm"
                                    loading={medicationSearching}
                                    options={medicationOptions}
                                    onSearch={handleSearchMedication}
                                    onFocus={() => {
                                        if (medicationOptions.length === 0) {
                                            handleSearchMedication('');
                                        }
                                    }}
                                    notFoundContent={
                                        medicationSearching
                                            ? 'Đang tìm thuốc...'
                                            : 'Không tìm thấy thuốc phù hợp'
                                    }
                                />
                            </Form.Item>

                            <Form.Item
                                label="Liều dùng"
                                name="dosage"
                                rules={[
                                    {
                                        required: true,
                                        message: 'Nhập liều dùng.',
                                    },
                                ]}
                            >
                                <Input placeholder="VD: 500mg/lần" />
                            </Form.Item>

                            <Form.Item
                                label="Tần suất"
                                name="frequency"
                                rules={[
                                    {
                                        required: true,
                                        message: 'Nhập tần suất.',
                                    },
                                ]}
                            >
                                <Input placeholder="VD: 2 lần/ngày" />
                            </Form.Item>

                            <Form.Item
                                label="Thời gian dùng"
                                name="duration"
                                rules={[
                                    {
                                        required: true,
                                        message: 'Nhập thời gian dùng.',
                                    },
                                ]}
                            >
                                <Input placeholder="VD: 5 ngày" />
                            </Form.Item>

                            <Form.Item
                                label="Số lượng"
                                name="quantity"
                                rules={[
                                    {
                                        required: true,
                                        message: 'Nhập số lượng.',
                                    },
                                ]}
                            >
                                <InputNumber min={1} style={{ width: '100%' }} />
                            </Form.Item>

                            <Form.Item label="Hướng dẫn" name="instruction">
                                <Input.TextArea
                                    rows={3}
                                    placeholder="VD: Uống sau ăn, uống nhiều nước..."
                                />
                            </Form.Item>

                            <Button
                                type="primary"
                                htmlType="submit"
                                loading={savingItem}
                                block
                            >
                                {selectedPrescriptionItem
                                    ? 'Lưu thay đổi'
                                    : 'Thêm thuốc'}
                            </Button>
                        </Form>
                    </Modal>

                    <Modal
                        title="Hủy đơn thuốc"
                        open={cancelPrescriptionOpen}
                        onCancel={() => setCancelPrescriptionOpen(false)}
                        footer={null}
                        destroyOnClose
                    >
                        <Form
                            form={cancelForm}
                            layout="vertical"
                            onFinish={handleCancelPrescription}
                            requiredMark={false}
                        >
                            <Alert
                                type="warning"
                                showIcon
                                message="Đơn thuốc sẽ bị hủy"
                                description="Chỉ hủy đơn thuốc khi bác sĩ chắc chắn không cần sử dụng đơn này."
                                style={{ marginBottom: 16 }}
                            />

                            <Form.Item
                                label="Lý do hủy"
                                name="reason"
                                rules={[
                                    {
                                        required: true,
                                        message: 'Nhập lý do hủy.',
                                    },
                                ]}
                            >
                                <Input.TextArea rows={4} />
                            </Form.Item>

                            <Button
                                danger
                                htmlType="submit"
                                loading={savingPrescription}
                                block
                            >
                                Xác nhận hủy đơn thuốc
                            </Button>
                        </Form>
                    </Modal>

                    <Drawer
                        title="Hồ sơ sức khỏe bệnh nhân"
                        open={patientInfoOpen}
                        width={620}
                        onClose={() => setPatientInfoOpen(false)}
                    >
                        <Space
                            direction="vertical"
                            size={20}
                            style={{ width: '100%' }}
                        >
                            <Descriptions bordered column={1} size="small">
                                <Descriptions.Item label="Nhóm máu">
                                    {profile?.bloodType || 'Chưa cập nhật'}
                                </Descriptions.Item>

                                <Descriptions.Item label="Chiều cao">
                                    {profile?.heightCm
                                        ? `${profile.heightCm} cm`
                                        : 'Chưa cập nhật'}
                                </Descriptions.Item>

                                <Descriptions.Item label="Cân nặng">
                                    {profile?.weightKg
                                        ? `${profile.weightKg} kg`
                                        : 'Chưa cập nhật'}
                                </Descriptions.Item>

                                <Descriptions.Item label="Bệnh nền">
                                    {profile?.chronicDiseases ||
                                        profile?.chronicConditionsNote ||
                                        'Chưa cập nhật'}
                                </Descriptions.Item>

                                <Descriptions.Item label="Tiền sử bệnh">
                                    {profile?.medicalHistory || 'Chưa cập nhật'}
                                </Descriptions.Item>

                                <Descriptions.Item label="Thuốc đang dùng">
                                    {profile?.currentMedicationsNote ||
                                        'Chưa cập nhật'}
                                </Descriptions.Item>
                            </Descriptions>

                            <section>
                                <h3>Dị ứng</h3>

                                {allergies.length === 0 ? (
                                    <Alert
                                        type="info"
                                        showIcon
                                        message="Chưa ghi nhận dị ứng"
                                    />
                                ) : (
                                    <Space wrap>
                                        {allergies.map((item) => (
                                            <Tag key={item.id} color="red">
                                                {item.allergen}
                                                {item.severity
                                                    ? ` · ${item.severity}`
                                                    : ''}
                                            </Tag>
                                        ))}
                                    </Space>
                                )}
                            </section>
                        </Space>
                    </Drawer>
                </ClinicalPageState>
            </RoleGuardState>
        </DashboardFrame>
    );
}