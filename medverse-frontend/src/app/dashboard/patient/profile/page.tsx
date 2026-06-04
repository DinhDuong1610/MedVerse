'use client';

import {
    DeleteOutlined,
    EditOutlined,
    HeartOutlined,
    MedicineBoxOutlined,
    PlusOutlined,
    ReloadOutlined,
    SafetyCertificateOutlined,
    WarningOutlined,
} from '@ant-design/icons';
import {
    Alert,
    Button,
    Descriptions,
    Form,
    Input,
    InputNumber,
    Modal,
    Select,
    Space,
    Tag,
    message,
} from 'antd';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import ClinicalPageState from '../../_components/ClinicalPageState';
import PatientPortalFrame from '../../_components/PatientPortalFrame';
import { hasRole } from '@/lib/auth/roles';
import { useAuthSession } from '@/lib/auth/use-auth-session';
import {
    createMyAllergy,
    deleteMyAllergy,
    getMyAllergies,
    getMyPatientMedicalProfile,
    updateMyAllergy,
    updateMyPatientMedicalProfile,
    type PatientAllergy,
    type PatientAllergyPayload,
    type PatientMedicalProfile,
    type PatientMedicalProfilePayload,
} from '@/services/patient-medical.service';
import styles from '../../_components/patient-portal.module.scss';

type ProfileFormValues = {
    bloodType?: string;
    heightCm?: number;
    weightKg?: number;
    chronicDiseases?: string;
    medicalHistory?: string;
    currentMedicationsNote?: string;
    note?: string;
};

type AllergyFormValues = {
    allergen: string;
    reaction?: string;
    severity?: string;
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
].map((value) => ({
    label: value,
    value,
}));

const severityOptions = [
    {
        label: 'Nhẹ',
        value: 'MILD',
    },
    {
        label: 'Trung bình',
        value: 'MODERATE',
    },
    {
        label: 'Nặng',
        value: 'SEVERE',
    },
    {
        label: 'Nguy hiểm',
        value: 'CRITICAL',
    },
];

function formatDateTime(value?: string) {
    if (!value) return 'Chưa ghi nhận';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleString('vi-VN');
}

function getSafeText(value?: string) {
    return value?.trim() || 'Chưa cập nhật';
}

function calculateBmi(heightCm?: number, weightKg?: number) {
    if (!heightCm || !weightKg) return null;

    const heightM = heightCm / 100;
    const bmi = weightKg / (heightM * heightM);

    if (!Number.isFinite(bmi)) return null;

    return Number(bmi.toFixed(1));
}

function getBmiMeta(bmi: number | null) {
    if (bmi == null) {
        return {
            label: 'Chưa đủ dữ liệu',
            color: 'default',
        };
    }

    if (bmi < 18.5) {
        return {
            label: 'Thiếu cân',
            color: 'orange',
        };
    }

    if (bmi < 23) {
        return {
            label: 'Bình thường',
            color: 'green',
        };
    }

    if (bmi < 25) {
        return {
            label: 'Thừa cân',
            color: 'gold',
        };
    }

    return {
        label: 'Béo phì',
        color: 'red',
    };
}

function getSeverityMeta(severity?: string) {
    const normalized = String(severity || '').toUpperCase();

    if (normalized === 'CRITICAL') {
        return {
            label: 'Nguy hiểm',
            color: 'red',
        };
    }

    if (normalized === 'SEVERE') {
        return {
            label: 'Nặng',
            color: 'volcano',
        };
    }

    if (normalized === 'MODERATE') {
        return {
            label: 'Trung bình',
            color: 'orange',
        };
    }

    if (normalized === 'MILD') {
        return {
            label: 'Nhẹ',
            color: 'green',
        };
    }

    return {
        label: 'Chưa đánh giá',
        color: 'default',
    };
}

function buildProfilePayload(
    values: ProfileFormValues,
): PatientMedicalProfilePayload {
    const payload: PatientMedicalProfilePayload = {};

    if (values.bloodType) payload.bloodType = values.bloodType;
    if (values.heightCm != null) payload.heightCm = values.heightCm;
    if (values.weightKg != null) payload.weightKg = values.weightKg;

    if (values.chronicDiseases?.trim()) {
        payload.chronicDiseases = values.chronicDiseases.trim();
    }

    if (values.medicalHistory?.trim()) {
        payload.medicalHistory = values.medicalHistory.trim();
    }

    if (values.currentMedicationsNote?.trim()) {
        payload.currentMedicationsNote = values.currentMedicationsNote.trim();
    }

    if (values.note?.trim()) {
        payload.note = values.note.trim();
    }

    return payload;
}

