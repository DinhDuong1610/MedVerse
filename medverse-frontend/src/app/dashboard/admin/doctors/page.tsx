'use client';

import {
    Alert,
    Button,
    Card,
    Drawer,
    Form,
    Input,
    InputNumber,
    List,
    Select,
    Space,
    Statistic,
    Tag,
    message,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';
import ClinicalEmptyState from '../../_components/ClinicalEmptyState';
import ClinicalPageState from '../../_components/ClinicalPageState';
import DashboardFrame from '../../_components/DashboardFrame';
import RoleGuardState from '../../_components/RoleGuardState';
import { useAuthSession } from '@/lib/auth/use-auth-session';
import { getDirectoryDoctors, getDirectorySpecialties } from '@/services/directory.service';
import { updateAdminDoctorProfile } from '@/services/admin-user.service';
import type { DirectoryDoctor, DirectorySpecialty } from '@/types/clinical';
import styles from '../../dashboard.module.scss';

type DoctorProfileFormValues = {
    specialtyId?: string;
    licenseNumber?: string;
    degree?: string;
    experienceYears?: number;
    bio?: string;
};

function normalizeText(value?: string) {
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
}

export default function AdminDoctorsPage() {
    const { session, loading: authLoading } = useAuthSession();

    const [form] = Form.useForm<DoctorProfileFormValues>();

    const [doctors, setDoctors] = useState<DirectoryDoctor[]>([]);
    const [specialties, setSpecialties] = useState<DirectorySpecialty[]>([]);
    const [keyword, setKeyword] = useState('');
    const [specialtyId, setSpecialtyId] = useState<string | undefined>();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [drawerOpen, setDrawerOpen] = useState(false);
    const [selectedDoctor, setSelectedDoctor] = useState<DirectoryDoctor | null>(null);

    const loadDoctors = async () => {
        try {
            setLoading(true);
            setError(null);

            const data = await getDirectoryDoctors({
                specialtyId,
                keyword,
            });

            setDoctors(data || []);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Không thể tải danh sách bác sĩ.',
            );
        } finally {
            setLoading(false);
        }
    };

    const loadSpecialties = async () => {
        try {
            const data = await getDirectorySpecialties();
            setSpecialties(data || []);
        } catch {
            setSpecialties([]);
        }
    };

    useEffect(() => {
        if (!session) return;

        if (session.role !== 'ADMIN' && session.primaryRole !== 'ADMIN') {
            setLoading(false);
            return;
        }

        loadSpecialties();
        loadDoctors();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session]);

    const metrics = useMemo(() => {
        const withSpecialty = doctors.filter((item) => item.specialtyId).length;
        const withLicense = doctors.filter((item) => item.licenseNumber).length;
        const completeProfile = doctors.filter(
            (item) =>
                item.specialtyId &&
                item.licenseNumber &&
                item.degree &&
                typeof item.experienceYears === 'number',
        ).length;

        return {
            total: doctors.length,
            withSpecialty,
            missingSpecialty: doctors.length - withSpecialty,
            withLicense,
            completeProfile,
        };
    }, [doctors]);

    const handleFilter = () => {
        loadDoctors();
    };

    const openEditDrawer = (doctor: DirectoryDoctor) => {
        setSelectedDoctor(doctor);

        form.setFieldsValue({
            specialtyId: doctor.specialtyId,
            licenseNumber: doctor.licenseNumber || '',
            degree: doctor.degree || '',
            experienceYears: doctor.experienceYears,
            bio: doctor.bio || '',
        });

        setDrawerOpen(true);
    };

    const handleUpdateDoctorProfile = async (values: DoctorProfileFormValues) => {
        if (!selectedDoctor?.userId) return;

        try {
            setSaving(true);

            await updateAdminDoctorProfile(selectedDoctor.userId, {
                specialtyId: values.specialtyId,
                licenseNumber: normalizeText(values.licenseNumber),
                degree: normalizeText(values.degree),
                experienceYears: values.experienceYears,
                bio: normalizeText(values.bio),
            });

            message.success('Đã cập nhật hồ sơ bác sĩ.');

            setDrawerOpen(false);
            setSelectedDoctor(null);
            form.resetFields();

            await loadDoctors();
        } catch (err) {
            message.error(
                err instanceof Error
                    ? err.message
                    : 'Không thể cập nhật hồ sơ bác sĩ.',
            );
        } finally {
            setSaving(false);
        }
    };

    if (authLoading || !session) {
        return <ClinicalPageState loading>Loading</ClinicalPageState>;
    }

    return (
        <DashboardFrame
            session={session}
            title="Quản lý bác sĩ"
            subtitle="Kiểm tra hồ sơ bác sĩ hiển thị trong danh bạ và luồng đặt lịch"
        >
            <RoleGuardState session={session} allow={['ADMIN']}>
                <section className={styles.metricGrid}>
                    <Card className={styles.metricCard}>
                        <Statistic title="Tổng bác sĩ" value={metrics.total} />
                    </Card>

                    <Card className={styles.metricCard}>
                        <Statistic
                            title="Đã gán chuyên khoa"
                            value={metrics.withSpecialty}
                        />
                    </Card>

                    <Card className={styles.metricCard}>
                        <Statistic
                            title="Thiếu chuyên khoa"
                            value={metrics.missingSpecialty}
                        />
                    </Card>

                    <Card className={styles.metricCard}>
                        <Statistic
                            title="Hồ sơ đầy đủ"
                            value={metrics.completeProfile}
                        />
                    </Card>
                </section>

                <Card className={styles.detailCard} style={{ marginTop: 24 }}>
                    <div className={styles.panelHeader}>
                        <div>
                            <span>Doctor directory admin</span>
                            <h2>Danh sách bác sĩ</h2>
                            <p>
                                Dữ liệu tại đây là dữ liệu bệnh nhân sẽ thấy khi chọn
                                bác sĩ trong luồng đặt lịch.
                            </p>
                        </div>

                        <Space wrap>
                            <Input.Search
                                allowClear
                                placeholder="Tìm tên, email, học vị..."
                                value={keyword}
                                onChange={(event) => setKeyword(event.target.value)}
                                onSearch={handleFilter}
                                style={{ width: 260 }}
                            />

                            <Select
                                allowClear
                                showSearch
                                placeholder="Lọc chuyên khoa"
                                optionFilterProp="label"
                                value={specialtyId}
                                onChange={setSpecialtyId}
                                style={{ width: 220 }}
                                options={specialties.map((item) => ({
                                    value: item.id,
                                    label: item.name,
                                }))}
                            />

                            <Button onClick={handleFilter}>Lọc</Button>
                            <Button onClick={loadDoctors}>Làm mới</Button>
                        </Space>
                    </div>

                    {error && (
                        <Alert
                            type="error"
                            showIcon
                            message="Không thể tải danh sách bác sĩ"
                            description={error}
                            style={{ marginBottom: 16 }}
                        />
                    )}

                    <ClinicalPageState loading={loading}>
                        {doctors.length === 0 ? (
                            <ClinicalEmptyState
                                title="Chưa có bác sĩ"
                                description="Không tìm thấy bác sĩ nào theo bộ lọc hiện tại."
                            />
                        ) : (
                            <List
                                dataSource={doctors}
                                renderItem={(doctor) => (
                                    <List.Item className={styles.cleanListItem}>
                                        <List.Item.Meta
                                            title={
                                                <div className={styles.listTitle}>
                                                    <strong>
                                                        {doctor.fullName || doctor.email}
                                                    </strong>

                                                    <Space wrap>
                                                        <Tag color="blue">
                                                            {doctor.specialtyName ||
                                                                'Chưa gán chuyên khoa'}
                                                        </Tag>

                                                        {doctor.degree && (
                                                            <Tag color="cyan">
                                                                {doctor.degree}
                                                            </Tag>
                                                        )}

                                                        {!doctor.specialtyId && (
                                                            <Tag color="orange">
                                                                Thiếu chuyên khoa
                                                            </Tag>
                                                        )}

                                                        {!doctor.licenseNumber && (
                                                            <Tag color="gold">
                                                                Thiếu giấy phép
                                                            </Tag>
                                                        )}
                                                    </Space>
                                                </div>
                                            }
                                            description={
                                                <div>
                                                    <p>
                                                        Email: <b>{doctor.email}</b>
                                                    </p>

                                                    <p>
                                                        SĐT:{' '}
                                                        {doctor.phoneNumber ||
                                                            'Chưa cập nhật'}
                                                    </p>

                                                    <p>
                                                        Chuyên khoa:{' '}
                                                        <b>
                                                            {doctor.specialtyName ||
                                                                'Chưa gán'}
                                                        </b>
                                                    </p>

                                                    <p>
                                                        Giấy phép:{' '}
                                                        {doctor.licenseNumber ||
                                                            'Chưa cập nhật'}{' '}
                                                        · Kinh nghiệm:{' '}
                                                        <b>
                                                            {doctor.experienceYears || 0}
                                                        </b>{' '}
                                                        năm
                                                    </p>

                                                    <p>
                                                        Giới thiệu:{' '}
                                                        {doctor.bio ||
                                                            'Chưa cập nhật bio.'}
                                                    </p>
                                                </div>
                                            }
                                        />

                                        <Button onClick={() => openEditDrawer(doctor)}>
                                            Sửa hồ sơ
                                        </Button>
                                    </List.Item>
                                )}
                            />
                        )}
                    </ClinicalPageState>
                </Card>

                <Drawer
                    title="Cập nhật hồ sơ bác sĩ"
                    open={drawerOpen}
                    width={560}
                    onClose={() => {
                        setDrawerOpen(false);
                        setSelectedDoctor(null);
                        form.resetFields();
                    }}
                    destroyOnClose
                >
                    <Form
                        form={form}
                        layout="vertical"
                        onFinish={handleUpdateDoctorProfile}
                    >
                        <Alert
                            type="info"
                            showIcon
                            message="Hồ sơ này sẽ hiển thị ở danh bạ bác sĩ và booking"
                            description="Hãy đảm bảo bác sĩ có chuyên khoa, giấy phép, học vị và giới thiệu rõ ràng."
                            style={{ marginBottom: 16 }}
                        />

                        <Form.Item label="Bác sĩ">
                            <Input
                                value={
                                    selectedDoctor?.fullName ||
                                    selectedDoctor?.email
                                }
                                disabled
                            />
                        </Form.Item>

                        <Form.Item label="Chuyên khoa" name="specialtyId">
                            <Select
                                allowClear
                                showSearch
                                placeholder="Chọn chuyên khoa"
                                optionFilterProp="label"
                                options={specialties.map((item) => ({
                                    value: item.id,
                                    label: item.name,
                                }))}
                            />
                        </Form.Item>

                        <Form.Item label="Số giấy phép" name="licenseNumber">
                            <Input placeholder="VN-DR-001" />
                        </Form.Item>

                        <Form.Item label="Học vị" name="degree">
                            <Input placeholder="BS.CKI, ThS, TS..." />
                        </Form.Item>

                        <Form.Item
                            label="Số năm kinh nghiệm"
                            name="experienceYears"
                        >
                            <InputNumber min={0} style={{ width: '100%' }} />
                        </Form.Item>

                        <Form.Item label="Giới thiệu" name="bio">
                            <Input.TextArea
                                rows={4}
                                placeholder="Mô tả kinh nghiệm, thế mạnh chuyên môn..."
                            />
                        </Form.Item>

                        <Button
                            type="primary"
                            htmlType="submit"
                            loading={saving}
                            block
                        >
                            Lưu hồ sơ bác sĩ
                        </Button>
                    </Form>
                </Drawer>
            </RoleGuardState>
        </DashboardFrame>
    );
}