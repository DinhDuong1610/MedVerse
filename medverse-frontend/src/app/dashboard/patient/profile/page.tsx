'use client';

import {
    Button,
    Form,
    Input,
    InputNumber,
    Modal,
    Popconfirm,
    Select,
    Space,
    Tag,
    message,
} from 'antd';
import { useEffect, useState } from 'react';
import ClinicalPageState from '../../_components/ClinicalPageState';
import PatientPortalFrame from '../../_components/PatientPortalFrame';
import StatusTag from '../../_components/StatusTag';
import { hasRole } from '@/lib/auth/roles';
import { useAuthSession } from '@/lib/auth/use-auth-session';
import {
    createMyAllergy,
    deleteMyAllergy,
    getMyAllergies,
    getMyMedicalProfile,
    updateMyAllergy,
    updateMyMedicalProfile,
    type AllergyPayload,
    type AllergySeverity,
    type PatientMedicalProfileUpdatePayload,
} from '@/services/patient-medical.service';
import type { Allergy, PatientMedicalProfile } from '@/types/clinical';
import styles from '../../_components/patient-portal.module.scss';

type ProfileFormValues = {
    bloodType?: string;
    heightCm?: number | null;
    weightKg?: number | null;
    chronicDiseases?: string;
    medicalHistory?: string;
    currentMedicationsNote?: string;
};

type AllergyFormValues = {
    allergen: string;
    reaction?: string;
    severity: AllergySeverity;
    note?: string;
};

const bloodTypeOptions = [
    'A+',
    'A-',
    'B+',
    'B-',
    'AB+',
    'AB-',
    'O+',
    'O-',
    'A',
    'B',
    'AB',
    'O',
].map((value) => ({
    value,
    label: value,
}));

const severityOptions: Array<{
    value: AllergySeverity;
    label: string;
}> = [
        { value: 'UNKNOWN', label: 'Chưa rõ' },
        { value: 'LOW', label: 'Nhẹ' },
        { value: 'MODERATE', label: 'Trung bình' },
        { value: 'HIGH', label: 'Nặng' },
        { value: 'CRITICAL', label: 'Nguy kịch' },
    ];

function normalizeText(value?: string | null) {
    const trimmed = value?.trim();

    return trimmed ? trimmed : null;
}