function buildAllergyPayload(values: AllergyFormValues): PatientAllergyPayload {
    const payload: PatientAllergyPayload = {
        allergen: values.allergen.trim(),
    };

    if (values.reaction?.trim()) {
        payload.reaction = values.reaction.trim();
    }

    if (values.severity) {
        payload.severity = values.severity;
    }

    if (values.note?.trim()) {
        payload.note = values.note.trim();
    }

    return payload;
}

export default function PatientProfilePage() {
    const { session, loading: authLoading } = useAuthSession();

    const [profile, setProfile] = useState<PatientMedicalProfile | null>(null);
    const [allergies, setAllergies] = useState<PatientAllergy[]>([]);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [openProfileModal, setOpenProfileModal] = useState(false);
    const [openAllergyModal, setOpenAllergyModal] = useState(false);
    const [editingAllergy, setEditingAllergy] = useState<PatientAllergy | null>(
        null,
    );

    const [profileForm] = Form.useForm<ProfileFormValues>();
    const [allergyForm] = Form.useForm<AllergyFormValues>();

    const loadProfile = async () => {
        try {
            setLoading(true);
            setError(null);

            const [profileData, allergyData] = await Promise.all([
                getMyPatientMedicalProfile(),
                getMyAllergies(),
            ]);

            setProfile(profileData || null);
            setAllergies(allergyData || []);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Không thể tải hồ sơ sức khỏe.',
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
    }, [session]);

    const bmi = useMemo(
        () => calculateBmi(profile?.heightCm, profile?.weightKg),
        [profile],
    );

    const bmiMeta = getBmiMeta(bmi);

    const completion = useMemo(() => {
        const fields = [
            profile?.bloodType,
            profile?.heightCm,
            profile?.weightKg,
            profile?.chronicDiseases,
            profile?.medicalHistory,
            profile?.currentMedicationsNote,
        ];

        const filled = fields.filter((item) => {
            if (typeof item === 'number') return item > 0;
            return Boolean(String(item || '').trim());
        }).length;

        return Math.round((filled / fields.length) * 100);
    }, [profile]);

    const highRiskAllergies = useMemo(
        () =>
            allergies.filter((item) =>
                ['SEVERE', 'CRITICAL'].includes(
                    String(item.severity || '').toUpperCase(),
                ),
            ).length,
        [allergies],
    );

    const openEditProfile = () => {
        profileForm.setFieldsValue({
            bloodType: profile?.bloodType,
            heightCm: profile?.heightCm,
            weightKg: profile?.weightKg,
            chronicDiseases: profile?.chronicDiseases,
            medicalHistory: profile?.medicalHistory,
            currentMedicationsNote: profile?.currentMedicationsNote,
            note: profile?.note,
        });

        setOpenProfileModal(true);
    };

    const openCreateAllergy = () => {
        setEditingAllergy(null);
        allergyForm.resetFields();
        setOpenAllergyModal(true);
    };

    const openEditAllergy = (allergy: PatientAllergy) => {
        setEditingAllergy(allergy);

        allergyForm.setFieldsValue({
            allergen: allergy.allergen,
            reaction: allergy.reaction,
            severity: allergy.severity,
            note: allergy.note,
        });

        setOpenAllergyModal(true);
    };

    const handleSaveProfile = async (values: ProfileFormValues) => {
        try {
            setSaving(true);

            const payload = buildProfilePayload(values);

            await updateMyPatientMedicalProfile(payload);

            message.success('Đã cập nhật hồ sơ sức khỏe.');
            setOpenProfileModal(false);
            await loadProfile();
        } catch (err) {
            message.error(
                err instanceof Error
                    ? err.message
                    : 'Không thể cập nhật hồ sơ sức khỏe.',
            );
        } finally {
            setSaving(false);
        }
    };

    const handleSaveAllergy = async (values: AllergyFormValues) => {
        try {
            setSaving(true);

            const payload = buildAllergyPayload(values);

            if (editingAllergy) {
                await updateMyAllergy(editingAllergy.id, payload);
                message.success('Đã cập nhật dị ứng.');
            } else {
                await createMyAllergy(payload);
                message.success('Đã thêm dị ứng.');
            }

            setOpenAllergyModal(false);
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
            setSaving(false);
        }
    };

    const handleDeleteAllergy = (allergy: PatientAllergy) => {
        Modal.confirm({
            title: 'Xóa dị ứng?',
            content: `Bạn muốn xóa dị ứng với "${allergy.allergen}" khỏi hồ sơ sức khỏe?`,
            okText: 'Xóa',
            cancelText: 'Đóng',
            okButtonProps: {
                danger: true,
            },
            onOk: async () => {
                try {
                    await deleteMyAllergy(allergy.id);
                    message.success('Đã xóa dị ứng.');
                    await loadProfile();
                } catch (err) {
                    message.error(
                        err instanceof Error
                            ? err.message
                            : 'Không thể xóa dị ứng.',
                    );
                }
            },
        });
    };

    if (authLoading || !session) {
        return <ClinicalPageState loading>Loading</ClinicalPageState>;
    }

    return (
        <PatientPortalFrame session={session}>
            <section className={styles.hero}>
                <div>
                    <div className={styles.heroKicker}>Hồ sơ sức khỏe</div>
                    <h1 className={styles.heroTitle}>
                        Cập nhật thông tin sức khỏe cá nhân
                    </h1>
                    <p className={styles.heroDescription}>
                        Hồ sơ này giúp bác sĩ nắm được nhóm máu, bệnh nền, tiền
                        sử bệnh, thuốc đang dùng và dị ứng trước khi thăm khám.
                    </p>

                    <Space wrap style={{ marginTop: 20 }}>
                        <Button
                            type="primary"
                            icon={<EditOutlined />}
                            onClick={openEditProfile}
                        >
                            Cập nhật hồ sơ
                        </Button>

                        <Button icon={<PlusOutlined />} onClick={openCreateAllergy}>
                            Thêm dị ứng
                        </Button>

                        <Link href="/dashboard/patient/medical-records">
                            <Button icon={<FileProtectIcon />}>
                                Xem bệnh án
                            </Button>
                        </Link>
                    </Space>
                </div>

                <article className={styles.heroCard}>
                    <span>Mức hoàn thiện hồ sơ</span>
                    <strong>{completion}%</strong>
                    <p>
                        Hồ sơ càng đầy đủ thì bác sĩ càng dễ đánh giá rủi ro khi
                        khám và kê đơn.
                    </p>
                </article>
            </section>

            {error && (
                <section style={{ marginTop: 24 }}>
                    <Alert
                        type="error"
                        showIcon
                        message="Không thể tải hồ sơ sức khỏe"
                        description={error}
                    />
                </section>
            )}

            <ClinicalPageState
                loading={loading}
                error={null}
                empty={!profile && allergies.length === 0}
                emptyTitle="Chưa có hồ sơ sức khỏe"
                emptyDescription="Hãy cập nhật thông tin sức khỏe để bác sĩ có thêm dữ liệu khi khám."
                actionText="Cập nhật hồ sơ"
                onAction={openEditProfile}
            >
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
                            <strong>Nhóm máu</strong>
                            <Tag color={profile?.bloodType ? 'red' : 'default'}>
                                {profile?.bloodType || 'Chưa cập nhật'}
                            </Tag>
                        </div>
                        <p className={styles.muted}>
                            Thông tin quan trọng trong cấp cứu và điều trị.
                        </p>
                    </article>

                    <article className={styles.listCard}>
                        <div className={styles.listTitle}>
                            <strong>Chỉ số BMI</strong>
                            <Tag color={bmiMeta.color}>
                                {bmi != null ? bmi : 'N/A'} · {bmiMeta.label}
                            </Tag>
                        </div>
                        <p className={styles.muted}>
                            Chiều cao: <b>{profile?.heightCm || 'N/A'} cm</b> ·
                            Cân nặng: <b>{profile?.weightKg || 'N/A'} kg</b>
                        </p>
                    </article>

                    <article className={styles.listCard}>
                        <div className={styles.listTitle}>
                            <strong>Dị ứng cần chú ý</strong>
                            <Tag color={highRiskAllergies > 0 ? 'red' : 'green'}>
                                {highRiskAllergies}
                            </Tag>
                        </div>
                        <p className={styles.muted}>
                            Dị ứng nặng cần được bác sĩ kiểm tra trước khi kê đơn.
                        </p>
                    </article>
                </section>

                <section className={styles.portalPanel} style={{ marginTop: 24 }}>
                    <div className={styles.panelHeader}>
                        <div>
                            <span>Tổng quan sức khỏe</span>
                            <h2>Thông tin y tế cá nhân</h2>
                        </div>

                        <Button
                            icon={<ReloadOutlined />}
                            onClick={loadProfile}
                            loading={loading}
                        >
                            Làm mới
                        </Button>
                    </div>

                    <Descriptions
                        bordered
                        column={1}
                        size="small"
                        style={{ marginTop: 20 }}
                    >
                        <Descriptions.Item label="Bệnh nền / bệnh mạn tính">
                            {getSafeText(
                                profile?.chronicDiseases ||
                                profile?.chronicConditionsNote,
                            )}
                        </Descriptions.Item>

                        <Descriptions.Item label="Tiền sử bệnh">
                            {getSafeText(profile?.medicalHistory)}
                        </Descriptions.Item>

                        <Descriptions.Item label="Thuốc đang sử dụng">
                            {getSafeText(profile?.currentMedicationsNote)}
                        </Descriptions.Item>

                        <Descriptions.Item label="Ghi chú thêm">
                            {getSafeText(profile?.note)}
                        </Descriptions.Item>

                        <Descriptions.Item label="Cập nhật gần nhất">
                            {formatDateTime(profile?.updatedAt)}
                        </Descriptions.Item>
                    </Descriptions>
                </section>

                <section className={styles.portalPanel} style={{ marginTop: 24 }}>
                    <div className={styles.panelHeader}>
                        <div>
                            <span>Dị ứng</span>
                            <h2>Danh sách dị ứng của tôi</h2>
                        </div>

                        {/* <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={openCreateAllergy}
                        >
                            Thêm dị ứng
                        </Button> */}
                    </div>

                    {allergies.length === 0 ? (
                        <Alert
                            type="info"
                            showIcon
                            style={{ marginTop: 20 }}
                            message="Chưa ghi nhận dị ứng"
                            description="Nếu bạn dị ứng thuốc, thức ăn hoặc thành phần nào, hãy thêm vào hồ sơ để bác sĩ kiểm tra khi kê đơn."
                        />
                    ) : (
                        <Space
                            direction="vertical"
                            size={12}
                            style={{ width: '100%', marginTop: 20 }}
                        >
                            {allergies.map((allergy) => {
                                const severity = getSeverityMeta(
                                    allergy.severity,
                                );

                                return (
                                    <article
                                        key={allergy.id}
                                        className={styles.listCard}
                                    >
                                        <div className={styles.listTitle}>
                                            <Space wrap>
                                                <span
                                                    style={{
                                                        width: 36,
                                                        height: 36,
                                                        borderRadius: 999,
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        color:
                                                            severity.color ===
                                                                'red' ||
                                                                severity.color ===
                                                                'volcano'
                                                                ? '#ef4444'
                                                                : '#2563eb',
                                                        background: '#f8fafc',
                                                        border:
                                                            '1px solid #e2e8f0',
                                                    }}
                                                >
                                                    <WarningOutlined />
                                                </span>

                                                <strong>{allergy.allergen}</strong>
                                            </Space>

                                            <Tag color={severity.color}>
                                                {severity.label}
                                            </Tag>
                                        </div>

                                        <p className={styles.muted}>
                                            Phản ứng:{' '}
                                            <b>
                                                {allergy.reaction ||
                                                    'Chưa cập nhật'}
                                            </b>
                                        </p>

                                        {allergy.note && (
                                            <p className={styles.muted}>
                                                Ghi chú: {allergy.note}
                                            </p>
                                        )}

                                        <Space wrap>
                                            <Button
                                                icon={<EditOutlined />}
                                                onClick={() =>
                                                    openEditAllergy(allergy)
                                                }
                                            >
                                                Chỉnh sửa
                                            </Button>

                                            <Button
                                                danger
                                                icon={<DeleteOutlined />}
                                                onClick={() =>
                                                    handleDeleteAllergy(allergy)
                                                }
                                            >
                                                Xóa
                                            </Button>
                                        </Space>
                                    </article>
                                );
                            })}
                        </Space>
                    )}
                </section>

                <section className={styles.portalPanel} style={{ marginTop: 24 }}>
                    <div className={styles.panelHeader}>
                        <div>
                            <span>Lưu ý an toàn</span>
                            <h2>Vì sao cần cập nhật hồ sơ?</h2>
                        </div>
                    </div>

                    <Space
                        direction="vertical"
                        size={12}
                        style={{ width: '100%', marginTop: 20 }}
                    >
                        <Alert
                            type="success"
                            showIcon
                            icon={<SafetyCertificateOutlined />}
                            message="Hỗ trợ bác sĩ kê đơn an toàn hơn"
                            description="Thông tin dị ứng và thuốc đang dùng giúp giảm nguy cơ kê thuốc không phù hợp."
                        />

                        <Alert
                            type="info"
                            showIcon
                            icon={<MedicineBoxOutlined />}
                            message="Theo dõi thuốc đang sử dụng"
                            description="Nếu bạn đang dùng thuốc dài ngày, hãy cập nhật để bác sĩ cân nhắc khi điều trị."
                        />

                        <Alert
                            type="warning"
                            showIcon
                            icon={<HeartOutlined />}
                            message="Bệnh nền cần được ghi rõ"
                            description="Các bệnh như tăng huyết áp, tiểu đường, hen suyễn hoặc bệnh tim mạch có thể ảnh hưởng đến phác đồ điều trị."
                        />
                    </Space>
                </section>
            </ClinicalPageState>

            <Modal
                title="Cập nhật hồ sơ sức khỏe"
                open={openProfileModal}
                onCancel={() => setOpenProfileModal(false)}
                footer={null}
                destroyOnClose
            >
                <Form
                    form={profileForm}
                    layout="vertical"
                    onFinish={handleSaveProfile}
                    requiredMark={false}
                >
                    <Form.Item label="Nhóm máu" name="bloodType">
                        <Select
                            allowClear
                            placeholder="Chọn nhóm máu"
                            options={bloodTypeOptions}
                        />
                    </Form.Item>

                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: 12,
                        }}
                    >
                        <Form.Item label="Chiều cao" name="heightCm">
                            <InputNumber
                                min={30}
                                max={250}
                                style={{ width: '100%' }}
                                addonAfter="cm"
                            />
                        </Form.Item>

                        <Form.Item label="Cân nặng" name="weightKg">
                            <InputNumber
                                min={1}
                                max={300}
                                style={{ width: '100%' }}
                                addonAfter="kg"
                            />
                        </Form.Item>
                    </div>

                    <Form.Item label="Bệnh nền / bệnh mạn tính" name="chronicDiseases">
                        <Input.TextArea
                            rows={3}
                            placeholder="VD: Tăng huyết áp, tiểu đường, hen suyễn..."
                        />
                    </Form.Item>

                    <Form.Item label="Tiền sử bệnh" name="medicalHistory">
                        <Input.TextArea
                            rows={3}
                            placeholder="VD: Đã từng phẫu thuật, nhập viện, bệnh lý đáng chú ý..."
                        />
                    </Form.Item>

                    <Form.Item
                        label="Thuốc đang sử dụng"
                        name="currentMedicationsNote"
                    >
                        <Input.TextArea
                            rows={3}
                            placeholder="VD: Thuốc huyết áp, thuốc tiểu đường, thuốc bổ sung..."
                        />
                    </Form.Item>

                    <Form.Item label="Ghi chú thêm" name="note">
                        <Input.TextArea
                            rows={3}
                            placeholder="Thông tin khác bạn muốn bác sĩ biết..."
                        />
                    </Form.Item>

                    <Button
                        type="primary"
                        htmlType="submit"
                        loading={saving}
                        block
                    >
                        Lưu hồ sơ sức khỏe
                    </Button>
                </Form>
            </Modal>

            <Modal
                title={editingAllergy ? 'Chỉnh sửa dị ứng' : 'Thêm dị ứng'}
                open={openAllergyModal}
                onCancel={() => {
                    setOpenAllergyModal(false);
                    setEditingAllergy(null);
                }}
                footer={null}
                destroyOnClose
            >
                <Form
                    form={allergyForm}
                    layout="vertical"
                    onFinish={handleSaveAllergy}
                    requiredMark={false}
                >
                    <Form.Item
                        label="Tác nhân gây dị ứng"
                        name="allergen"
                        rules={[
                            {
                                required: true,
                                message: 'Vui lòng nhập tác nhân gây dị ứng.',
                            },
                            {
                                max: 150,
                                message: 'Tên tác nhân tối đa 150 ký tự.',
                            },
                        ]}
                    >
                        <Input placeholder="VD: Penicillin, hải sản, đậu phộng..." />
                    </Form.Item>

                    <Form.Item label="Mức độ" name="severity">
                        <Select
                            allowClear
                            placeholder="Chọn mức độ dị ứng"
                            options={severityOptions}
                        />
                    </Form.Item>

                    <Form.Item label="Phản ứng thường gặp" name="reaction">
                        <Input.TextArea
                            rows={3}
                            placeholder="VD: Nổi mẩn đỏ, khó thở, buồn nôn..."
                        />
                    </Form.Item>

                    <Form.Item label="Ghi chú" name="note">
                        <Input.TextArea
                            rows={3}
                            placeholder="Ghi chú thêm nếu có..."
                        />
                    </Form.Item>

                    <Button
                        type="primary"
                        htmlType="submit"
                        loading={saving}
                        block
                    >
                        {editingAllergy ? 'Lưu thay đổi' : 'Thêm dị ứng'}
                    </Button>
                </Form>
            </Modal>
        </PatientPortalFrame>
    );
}

function FileProtectIcon() {
    return <SafetyCertificateOutlined />;
}