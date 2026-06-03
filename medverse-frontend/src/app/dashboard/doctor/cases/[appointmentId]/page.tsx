'use client';

import {
    Alert,
    Button,
    Card,
    Divider,
    Form,
    Input,
    InputNumber,
    List,
    Modal,
    Popconfirm,
    Skeleton,
    Space,
    Tag,
    message,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';
import DashboardFrame from '../../../_components/DashboardFrame';
import RoleGuardState from '../../../_components/RoleGuardState';
import StatusTag from '../../../_components/StatusTag';
import { hasAnyPermission } from '@/lib/auth/roles';
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
import type {
    Allergy,
    Appointment,
    MedicalRecord,
    PatientMedicalProfile,
    Prescription,
    PrescriptionItem,
} from '@/types/clinical';
import styles from '../../../dashboard.module.scss';
import ClinicalAiAssistPanel from './_components/ClinicalAiAssistPanel';
import DiagnosisAiSuggest from './_components/DiagnosisAiSuggest';
import MedicationSmartSelect from './_components/MedicationSmartSelect';

type PageProps = {
    params: {
        appointmentId: string;
    };
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

function isDraftPrescription(prescription?: Prescription | null) {
    return prescription?.status === 'DRAFT';
}

function getCompleteVisitWarning(
    prescription: Prescription | null,
    hasCriticalSafetyAlert: boolean,
) {
    if (!prescription) {
        return {
            title: 'Hoàn tất ca khám khi chưa có đơn thuốc?',
            content:
                'Ca khám này chưa có đơn thuốc. Nếu bệnh nhân không cần dùng thuốc, bạn vẫn có thể hoàn tất ca khám.',
        };
    }

    if (prescription.status === 'DRAFT') {
        return {
            title: 'Chưa thể hoàn tất ca khám',
            content:
                'Đơn thuốc vẫn đang ở trạng thái DRAFT. Hãy finalize hoặc cancel đơn thuốc trước khi hoàn tất ca khám.',
            blocked: true,
        };
    }

    if (hasCriticalSafetyAlert) {
        return {
            title: 'Đơn thuốc có cảnh báo an toàn mức cao',
            content:
                'Đơn thuốc có cảnh báo HIGH/CRITICAL. Hãy chắc chắn bác sĩ đã kiểm tra kỹ AI safety trước khi hoàn tất ca khám.',
        };
    }

    return {
        title: 'Hoàn tất ca khám?',
        content:
            'Sau khi hoàn tất, bệnh án sẽ bị khóa chỉnh sửa và lịch hẹn sẽ chuyển sang COMPLETED.',
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

export default function DoctorCaseDetailPage({ params }: PageProps) {
    const { session, loading: authLoading } = useAuthSession();

    const [recordForm] = Form.useForm<MedicalRecordFormValues>();
    const [diagnosisForm] = Form.useForm<DiagnosisFormValues>();
    const [prescriptionNoteForm] = Form.useForm<PrescriptionNoteFormValues>();
    const [drugForm] = Form.useForm<PrescriptionItemFormValues>();
    const [editDrugForm] = Form.useForm<PrescriptionItemFormValues>();
    const [cancelPrescriptionForm] =
        Form.useForm<CancelPrescriptionFormValues>();

    const watchedChiefComplaint = Form.useWatch('chiefComplaint', recordForm);
    const watchedSymptoms = Form.useWatch('symptoms', recordForm);
    const watchedClinicalNote = Form.useWatch('clinicalNote', recordForm);
    const watchedDiagnosisText = Form.useWatch('diagnosisText', recordForm);
    const watchedTreatmentPlan = Form.useWatch('treatmentPlan', recordForm);

    const clinicalTextForAi = useMemo(
        () =>
            [
                watchedChiefComplaint,
                watchedSymptoms,
                watchedClinicalNote,
                watchedDiagnosisText,
                watchedTreatmentPlan,
            ]
                .filter(Boolean)
                .join('\n'),
        [
            watchedChiefComplaint,
            watchedSymptoms,
            watchedClinicalNote,
            watchedDiagnosisText,
            watchedTreatmentPlan,
        ],
    );

    const appointmentId = params.appointmentId;

    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [appointment, setAppointment] = useState<Appointment | null>(null);
    const [patientProfile, setPatientProfile] =
        useState<PatientMedicalProfile | null>(null);
    const [allergies, setAllergies] = useState<Allergy[]>([]);
    const [medicalRecord, setMedicalRecord] = useState<MedicalRecord | null>(
        null,
    );
    const [prescription, setPrescription] = useState<Prescription | null>(null);

    const [editingItem, setEditingItem] = useState<PrescriptionItem | null>(
        null,
    );
    const [editItemOpen, setEditItemOpen] = useState(false);
    const [cancelPrescriptionOpen, setCancelPrescriptionOpen] = useState(false);

    const canWriteEhr = hasAnyPermission(session, ['EHR:WRITE']);
    const canWritePrescription = hasAnyPermission(session, [
        'PRESCRIPTION:WRITE',
    ]);

    const recordLocked = medicalRecord?.status === 'COMPLETED';
    const prescriptionItems = prescription?.items || [];
    const safetyAlerts = prescription?.safetyAlerts || [];

    const hasCriticalSafetyAlert = useMemo(
        () =>
            safetyAlerts.some((item) =>
                ['HIGH', 'CRITICAL'].includes(item.severity),
            ),
        [safetyAlerts],
    );

    const loadPatientSummary = async (patientId?: string) => {
        if (!patientId) {
            setPatientProfile(null);
            setAllergies([]);
            return;
        }

        const [profileResult, allergyResult] = await Promise.allSettled([
            getPatientMedicalProfile(patientId),
            getPatientAllergies(patientId),
        ]);

        if (profileResult.status === 'fulfilled') {
            setPatientProfile(profileResult.value);
        } else {
            setPatientProfile(null);
        }

        if (allergyResult.status === 'fulfilled') {
            setAllergies(allergyResult.value || []);
        } else {
            setAllergies([]);
        }
    };

    const loadCase = async () => {
        try {
            setLoading(true);
            setError(null);

            const appointmentData = await getAppointmentById(appointmentId);
            setAppointment(appointmentData);

            await loadPatientSummary(appointmentData.patientId);

            let record: MedicalRecord | null = null;

            try {
                record = await getMedicalRecordByAppointment(appointmentId);
                setMedicalRecord(record);

                recordForm.setFieldsValue({
                    chiefComplaint: record.chiefComplaint || '',
                    symptoms: record.symptoms || '',
                    clinicalNote: record.clinicalNote || '',
                    diagnosisText: record.diagnosisText || '',
                    treatmentPlan: record.treatmentPlan || '',
                    followUpNote: record.followUpNote || '',
                });
            } catch {
                setMedicalRecord(null);
                setPrescription(null);
                prescriptionNoteForm.resetFields();
            }

            if (record) {
                try {
                    const prescriptionData =
                        await getPrescriptionByMedicalRecord(record.id);

                    setPrescription(prescriptionData);

                    prescriptionNoteForm.setFieldsValue({
                        note: prescriptionData.note || '',
                    });
                } catch {
                    setPrescription(null);
                    prescriptionNoteForm.resetFields();
                }
            }
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Không thể tải chi tiết ca khám.',
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!session) return;

        if (!hasAnyPermission(session, ['EHR:READ_ANY', 'EHR:WRITE'])) {
            setError('Tài khoản hiện tại không có quyền mở ca khám.');
            setLoading(false);
            return;
        }

        loadCase();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session, appointmentId]);

    const handleSaveMedicalRecord = async (values: MedicalRecordFormValues) => {
        try {
            setActionLoading('save-record');

            const payload = {
                chiefComplaint: normalizeText(values.chiefComplaint),
                symptoms: normalizeText(values.symptoms),
                clinicalNote: normalizeText(values.clinicalNote),
                diagnosisText: normalizeText(values.diagnosisText),
                treatmentPlan: normalizeText(values.treatmentPlan),
                followUpNote: normalizeText(values.followUpNote),
            };

            let saved: MedicalRecord;

            if (medicalRecord) {
                saved = await updateMedicalRecord(medicalRecord.id, payload);
                message.success('Đã cập nhật bệnh án.');
            } else {
                saved = await createMedicalRecord({
                    appointmentId,
                    ...payload,
                });
                message.success('Đã tạo bệnh án.');
            }

            setMedicalRecord(saved);
            await loadCase();
        } catch (err) {
            message.error(
                err instanceof Error
                    ? err.message
                    : 'Không thể lưu bệnh án.',
            );
        } finally {
            setActionLoading(null);
        }
    };

    const handleCompleteMedicalRecord = () => {
        if (!medicalRecord) return;

        const warning = getCompleteVisitWarning(
            prescription,
            hasCriticalSafetyAlert,
        );

        if (warning.blocked) {
            Modal.warning({
                title: warning.title,
                content: warning.content,
                okText: 'Đã hiểu',
            });

            return;
        }

        Modal.confirm({
            title: warning.title,
            content: warning.content,
            okText: 'Hoàn tất ca khám',
            cancelText: 'Đóng',
            onOk: async () => {
                try {
                    setActionLoading('complete-record');

                    await completeMedicalRecord(medicalRecord.id);

                    message.success(
                        'Đã hoàn tất ca khám. Lịch hẹn đã chuyển sang COMPLETED.',
                    );

                    await loadCase();
                } catch (err) {
                    message.error(
                        err instanceof Error
                            ? err.message
                            : 'Không thể hoàn tất ca khám.',
                    );
                } finally {
                    setActionLoading(null);
                }
            },
        });
    };

    const handleAddDiagnosis = async (values: DiagnosisFormValues) => {
        if (!medicalRecord) {
            message.warning('Cần tạo bệnh án trước khi thêm chẩn đoán.');
            return;
        }

        try {
            setActionLoading('add-diagnosis');

            await addDiagnosis(medicalRecord.id, {
                diagnosisText: values.diagnosisText,
                icdCode: normalizeText(values.icdCode),
                icdDisplay: normalizeText(values.icdDisplay),
                codingSystem: 'ICD-10',
                source: 'MANUAL',
                confidence: 1,
                acceptedByDoctor: true,
            });

            diagnosisForm.resetFields();
            message.success('Đã thêm chẩn đoán.');
            await loadCase();
        } catch (err) {
            message.error(
                err instanceof Error
                    ? err.message
                    : 'Không thể thêm chẩn đoán.',
            );
        } finally {
            setActionLoading(null);
        }
    };

    const handleDeleteDiagnosis = async (diagnosisId: string) => {
        if (!medicalRecord) return;

        try {
            setActionLoading(diagnosisId);

            await deleteDiagnosis(medicalRecord.id, diagnosisId);

            message.success('Đã xóa chẩn đoán.');
            await loadCase();
        } catch (err) {
            message.error(
                err instanceof Error
                    ? err.message
                    : 'Không thể xóa chẩn đoán.',
            );
        } finally {
            setActionLoading(null);
        }
    };

    const handleCreatePrescription = async () => {
        if (!medicalRecord) {
            message.warning('Cần có bệnh án trước khi tạo đơn thuốc.');
            return;
        }

        try {
            setActionLoading('create-prescription');

            const created = await createPrescription({
                medicalRecordId: medicalRecord.id,
                note: 'Đơn thuốc tạo từ Doctor Clinical Workspace.',
            });

            setPrescription(created);
            prescriptionNoteForm.setFieldsValue({
                note: created.note || '',
            });

            message.success('Đã tạo đơn thuốc.');
            await loadCase();
        } catch (err) {
            message.error(
                err instanceof Error
                    ? err.message
                    : 'Không thể tạo đơn thuốc.',
            );
        } finally {
            setActionLoading(null);
        }
    };

    const handleUpdatePrescriptionNote = async (
        values: PrescriptionNoteFormValues,
    ) => {
        if (!prescription) return;

        try {
            setActionLoading('update-prescription-note');

            const updated = await updatePrescription(prescription.id, {
                note: normalizeText(values.note) || null,
            });

            setPrescription(updated);
            message.success('Đã cập nhật ghi chú đơn thuốc.');
            await loadCase();
        } catch (err) {
            message.error(
                err instanceof Error
                    ? err.message
                    : 'Không thể cập nhật đơn thuốc.',
            );
        } finally {
            setActionLoading(null);
        }
    };

    const handleAddMedication = async (values: PrescriptionItemFormValues) => {
        if (!prescription) {
            message.warning('Cần tạo đơn thuốc trước.');
            return;
        }

        try {
            setActionLoading('add-medication');

            await addPrescriptionItem(prescription.id, {
                medicationId: values.medicationId,
                dosage: values.dosage,
                frequency: values.frequency,
                duration: values.duration,
                quantity: values.quantity,
                instruction: normalizeText(values.instruction),
            });

            drugForm.resetFields();
            message.success('Đã thêm thuốc vào đơn.');
            await loadCase();
        } catch (err) {
            message.error(
                err instanceof Error
                    ? err.message
                    : 'Không thể thêm thuốc.',
            );
        } finally {
            setActionLoading(null);
        }
    };

    const openEditItemModal = (item: PrescriptionItem) => {
        setEditingItem(item);

        editDrugForm.setFieldsValue({
            medicationId: item.medicationId || item.medicationName || '',
            dosage: item.dosage || '',
            frequency: item.frequency || '',
            duration: item.duration || '',
            quantity: item.quantity || 1,
            instruction: item.instruction || '',
        });

        setEditItemOpen(true);
    };

    const handleUpdateMedication = async (values: PrescriptionItemFormValues) => {
        if (!prescription || !editingItem) return;

        try {
            setActionLoading('update-medication');

            await updatePrescriptionItem(prescription.id, editingItem.id, {
                dosage: values.dosage,
                frequency: values.frequency,
                duration: values.duration,
                quantity: values.quantity,
                instruction: normalizeText(values.instruction) || null,
            });

            message.success('Đã cập nhật thuốc trong đơn.');
            setEditItemOpen(false);
            setEditingItem(null);
            editDrugForm.resetFields();

            await loadCase();
        } catch (err) {
            message.error(
                err instanceof Error
                    ? err.message
                    : 'Không thể cập nhật thuốc.',
            );
        } finally {
            setActionLoading(null);
        }
    };

    const handleDeleteMedication = async (itemId: string) => {
        if (!prescription) return;

        try {
            setActionLoading(itemId);

            await deletePrescriptionItem(prescription.id, itemId);

            message.success('Đã xóa thuốc khỏi đơn.');
            await loadCase();
        } catch (err) {
            message.error(
                err instanceof Error
                    ? err.message
                    : 'Không thể xóa thuốc.',
            );
        } finally {
            setActionLoading(null);
        }
    };

    const handleRunSafety = async () => {
        if (!prescription) return;

        try {
            setActionLoading('safety-check');

            const checked = await runPrescriptionSafetyCheck(prescription.id);
            setPrescription(checked);

            message.success('Đã chạy AI safety check.');
            await loadCase();
        } catch (err) {
            message.error(
                err instanceof Error
                    ? err.message
                    : 'Không thể chạy AI safety.',
            );
        } finally {
            setActionLoading(null);
        }
    };

    const handleFinalizePrescription = async () => {
        if (!prescription) return;

        try {
            setActionLoading('finalize-prescription');

            const finalized = await finalizePrescription(prescription.id);
            setPrescription(finalized);

            message.success('Đã hoàn tất đơn thuốc.');
            await loadCase();
        } catch (err) {
            message.error(
                err instanceof Error
                    ? err.message
                    : 'Không thể hoàn tất đơn thuốc.',
            );
        } finally {
            setActionLoading(null);
        }
    };

    const handleCancelPrescription = async (
        values: CancelPrescriptionFormValues,
    ) => {
        if (!prescription) return;

        try {
            setActionLoading('cancel-prescription');

            await cancelPrescription(prescription.id, values.reason);

            message.success('Đã hủy đơn thuốc.');
            setCancelPrescriptionOpen(false);
            cancelPrescriptionForm.resetFields();

            await loadCase();
        } catch (err) {
            message.error(
                err instanceof Error
                    ? err.message
                    : 'Không thể hủy đơn thuốc.',
            );
        } finally {
            setActionLoading(null);
        }
    };

    if (authLoading || !session || loading) {
        return <Skeleton active paragraph={{ rows: 12 }} />;
    }

    return (
        <DashboardFrame
            session={session}
            title="Doctor Clinical Workspace"
            subtitle="Khám bệnh, AI hỗ trợ chẩn đoán, kê đơn và hoàn tất ca khám"
        >
            <RoleGuardState
                session={session}
                anyPermissions={['EHR:READ_ANY', 'EHR:WRITE']}
            >
                {error && (
                    <Alert
                        type="error"
                        showIcon
                        message="Không thể tải ca khám"
                        description={error}
                        style={{ marginBottom: 20 }}
                    />
                )}

                <section className={styles.detailGrid}>
                    <Card className={styles.detailCard} title="Thông tin lịch khám">
                        {appointment ? (
                            <div className={styles.profileMatrix}>
                                <div>
                                    <span>Bệnh nhân</span>
                                    <strong>
                                        {appointment.patientName || 'Bệnh nhân'}
                                    </strong>
                                </div>

                                <div>
                                    <span>Trạng thái</span>
                                    <strong>
                                        <StatusTag value={appointment.status} />
                                    </strong>
                                </div>

                                <div>
                                    <span>Bắt đầu</span>
                                    <strong>
                                        {formatDateTime(appointment.startTime)}
                                    </strong>
                                </div>

                                <div>
                                    <span>Kết thúc</span>
                                    <strong>
                                        {formatTime(appointment.endTime)}
                                    </strong>
                                </div>
                            </div>
                        ) : (
                            <Alert
                                type="warning"
                                showIcon
                                message="Không tìm thấy lịch khám."
                            />
                        )}
                    </Card>

                    <Card className={styles.detailCard} title="Tóm tắt bệnh nhân">
                        <div className={styles.profileMatrix}>
                            <div>
                                <span>Nhóm máu</span>
                                <strong>
                                    {patientProfile?.bloodType || 'Chưa cập nhật'}
                                </strong>
                            </div>

                            <div>
                                <span>Chiều cao / cân nặng</span>
                                <strong>
                                    {patientProfile?.heightCm || '--'} cm ·{' '}
                                    {patientProfile?.weightKg || '--'} kg
                                </strong>
                            </div>

                            <div>
                                <span>Bệnh nền</span>
                                <strong>
                                    {patientProfile?.chronicDiseases ||
                                        'Không ghi nhận'}
                                </strong>
                            </div>

                            <div>
                                <span>Thuốc đang dùng</span>
                                <strong>
                                    {patientProfile?.currentMedicationsNote ||
                                        'Không ghi nhận'}
                                </strong>
                            </div>
                        </div>

                        <Divider />

                        <h3>Dị ứng</h3>

                        {allergies.length === 0 ? (
                            <Alert
                                type="success"
                                showIcon
                                message="Chưa ghi nhận dị ứng."
                            />
                        ) : (
                            <Space wrap>
                                {allergies.map((item) => (
                                    <Tag key={item.id} color="red">
                                        {item.allergen} ·{' '}
                                        {item.severity || 'UNKNOWN'}
                                    </Tag>
                                ))}
                            </Space>
                        )}
                    </Card>

                    <Card
                        className={styles.detailCard}
                        title="Bệnh án điện tử"
                        extra={
                            medicalRecord ? (
                                <Space>
                                    <StatusTag value={medicalRecord.status} />

                                    <Button
                                        type="primary"
                                        disabled={!canWriteEhr || recordLocked}
                                        loading={
                                            actionLoading === 'complete-record'
                                        }
                                        onClick={handleCompleteMedicalRecord}
                                    >
                                        Hoàn tất ca khám
                                    </Button>
                                </Space>
                            ) : null
                        }
                    >
                        <Form
                            form={recordForm}
                            layout="vertical"
                            onFinish={handleSaveMedicalRecord}
                            disabled={!canWriteEhr || recordLocked}
                        >
                            <Form.Item label="Lý do khám" name="chiefComplaint">
                                <Input placeholder="Ví dụ: Sốt, đau họng 3 ngày" />
                            </Form.Item>

                            <Form.Item label="Triệu chứng" name="symptoms">
                                <Input.TextArea
                                    rows={3}
                                    placeholder="Mô tả triệu chứng"
                                />
                            </Form.Item>

                            <Form.Item
                                label="Ghi chú lâm sàng"
                                name="clinicalNote"
                            >
                                <Input.TextArea
                                    rows={4}
                                    placeholder="Kết quả khám lâm sàng"
                                />
                            </Form.Item>

                            <Form.Item
                                label="Chẩn đoán chính"
                                name="diagnosisText"
                            >
                                <Input placeholder="Ví dụ: Viêm họng cấp" />
                            </Form.Item>

                            <Form.Item
                                label="Kế hoạch điều trị"
                                name="treatmentPlan"
                            >
                                <Input.TextArea
                                    rows={4}
                                    placeholder="Điều trị, nghỉ ngơi, theo dõi..."
                                />
                            </Form.Item>

                            <Form.Item
                                label="Ghi chú tái khám"
                                name="followUpNote"
                            >
                                <Input.TextArea
                                    rows={2}
                                    placeholder="Tái khám sau..."
                                />
                            </Form.Item>

                            <Button
                                type="primary"
                                htmlType="submit"
                                loading={actionLoading === 'save-record'}
                                disabled={!canWriteEhr || recordLocked}
                            >
                                {medicalRecord
                                    ? 'Cập nhật bệnh án'
                                    : 'Tạo bệnh án'}
                            </Button>
                        </Form>
                    </Card>

                    <ClinicalAiAssistPanel
                        appointment={appointment}
                        patientProfile={patientProfile}
                        allergies={allergies}
                        clinicalText={clinicalTextForAi}
                        onPickDiagnosis={(item) => {
                            diagnosisForm.setFieldsValue({
                                diagnosisText: item.diagnosisText,
                                icdCode: item.icdCode,
                                icdDisplay: item.icdDisplay,
                            });

                            recordForm.setFieldValue(
                                'diagnosisText',
                                item.diagnosisText,
                            );
                        }}
                    />

                    <Card className={styles.detailCard} title="Chẩn đoán ICD">
                        <DiagnosisAiSuggest
                            onPick={(item) => {
                                diagnosisForm.setFieldsValue({
                                    diagnosisText: item.diagnosisText,
                                    icdCode: item.icdCode,
                                    icdDisplay: item.icdDisplay,
                                });
                            }}
                        />

                        <Divider />

                        <Form
                            form={diagnosisForm}
                            layout="vertical"
                            onFinish={handleAddDiagnosis}
                            disabled={
                                !canWriteEhr || !medicalRecord || recordLocked
                            }
                        >
                            <Form.Item
                                label="Chẩn đoán"
                                name="diagnosisText"
                                rules={[
                                    {
                                        required: true,
                                        message: 'Nhập chẩn đoán',
                                    },
                                ]}
                            >
                                <Input placeholder="Viêm họng cấp" />
                            </Form.Item>

                            <Space.Compact style={{ width: '100%' }}>
                                <Form.Item
                                    name="icdCode"
                                    style={{ width: '35%' }}
                                >
                                    <Input placeholder="J02" />
                                </Form.Item>

                                <Form.Item
                                    name="icdDisplay"
                                    style={{ width: '65%' }}
                                >
                                    <Input placeholder="Acute pharyngitis" />
                                </Form.Item>
                            </Space.Compact>

                            <Button
                                type="primary"
                                ghost
                                htmlType="submit"
                                disabled={
                                    !canWriteEhr ||
                                    !medicalRecord ||
                                    recordLocked
                                }
                                loading={actionLoading === 'add-diagnosis'}
                            >
                                Thêm chẩn đoán
                            </Button>
                        </Form>

                        <Divider />

                        <List
                            dataSource={medicalRecord?.diagnoses || []}
                            locale={{ emptyText: 'Chưa có chẩn đoán' }}
                            renderItem={(item) => (
                                <List.Item
                                    actions={[
                                        <Popconfirm
                                            key="delete"
                                            title="Xóa chẩn đoán?"
                                            description="Chẩn đoán này sẽ bị xóa khỏi bệnh án."
                                            okText="Xóa"
                                            cancelText="Đóng"
                                            okButtonProps={{ danger: true }}
                                            onConfirm={() =>
                                                handleDeleteDiagnosis(item.id)
                                            }
                                        >
                                            <Button
                                                danger
                                                type="link"
                                                disabled={
                                                    !canWriteEhr || recordLocked
                                                }
                                                loading={
                                                    actionLoading === item.id
                                                }
                                            >
                                                Xóa
                                            </Button>
                                        </Popconfirm>,
                                    ]}
                                >
                                    <List.Item.Meta
                                        title={
                                            <span>
                                                {item.diagnosisText}{' '}
                                                {item.icdCode && (
                                                    <Tag color="blue">
                                                        {item.icdCode}
                                                    </Tag>
                                                )}
                                            </span>
                                        }
                                        description={
                                            item.icdDisplay ||
                                            item.codingSystem ||
                                            'Không có mô tả ICD.'
                                        }
                                    />
                                </List.Item>
                            )}
                        />
                    </Card>

                    <Card
                        className={styles.detailCard}
                        title="Đơn thuốc"
                        extra={
                            prescription ? (
                                <Space wrap>
                                    <StatusTag value={prescription.status} />

                                    <Button
                                        onClick={handleRunSafety}
                                        disabled={!canWritePrescription}
                                        loading={
                                            actionLoading === 'safety-check'
                                        }
                                    >
                                        AI safety
                                    </Button>

                                    <Button
                                        type="primary"
                                        disabled={
                                            !canWritePrescription ||
                                            !isDraftPrescription(prescription)
                                        }
                                        onClick={handleFinalizePrescription}
                                        loading={
                                            actionLoading ===
                                            'finalize-prescription'
                                        }
                                    >
                                        Finalize
                                    </Button>

                                    <Button
                                        danger
                                        disabled={
                                            !canWritePrescription ||
                                            !isDraftPrescription(prescription)
                                        }
                                        onClick={() =>
                                            setCancelPrescriptionOpen(true)
                                        }
                                    >
                                        Cancel
                                    </Button>
                                </Space>
                            ) : (
                                <Button
                                    type="primary"
                                    onClick={handleCreatePrescription}
                                    disabled={
                                        !medicalRecord ||
                                        !canWritePrescription
                                    }
                                    loading={
                                        actionLoading ===
                                        'create-prescription'
                                    }
                                >
                                    Tạo đơn thuốc
                                </Button>
                            )
                        }
                    >
                        {!prescription ? (
                            <Alert
                                type="info"
                                showIcon
                                message="Hãy tạo bệnh án trước, sau đó tạo đơn thuốc."
                            />
                        ) : (
                            <>
                                {hasCriticalSafetyAlert && (
                                    <Alert
                                        type="warning"
                                        showIcon
                                        message="Đơn thuốc có cảnh báo an toàn mức cao"
                                        description="Vui lòng xem kỹ cảnh báo AI trước khi finalize. AI chỉ hỗ trợ, bác sĩ vẫn là người quyết định cuối cùng."
                                        style={{ marginBottom: 16 }}
                                    />
                                )}

                                <Form
                                    form={prescriptionNoteForm}
                                    layout="vertical"
                                    onFinish={handleUpdatePrescriptionNote}
                                    disabled={
                                        !canWritePrescription ||
                                        !isDraftPrescription(prescription)
                                    }
                                >
                                    <Form.Item
                                        label="Ghi chú đơn thuốc"
                                        name="note"
                                    >
                                        <Input.TextArea
                                            rows={3}
                                            placeholder="Ghi chú chung cho đơn thuốc..."
                                        />
                                    </Form.Item>

                                    <Button
                                        htmlType="submit"
                                        disabled={
                                            !canWritePrescription ||
                                            !isDraftPrescription(prescription)
                                        }
                                        loading={
                                            actionLoading ===
                                            'update-prescription-note'
                                        }
                                    >
                                        Cập nhật ghi chú
                                    </Button>
                                </Form>

                                <Divider />

                                <Form
                                    form={drugForm}
                                    layout="vertical"
                                    onFinish={handleAddMedication}
                                    disabled={
                                        !canWritePrescription ||
                                        !isDraftPrescription(prescription)
                                    }
                                >
                                    <Form.Item
                                        label="Thuốc"
                                        name="medicationId"
                                        rules={[
                                            {
                                                required: true,
                                                message: 'Chọn thuốc',
                                            },
                                        ]}
                                    >
                                        <MedicationSmartSelect />
                                    </Form.Item>

                                    <Space.Compact style={{ width: '100%' }}>
                                        <Form.Item
                                            name="dosage"
                                            rules={[
                                                {
                                                    required: true,
                                                    message: 'Nhập liều dùng',
                                                },
                                            ]}
                                            style={{ width: '25%' }}
                                        >
                                            <Input placeholder="500mg" />
                                        </Form.Item>

                                        <Form.Item
                                            name="frequency"
                                            rules={[
                                                {
                                                    required: true,
                                                    message: 'Nhập tần suất',
                                                },
                                            ]}
                                            style={{ width: '25%' }}
                                        >
                                            <Input placeholder="2 lần/ngày" />
                                        </Form.Item>

                                        <Form.Item
                                            name="duration"
                                            rules={[
                                                {
                                                    required: true,
                                                    message:
                                                        'Nhập thời gian dùng',
                                                },
                                            ]}
                                            style={{ width: '25%' }}
                                        >
                                            <Input placeholder="3 ngày" />
                                        </Form.Item>

                                        <Form.Item
                                            name="quantity"
                                            rules={[
                                                {
                                                    required: true,
                                                    message: 'Nhập số lượng',
                                                },
                                            ]}
                                            style={{ width: '25%' }}
                                        >
                                            <InputNumber
                                                style={{ width: '100%' }}
                                                min={1}
                                                placeholder="SL"
                                            />
                                        </Form.Item>
                                    </Space.Compact>

                                    <Form.Item
                                        name="instruction"
                                        label="Hướng dẫn"
                                    >
                                        <Input.TextArea
                                            rows={2}
                                            placeholder="Uống sau ăn..."
                                        />
                                    </Form.Item>

                                    <Button
                                        type="primary"
                                        ghost
                                        htmlType="submit"
                                        disabled={
                                            !canWritePrescription ||
                                            !isDraftPrescription(prescription)
                                        }
                                        loading={
                                            actionLoading === 'add-medication'
                                        }
                                    >
                                        Thêm thuốc
                                    </Button>
                                </Form>

                                <Divider />

                                <List
                                    dataSource={prescriptionItems}
                                    locale={{
                                        emptyText: 'Chưa có thuốc trong đơn',
                                    }}
                                    renderItem={(item) => (
                                        <List.Item
                                            actions={[
                                                <Button
                                                    key="edit"
                                                    type="link"
                                                    disabled={
                                                        !canWritePrescription ||
                                                        !isDraftPrescription(
                                                            prescription,
                                                        )
                                                    }
                                                    onClick={() =>
                                                        openEditItemModal(item)
                                                    }
                                                >
                                                    Sửa
                                                </Button>,

                                                <Popconfirm
                                                    key="delete"
                                                    title="Xóa thuốc khỏi đơn?"
                                                    description="Thuốc này sẽ bị xóa khỏi đơn thuốc."
                                                    okText="Xóa"
                                                    cancelText="Đóng"
                                                    okButtonProps={{
                                                        danger: true,
                                                    }}
                                                    onConfirm={() =>
                                                        handleDeleteMedication(
                                                            item.id,
                                                        )
                                                    }
                                                >
                                                    <Button
                                                        danger
                                                        type="link"
                                                        disabled={
                                                            !canWritePrescription ||
                                                            !isDraftPrescription(
                                                                prescription,
                                                            )
                                                        }
                                                        loading={
                                                            actionLoading ===
                                                            item.id
                                                        }
                                                    >
                                                        Xóa
                                                    </Button>
                                                </Popconfirm>,
                                            ]}
                                        >
                                            <List.Item.Meta
                                                title={
                                                    <span>
                                                        {item.medicationName}{' '}
                                                        {item.atcCode && (
                                                            <Tag color="cyan">
                                                                {item.atcCode}
                                                            </Tag>
                                                        )}
                                                    </span>
                                                }
                                                description={
                                                    <div>
                                                        <p>
                                                            {item.dosage || ''}{' '}
                                                            ·{' '}
                                                            {item.frequency ||
                                                                ''}{' '}
                                                            ·{' '}
                                                            {item.duration ||
                                                                ''}{' '}
                                                            · SL:{' '}
                                                            {item.quantity || 0}
                                                        </p>
                                                        <p>
                                                            {item.instruction ||
                                                                'Không có hướng dẫn.'}
                                                        </p>
                                                    </div>
                                                }
                                            />
                                        </List.Item>
                                    )}
                                />

                                {safetyAlerts.length > 0 && (
                                    <>
                                        <Divider />

                                        <h3>Cảnh báo AI Safety</h3>

                                        <div className={styles.alertStrip}>
                                            {safetyAlerts.map((alert) => (
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
                                            ))}
                                        </div>
                                    </>
                                )}
                            </>
                        )}
                    </Card>
                </section>

                <Modal
                    title="Cập nhật thuốc trong đơn"
                    open={editItemOpen}
                    onCancel={() => {
                        setEditItemOpen(false);
                        setEditingItem(null);
                        editDrugForm.resetFields();
                    }}
                    footer={null}
                    destroyOnClose
                >
                    <Form
                        form={editDrugForm}
                        layout="vertical"
                        onFinish={handleUpdateMedication}
                    >
                        <Form.Item label="Thuốc" name="medicationId">
                            <Input disabled />
                        </Form.Item>

                        <Form.Item
                            label="Liều dùng"
                            name="dosage"
                            rules={[
                                {
                                    required: true,
                                    message: 'Nhập liều dùng',
                                },
                            ]}
                        >
                            <Input placeholder="500mg" />
                        </Form.Item>

                        <Form.Item
                            label="Tần suất"
                            name="frequency"
                            rules={[
                                {
                                    required: true,
                                    message: 'Nhập tần suất',
                                },
                            ]}
                        >
                            <Input placeholder="2 lần/ngày" />
                        </Form.Item>

                        <Form.Item
                            label="Thời gian dùng"
                            name="duration"
                            rules={[
                                {
                                    required: true,
                                    message: 'Nhập thời gian dùng',
                                },
                            ]}
                        >
                            <Input placeholder="3 ngày" />
                        </Form.Item>

                        <Form.Item
                            label="Số lượng"
                            name="quantity"
                            rules={[
                                {
                                    required: true,
                                    message: 'Nhập số lượng',
                                },
                            ]}
                        >
                            <InputNumber style={{ width: '100%' }} min={1} />
                        </Form.Item>

                        <Form.Item label="Hướng dẫn" name="instruction">
                            <Input.TextArea rows={3} />
                        </Form.Item>

                        <Button
                            type="primary"
                            htmlType="submit"
                            block
                            loading={actionLoading === 'update-medication'}
                        >
                            Lưu thay đổi
                        </Button>
                    </Form>
                </Modal>

                <Modal
                    title="Hủy đơn thuốc"
                    open={cancelPrescriptionOpen}
                    onCancel={() => {
                        setCancelPrescriptionOpen(false);
                        cancelPrescriptionForm.resetFields();
                    }}
                    footer={null}
                    destroyOnClose
                >
                    <Form
                        form={cancelPrescriptionForm}
                        layout="vertical"
                        onFinish={handleCancelPrescription}
                    >
                        <Form.Item
                            label="Lý do hủy"
                            name="reason"
                            rules={[
                                {
                                    required: true,
                                    message: 'Nhập lý do hủy đơn thuốc',
                                },
                            ]}
                        >
                            <Input.TextArea
                                rows={4}
                                placeholder="Ví dụ: bệnh nhân dị ứng, đổi phác đồ, kê nhầm thuốc..."
                            />
                        </Form.Item>

                        <Button
                            danger
                            htmlType="submit"
                            block
                            loading={actionLoading === 'cancel-prescription'}
                        >
                            Xác nhận hủy đơn thuốc
                        </Button>
                    </Form>
                </Modal>
            </RoleGuardState>
        </DashboardFrame>
    );
}