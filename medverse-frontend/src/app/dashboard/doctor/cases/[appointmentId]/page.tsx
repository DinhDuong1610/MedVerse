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
    Select,
    Skeleton,
    Space,
    Tag,
    message,
} from 'antd';
import { useEffect, useState } from 'react';
import DashboardFrame from '../../../_components/DashboardFrame';
import { useAuthSession } from '@/lib/auth/use-auth-session';
import { getAppointments } from '@/services/appointment.service';
import {
    addDiagnosis,
    createMedicalRecord,
    getMedicalRecordByAppointment,
    updateMedicalRecord,
} from '@/services/ehr.service';
import {
    addPrescriptionItem,
    createPrescription,
    finalizePrescription,
    getPrescriptionByMedicalRecord,
    runPrescriptionSafetyCheck,
} from '@/services/prescription.service';
import type { Appointment, MedicalRecord, Prescription } from '@/types/clinical';
import styles from '../../../dashboard.module.scss';
import MedicationSmartSelect from './_components/MedicationSmartSelect';
import DiagnosisAiSuggest from './_components/DiagnosisAiSuggest';

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

type PrescriptionItemFormValues = {
    medicationId: string;
    dosage: string;
    frequency: string;
    duration: string;
    quantity: number;
    instruction?: string;
};