export default function PatientProfilePage() {
    const { session, loading: authLoading } = useAuthSession();

    const [profileForm] = Form.useForm<ProfileFormValues>();
    const [allergyForm] = Form.useForm<AllergyFormValues>();

    const [profile, setProfile] = useState<PatientMedicalProfile | null>(null);
    const [allergies, setAllergies] = useState<Allergy[]>([]);

    const [loading, setLoading] = useState(true);
    const [savingProfile, setSavingProfile] = useState(false);
    const [savingAllergy, setSavingAllergy] = useState(false);
    const [deletingAllergyId, setDeletingAllergyId] = useState<string | null>(
        null,
    );

    const [error, setError] = useState<string | null>(null);
    const [allergyModalOpen, setAllergyModalOpen] = useState(false);
    const [editingAllergy, setEditingAllergy] = useState<Allergy | null>(null);

    const loadProfile = async () => {
        try {
            setLoading(true);
            setError(null);

            const [profileData, allergyData] = await Promise.all([
                getMyMedicalProfile(),
                getMyAllergies(),
            ]);

            setProfile(profileData);
            setAllergies(allergyData);

            profileForm.setFieldsValue({
                bloodType: profileData?.bloodType || undefined,
                heightCm: profileData?.heightCm || null,
                weightKg: profileData?.weightKg || null,
                chronicDiseases: profileData?.chronicDiseases || '',
                medicalHistory: profileData?.medicalHistory || '',
                currentMedicationsNote:
                    profileData?.currentMedicationsNote || '',
            });
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Không thể tải hồ sơ y tế.',
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

        loadProfile();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session]);

    const handleSaveProfile = async (values: ProfileFormValues) => {
        try {
            setSavingProfile(true);

            const payload: PatientMedicalProfileUpdatePayload = {
                bloodType: values.bloodType || null,
                heightCm: values.heightCm ?? null,
                weightKg: values.weightKg ?? null,
                chronicDiseases: normalizeText(values.chronicDiseases),
                medicalHistory: normalizeText(values.medicalHistory),
                currentMedicationsNote: normalizeText(
                    values.currentMedicationsNote,
                ),
            };

            const updated = await updateMyMedicalProfile(payload);

            setProfile(updated);
            message.success('Đã cập nhật hồ sơ sức khỏe.');
        } catch (err) {
            message.error(
                err instanceof Error
                    ? err.message
                    : 'Không thể cập nhật hồ sơ sức khỏe.',
            );
        } finally {
            setSavingProfile(false);
        }
    };

    const openCreateAllergyModal = () => {
        setEditingAllergy(null);
        allergyForm.resetFields();
        allergyForm.setFieldsValue({
            severity: 'UNKNOWN',
        });
        setAllergyModalOpen(true);
    };

    const openEditAllergyModal = (allergy: Allergy) => {
        setEditingAllergy(allergy);
        allergyForm.setFieldsValue({
            allergen: allergy.allergen,
            reaction: allergy.reaction || '',
            severity: allergy.severity || 'UNKNOWN',
            note: allergy.note || '',
        });
        setAllergyModalOpen(true);
    };

    const handleSaveAllergy = async (values: AllergyFormValues) => {
        try {
            setSavingAllergy(true);

            const payload: AllergyPayload = {
                allergen: values.allergen.trim(),
                reaction: normalizeText(values.reaction),
                severity: values.severity || 'UNKNOWN',
                note: normalizeText(values.note),
            };

            if (editingAllergy) {
                await updateMyAllergy(editingAllergy.id, payload);
                message.success('Đã cập nhật dị ứng.');
            } else {
                await createMyAllergy(payload);
                message.success('Đã thêm dị ứng.');
            }

            setAllergyModalOpen(false);
            setEditingAllergy(null);
            allergyForm.resetFields();

            await loadProfile();
        } catch (err) {
            message.error(
                err instanceof Error
                    ? err.message
                    : 'Không thể lưu thông tin dị ứng.',
            );
        } finally {
            setSavingAllergy(false);
        }
    };

    const handleDeleteAllergy = async (allergyId: string) => {
        try {
            setDeletingAllergyId(allergyId);

            await deleteMyAllergy(allergyId);

            message.success('Đã xóa dị ứng.');
            await loadProfile();
        } catch (err) {
            message.error(
                err instanceof Error
                    ? err.message
                    : 'Không thể xóa dị ứng.',
            );
        } finally {
            setDeletingAllergyId(null);
        }
    };

    if (authLoading || !session) {
        return <ClinicalPageState loading>Loading</ClinicalPageState>;
    }

    return (
        <PatientPortalFrame session={session}>
            <section className={styles.hero}>
                <div>
                    <div className={styles.heroKicker}>Health profile</div>
                    <h1 className={styles.heroTitle}>
                        Quản lý hồ sơ sức khỏe cá nhân
                    </h1>
                    <p className={styles.heroDescription}>
                        Cập nhật nhóm máu, chiều cao, cân nặng, bệnh nền, tiền
                        sử bệnh, thuốc đang dùng và các dị ứng cần bác sĩ lưu ý.
                    </p>
                </div>

                <article className={styles.heroCard}>
                    <span>Dị ứng đã khai báo</span>
                    <strong>{allergies.length}</strong>
                    <p>
                        Thông tin dị ứng sẽ giúp bác sĩ và hệ thống AI cảnh báo
                        an toàn khi kê đơn.
                    </p>
                </article>
            </section>

            <ClinicalPageState loading={loading} error={error}>
                <section className={styles.contentGrid}>
                    <article className={styles.portalPanel}>
                        <div className={styles.panelHeader}>
                            <div>
                                <span>Baseline</span>
                                <h2>Thông tin sức khỏe nền</h2>
                                <p>
                                    Hãy giữ thông tin này chính xác để bác sĩ có
                                    thêm ngữ cảnh khi khám và điều trị.
                                </p>
                            </div>

                            <Tag color="cyan">Có thể chỉnh sửa</Tag>
                        </div>

                        <Form
                            form={profileForm}
                            layout="vertical"
                            onFinish={handleSaveProfile}
                        >
                            <Form.Item label="Nhóm máu" name="bloodType">
                                <Select
                                    allowClear
                                    placeholder="Chọn nhóm máu"
                                    options={bloodTypeOptions}
                                />
                            </Form.Item>

                            <Form.Item
                                label="Chiều cao (cm)"
                                name="heightCm"
                                rules={[
                                    {
                                        type: 'number',
                                        min: 20,
                                        max: 250,
                                        message:
                                            'Chiều cao phải trong khoảng 20 - 250 cm',
                                    },
                                ]}
                            >
                                <InputNumber
                                    style={{ width: '100%' }}
                                    min={20}
                                    max={250}
                                    placeholder="Ví dụ: 165"
                                />
                            </Form.Item>

                            <Form.Item
                                label="Cân nặng (kg)"
                                name="weightKg"
                                rules={[
                                    {
                                        type: 'number',
                                        min: 1,
                                        max: 300,
                                        message:
                                            'Cân nặng phải trong khoảng 1 - 300 kg',
                                    },
                                ]}
                            >
                                <InputNumber
                                    style={{ width: '100%' }}
                                    min={1}
                                    max={300}
                                    placeholder="Ví dụ: 55"
                                />
                            </Form.Item>

                            <Form.Item
                                label="Bệnh nền"
                                name="chronicDiseases"
                            >
                                <Input.TextArea
                                    rows={3}
                                    placeholder="Ví dụ: hen suyễn, tăng huyết áp, tiểu đường..."
                                />
                            </Form.Item>

                            <Form.Item
                                label="Tiền sử bệnh"
                                name="medicalHistory"
                            >
                                <Input.TextArea
                                    rows={4}
                                    placeholder="Ví dụ: từng phẫu thuật, từng nhập viện, bệnh đã điều trị..."
                                />
                            </Form.Item>

                            <Form.Item
                                label="Thuốc đang sử dụng"
                                name="currentMedicationsNote"
                            >
                                <Input.TextArea
                                    rows={3}
                                    placeholder="Ví dụ: thuốc đang uống hằng ngày, thực phẩm chức năng..."
                                />
                            </Form.Item>

                            <Button
                                type="primary"
                                htmlType="submit"
                                loading={savingProfile}
                                size="large"
                                block
                            >
                                Lưu hồ sơ sức khỏe
                            </Button>
                        </Form>
                    </article>

                    <article className={styles.portalPanel}>
                        <div className={styles.panelHeader}>
                            <div>
                                <span>Safety</span>
                                <h2>Dị ứng cần chú ý</h2>
                                <p>
                                    Thêm các dị ứng thuốc, thức ăn hoặc chất
                                    kích ứng để bác sĩ tránh kê nhầm.
                                </p>
                            </div>

                            <Button
                                type="primary"
                                onClick={openCreateAllergyModal}
                            >
                                Thêm dị ứng
                            </Button>
                        </div>

                        <ClinicalPageState
                            empty={allergies.length === 0}
                            emptyTitle="Chưa có dữ liệu dị ứng"
                            emptyDescription="Nếu bạn có dị ứng thuốc, thức ăn hoặc chất nào khác, hãy thêm tại đây."
                        >
                            {allergies.map((item) => (
                                <article
                                    key={item.id}
                                    className={styles.listCard}
                                >
                                    <div className={styles.listTitle}>
                                        <strong>{item.allergen}</strong>
                                        <StatusTag
                                            value={item.severity || 'UNKNOWN'}
                                        />
                                    </div>

                                    <p className={styles.muted}>
                                        Phản ứng:{' '}
                                        {item.reaction || 'Chưa ghi nhận'}
                                    </p>

                                    <p className={styles.muted}>
                                        Ghi chú: {item.note || 'Không có ghi chú.'}
                                    </p>

                                    <Space>
                                        <Button
                                            onClick={() =>
                                                openEditAllergyModal(item)
                                            }
                                        >
                                            Sửa
                                        </Button>

                                        <Popconfirm
                                            title="Xóa dị ứng?"
                                            description="Thông tin dị ứng này sẽ bị xóa khỏi hồ sơ của bạn."
                                            okText="Xóa"
                                            cancelText="Đóng"
                                            okButtonProps={{ danger: true }}
                                            onConfirm={() =>
                                                handleDeleteAllergy(item.id)
                                            }
                                        >
                                            <Button
                                                danger
                                                loading={
                                                    deletingAllergyId === item.id
                                                }
                                            >
                                                Xóa
                                            </Button>
                                        </Popconfirm>
                                    </Space>
                                </article>
                            ))}
                        </ClinicalPageState>
                    </article>
                </section>
            </ClinicalPageState>

            <Modal
                title={editingAllergy ? 'Cập nhật dị ứng' : 'Thêm dị ứng'}
                open={allergyModalOpen}
                onCancel={() => {
                    setAllergyModalOpen(false);
                    setEditingAllergy(null);
                    allergyForm.resetFields();
                }}
                footer={null}
                destroyOnClose
            >
                <Form
                    form={allergyForm}
                    layout="vertical"
                    onFinish={handleSaveAllergy}
                    initialValues={{
                        severity: 'UNKNOWN',
                    }}
                >
                    <Form.Item
                        label="Tác nhân dị ứng"
                        name="allergen"
                        rules={[
                            {
                                required: true,
                                message: 'Nhập tác nhân dị ứng',
                            },
                        ]}
                    >
                        <Input placeholder="Ví dụ: Penicillin, hải sản, đậu phộng..." />
                    </Form.Item>

                    <Form.Item label="Phản ứng" name="reaction">
                        <Input.TextArea
                            rows={3}
                            placeholder="Ví dụ: nổi mẩn, khó thở, buồn nôn..."
                        />
                    </Form.Item>

                    <Form.Item label="Mức độ" name="severity">
                        <Select options={severityOptions} />
                    </Form.Item>

                    <Form.Item label="Ghi chú" name="note">
                        <Input.TextArea
                            rows={3}
                            placeholder="Ghi chú thêm nếu có."
                        />
                    </Form.Item>

                    <Button
                        type="primary"
                        htmlType="submit"
                        loading={savingAllergy}
                        block
                    >
                        {editingAllergy ? 'Cập nhật dị ứng' : 'Thêm dị ứng'}
                    </Button>
                </Form>
            </Modal>
        </PatientPortalFrame>
    );
}