export default function DoctorCaseDetailPage({ params }: PageProps) {
    const { session, loading: authLoading } = useAuthSession();

    const [recordForm] = Form.useForm<MedicalRecordFormValues>();
    const [diagnosisForm] = Form.useForm<DiagnosisFormValues>();
    const [drugForm] = Form.useForm<PrescriptionItemFormValues>();

    const [loading, setLoading] = useState(true);
    const [appointment, setAppointment] = useState<Appointment | null>(null);
    const [medicalRecord, setMedicalRecord] = useState<MedicalRecord | null>(null);
    const [prescription, setPrescription] = useState<Prescription | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const appointmentId = params.appointmentId;

    const loadCase = async () => {
        try {
            setLoading(true);

            const appointmentPage = await getAppointments();
            const foundAppointment =
                appointmentPage.content.find((item) => item.id === appointmentId) || null;

            setAppointment(foundAppointment);

            let record: MedicalRecord | null = null;

            try {
                record = await getMedicalRecordByAppointment(appointmentId);
                setMedicalRecord(record);

                recordForm.setFieldsValue({
                    chiefComplaint: record.chiefComplaint,
                    symptoms: record.symptoms,
                    clinicalNote: record.clinicalNote,
                    diagnosisText: record.diagnosisText,
                    treatmentPlan: record.treatmentPlan,
                    followUpNote: record.followUpNote,
                });
            } catch {
                setMedicalRecord(null);
            }

            if (record) {
                try {
                    const prescriptionData = await getPrescriptionByMedicalRecord(record.id);
                    setPrescription(prescriptionData);
                } catch {
                    setPrescription(null);
                }
            }

        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (session?.role === 'DOCTOR') {
            loadCase();
        }
    }, [session, appointmentId]);

    const handleSaveMedicalRecord = async (values: MedicalRecordFormValues) => {
        try {
            setSubmitting(true);

            let saved: MedicalRecord;

            if (medicalRecord) {
                saved = await updateMedicalRecord(medicalRecord.id, values);
                message.success('Đã cập nhật bệnh án.');
            } else {
                saved = await createMedicalRecord({
                    appointmentId,
                    ...values,
                });
                message.success('Đã tạo bệnh án.');
            }

            setMedicalRecord(saved);
            await loadCase();
        } catch (error) {
            message.error(
                error instanceof Error ? error.message : 'Không thể lưu bệnh án.',
            );
        } finally {
            setSubmitting(false);
        }
    };

    const handleAddDiagnosis = async (values: DiagnosisFormValues) => {
        if (!medicalRecord) {
            message.warning('Cần tạo bệnh án trước khi thêm chẩn đoán.');
            return;
        }

        try {
            setSubmitting(true);

            await addDiagnosis(medicalRecord.id, {
                diagnosisText: values.diagnosisText,
                icdCode: values.icdCode,
                icdDisplay: values.icdDisplay,
                codingSystem: 'ICD-10',
                source: 'MANUAL',
                confidence: 1,
                acceptedByDoctor: true,
            });

            diagnosisForm.resetFields();
            message.success('Đã thêm chẩn đoán.');
            await loadCase();
        } catch (error) {
            message.error(
                error instanceof Error ? error.message : 'Không thể thêm chẩn đoán.',
            );
        } finally {
            setSubmitting(false);
        }
    };

    const handleCreatePrescription = async () => {
        if (!medicalRecord) {
            message.warning('Cần có bệnh án trước khi tạo đơn thuốc.');
            return;
        }

        try {
            setSubmitting(true);

            const created = await createPrescription({
                medicalRecordId: medicalRecord.id,
                note: 'Đơn thuốc tạo từ giao diện bác sĩ.',
            });

            setPrescription(created);
            message.success('Đã tạo đơn thuốc.');
            await loadCase();
        } catch (error) {
            message.error(
                error instanceof Error ? error.message : 'Không thể tạo đơn thuốc.',
            );
        } finally {
            setSubmitting(false);
        }
    };

    const handleAddMedication = async (values: PrescriptionItemFormValues) => {
        if (!prescription) {
            message.warning('Cần tạo đơn thuốc trước.');
            return;
        }

        try {
            setSubmitting(true);

            await addPrescriptionItem(prescription.id, values);

            drugForm.resetFields();
            message.success('Đã thêm thuốc vào đơn.');
            await loadCase();
        } catch (error) {
            message.error(
                error instanceof Error ? error.message : 'Không thể thêm thuốc.',
            );
        } finally {
            setSubmitting(false);
        }
    };

    const handleRunSafety = async () => {
        if (!prescription) return;

        try {
            setSubmitting(true);
            const checked = await runPrescriptionSafetyCheck(prescription.id);
            setPrescription(checked);
            message.success('Đã chạy AI safety check.');
            await loadCase();
        } catch (error) {
            message.error(
                error instanceof Error ? error.message : 'Không thể chạy AI safety.',
            );
        } finally {
            setSubmitting(false);
        }
    };

    const handleFinalizePrescription = async () => {
        if (!prescription) return;

        try {
            setSubmitting(true);
            const finalized = await finalizePrescription(prescription.id);
            setPrescription(finalized);
            message.success('Đã hoàn tất đơn thuốc.');
            await loadCase();
        } catch (error) {
            message.error(
                error instanceof Error ? error.message : 'Không thể hoàn tất đơn thuốc.',
            );
        } finally {
            setSubmitting(false);
        }
    };

    if (authLoading || !session || loading) {
        return <Skeleton active paragraph={{ rows: 10 }} />;
    }

    return (
        <DashboardFrame
            session={session}
            title="Chi tiết ca khám"
            subtitle="Cập nhật bệnh án, chẩn đoán, kê đơn và kiểm tra AI safety"
        >
            <div className={styles.detailGrid}>
                <Card className={styles.detailCard} title="Thông tin lịch khám">
                    {appointment ? (
                        <div className={styles.profileMatrix}>
                            <div>
                                <span>Bệnh nhân</span>
                                <strong>{appointment.patientName || 'Bệnh nhân demo'}</strong>
                            </div>
                            <div>
                                <span>Trạng thái</span>
                                <strong>{appointment.status}</strong>
                            </div>
                            <div>
                                <span>Thời gian</span>
                                <strong>
                                    {new Date(appointment.startTime).toLocaleString('vi-VN')}
                                </strong>
                            </div>
                            <div>
                                <span>Chẩn đoán sơ bộ</span>
                                <strong>{appointment.diagnosis || 'Chưa có'}</strong>
                            </div>
                        </div>
                    ) : (
                        <Alert
                            type="warning"
                            showIcon
                            message="Không tìm thấy appointment trong danh sách hiện tại."
                        />
                    )}
                </Card>

                <Card className={styles.detailCard} title="Bệnh án điện tử">
                    <Form
                        form={recordForm}
                        layout="vertical"
                        onFinish={handleSaveMedicalRecord}
                    >
                        <Form.Item label="Lý do khám" name="chiefComplaint">
                            <Input placeholder="Ví dụ: Sốt, đau họng 3 ngày" />
                        </Form.Item>

                        <Form.Item label="Triệu chứng" name="symptoms">
                            <Input.TextArea rows={3} placeholder="Mô tả triệu chứng" />
                        </Form.Item>

                        <Form.Item label="Ghi chú lâm sàng" name="clinicalNote">
                            <Input.TextArea rows={3} placeholder="Kết quả khám lâm sàng" />
                        </Form.Item>

                        <Form.Item label="Chẩn đoán chính" name="diagnosisText">
                            <Input placeholder="Ví dụ: Viêm họng cấp" />
                        </Form.Item>

                        <Form.Item label="Kế hoạch điều trị" name="treatmentPlan">
                            <Input.TextArea rows={3} placeholder="Điều trị, nghỉ ngơi, theo dõi..." />
                        </Form.Item>

                        <Form.Item label="Ghi chú tái khám" name="followUpNote">
                            <Input.TextArea rows={2} placeholder="Tái khám sau..." />
                        </Form.Item>

                        <Button type="primary" htmlType="submit" loading={submitting}>
                            {medicalRecord ? 'Cập nhật bệnh án' : 'Tạo bệnh án'}
                        </Button>
                    </Form>
                </Card>

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
                    <Form
                        form={diagnosisForm}
                        layout="vertical"
                        onFinish={handleAddDiagnosis}
                    >
                        <Form.Item
                            label="Chẩn đoán"
                            name="diagnosisText"
                            rules={[{ required: true, message: 'Nhập chẩn đoán' }]}
                        >
                            <Input placeholder="Viêm họng cấp" />
                        </Form.Item>

                        <Space.Compact style={{ width: '100%' }}>
                            <Form.Item name="icdCode" style={{ width: '35%' }}>
                                <Input placeholder="J02" />
                            </Form.Item>
                            <Form.Item name="icdDisplay" style={{ width: '65%' }}>
                                <Input placeholder="Acute pharyngitis" />
                            </Form.Item>
                        </Space.Compact>

                        <Button
                            type="primary"
                            ghost
                            htmlType="submit"
                            disabled={!medicalRecord}
                            loading={submitting}
                        >
                            Thêm chẩn đoán
                        </Button>
                    </Form>

                    <Divider />

                    <List
                        dataSource={medicalRecord?.diagnoses || []}
                        locale={{ emptyText: 'Chưa có chẩn đoán' }}
                        renderItem={(item) => (
                            <List.Item>
                                <List.Item.Meta
                                    title={
                                        <span>
                                            {item.diagnosisText}{' '}
                                            {item.icdCode && <Tag color="blue">{item.icdCode}</Tag>}
                                        </span>
                                    }
                                    description={item.icdDisplay}
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
                            <Space>
                                <Button onClick={handleRunSafety} loading={submitting}>
                                    AI safety
                                </Button>
                                <Button
                                    type="primary"
                                    onClick={handleFinalizePrescription}
                                    loading={submitting}
                                    disabled={prescription.status !== 'DRAFT'}
                                >
                                    Finalize
                                </Button>
                            </Space>
                        ) : (
                            <Button
                                type="primary"
                                onClick={handleCreatePrescription}
                                disabled={!medicalRecord}
                                loading={submitting}
                            >
                                Tạo đơn thuốc
                            </Button>
                        )
                    }
                >
                    {prescription ? (
                        <>
                            <Tag color={prescription.status === 'FINALIZED' ? 'green' : 'gold'}>
                                {prescription.status}
                            </Tag>

                            <Divider />

                            <Form
                                form={drugForm}
                                layout="vertical"
                                onFinish={handleAddMedication}
                            >
                                <Form.Item
                                    label="Thuốc"
                                    name="medicationId"
                                    rules={[{ required: true, message: 'Chọn thuốc' }]}
                                >
                                    <MedicationSmartSelect />
                                </Form.Item>

                                <Space.Compact style={{ width: '100%' }}>
                                    <Form.Item name="dosage" rules={[{ required: true, message: 'Nhập liều dùng' }]} style={{ width: '25%' }}>
                                        <Input placeholder="500mg" />
                                    </Form.Item>
                                    <Form.Item name="frequency" rules={[{ required: true, message: 'Nhập tần suất' }]} style={{ width: '25%' }}>
                                        <Input placeholder="2 lần/ngày" />
                                    </Form.Item>
                                    <Form.Item name="duration" rules={[{ required: true, message: 'Nhập thời gian sử dụng' }]} style={{ width: '25%' }}>
                                        <Input placeholder="3 ngày" />
                                    </Form.Item>
                                    <Form.Item
                                        name="quantity"
                                        rules={[{ required: true, message: 'Nhập số lượng' }]}
                                        style={{ width: '25%' }}
                                    >
                                        <InputNumber
                                            style={{ width: '100%' }}
                                            min={1}
                                            placeholder="Số lượng"
                                        />
                                    </Form.Item>
                                </Space.Compact>

                                <Form.Item name="instruction" label="Hướng dẫn">
                                    <Input.TextArea rows={2} placeholder="Uống sau ăn..." />
                                </Form.Item>

                                <Button
                                    type="primary"
                                    ghost
                                    htmlType="submit"
                                    disabled={prescription.status !== 'DRAFT'}
                                    loading={submitting}
                                >
                                    Thêm thuốc
                                </Button>
                            </Form>

                            <Divider />

                            <List
                                dataSource={prescription.items || []}
                                locale={{ emptyText: 'Chưa có thuốc trong đơn' }}
                                renderItem={(item) => (
                                    <List.Item>
                                        <List.Item.Meta
                                            title={item.medicationName}
                                            description={`${item.dosage || ''} · ${item.frequency || ''} · ${item.duration || ''}`}
                                        />
                                    </List.Item>
                                )}
                            />

                            {prescription.safetyAlerts?.length ? (
                                <>
                                    <Divider />
                                    <h3>Cảnh báo AI</h3>
                                    <div className={styles.alertStrip}>
                                        {prescription.safetyAlerts.map((alert) => (
                                            <Tag
                                                key={alert.id}
                                                color={
                                                    alert.severity === 'HIGH' ||
                                                        alert.severity === 'CRITICAL'
                                                        ? 'red'
                                                        : 'gold'
                                                }
                                            >
                                                {alert.type}: {alert.title || alert.message}
                                            </Tag>
                                        ))}
                                    </div>
                                </>
                            ) : null}
                        </>
                    ) : (
                        <Alert
                            type="info"
                            showIcon
                            message="Hãy tạo bệnh án trước, sau đó tạo đơn thuốc."
                        />
                    )}
                </Card>
            </div>
        </DashboardFrame>
    );
}