'use client';

import {
    CalendarOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    MedicineBoxOutlined,
    ReloadOutlined,
    SafetyCertificateOutlined,
    SearchOutlined,
    TeamOutlined,
    UserOutlined,
} from '@ant-design/icons';
import {
    Alert,
    Button,
    DatePicker,
    Form,
    Input,
    Select,
    Space,
    Tag,
    TimePicker,
    message,
} from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import ClinicalPageState from '../../_components/ClinicalPageState';
import PatientPortalFrame from '../../_components/PatientPortalFrame';
import StatusTag from '../../_components/StatusTag';
import { hasRole } from '@/lib/auth/roles';
import { useAuthSession } from '@/lib/auth/use-auth-session';
import { createMyAppointmentRequest } from '@/services/appointment-request.service';
import {
    getDirectoryDoctors,
    getDirectorySpecialties,
} from '@/services/directory.service';
import { getAvailableWorkSlots } from '@/services/work-slot.service';
import type {
    AppointmentRequestCreatePayload,
    DirectoryDoctor,
    DirectorySpecialty,
    WorkSlot,
} from '@/types/clinical';
import styles from '../../_components/patient-portal.module.scss';

type BookAppointmentFormValues = {
    specialtyId: string;
    doctorId: string;
    selectedSlotId?: string;
    desiredDate: Dayjs;
    desiredTime: Dayjs;
    type: 'ONLINE' | 'OFFLINE';
    symptoms?: string;
};

function formatDateTime(value?: string) {
    if (!value) return 'Chưa ghi nhận';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleString('vi-VN');
}

function formatTime(value?: string) {
    if (!value) return 'Chưa ghi nhận';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
    });
}

function getDoctorName(doctor?: DirectoryDoctor) {
    if (!doctor) return 'Chưa chọn bác sĩ';

    return doctor.fullName || doctor.email || 'Bác sĩ';
}

function getSlotLabel(slot: WorkSlot) {
    return `${formatDateTime(slot.startTime)} → ${formatTime(slot.endTime)}`;
}

function buildAppointmentPayload(
    values: BookAppointmentFormValues,
    slot?: WorkSlot,
): AppointmentRequestCreatePayload {
    const selectedDate = slot ? dayjs(slot.startTime) : values.desiredDate;
    const selectedTime = slot ? dayjs(slot.startTime) : values.desiredTime;

    const payload: AppointmentRequestCreatePayload = {
        doctorId: values.doctorId,
        specialtyId: values.specialtyId,
        desiredDate: selectedDate.format('YYYY-MM-DD'),
        desiredTime: selectedTime.format('HH:mm:ss'),
        type: values.type,
    };

    if (values.symptoms?.trim()) {
        payload.symptoms = values.symptoms.trim();
    }

    return payload;
}

export default function PatientBookAppointmentPage() {
    const { session, loading: authLoading } = useAuthSession();

    const [form] = Form.useForm<BookAppointmentFormValues>();

    const [specialties, setSpecialties] = useState<DirectorySpecialty[]>([]);
    const [doctors, setDoctors] = useState<DirectoryDoctor[]>([]);
    const [availableSlots, setAvailableSlots] = useState<WorkSlot[]>([]);

    const [loading, setLoading] = useState(true);
    const [directoryLoading, setDirectoryLoading] = useState(false);
    const [slotLoading, setSlotLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const selectedSpecialtyId = Form.useWatch('specialtyId', form);
    const selectedDoctorId = Form.useWatch('doctorId', form);
    const selectedSlotId = Form.useWatch('selectedSlotId', form);
    const selectedType = Form.useWatch('type', form);

    const selectedSpecialty = useMemo(
        () => specialties.find((specialty) => specialty.id === selectedSpecialtyId),
        [specialties, selectedSpecialtyId],
    );

    const selectedDoctor = useMemo(
        () => doctors.find((doctor) => doctor.userId === selectedDoctorId),
        [doctors, selectedDoctorId],
    );

    const selectedSlot = useMemo(
        () => availableSlots.find((slot) => slot.id === selectedSlotId),
        [availableSlots, selectedSlotId],
    );

    const loadDirectory = async () => {
        try {
            setLoading(true);
            setDirectoryLoading(true);
            setError(null);

            const [specialtyData, doctorData] = await Promise.all([
                getDirectorySpecialties(),
                getDirectoryDoctors(),
            ]);

            setSpecialties(specialtyData || []);
            setDoctors(doctorData || []);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Không thể tải danh sách chuyên khoa/bác sĩ.',
            );
        } finally {
            setDirectoryLoading(false);
            setLoading(false);
        }
    };

    const loadAvailableSlots = async (doctorId: string) => {
        try {
            setSlotLoading(true);
            setAvailableSlots([]);
            form.setFieldValue('selectedSlotId', undefined);

            const slots = await getAvailableWorkSlots(doctorId);

            const sortedSlots = [...(slots || [])].sort((a, b) =>
                String(a.startTime).localeCompare(String(b.startTime)),
            );

            setAvailableSlots(sortedSlots);
        } catch (err) {
            message.error(
                err instanceof Error
                    ? err.message
                    : 'Không thể tải slot khả dụng của bác sĩ.',
            );
        } finally {
            setSlotLoading(false);
        }
    };

    useEffect(() => {
        if (!session) return;

        if (!hasRole(session, 'PATIENT')) {
            setError('Trang này chỉ dành cho bệnh nhân.');
            setLoading(false);
            return;
        }

        loadDirectory();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session]);

    const handleSpecialtyChange = async (specialtyId: string) => {
        try {
            setDirectoryLoading(true);

            form.setFieldValue('specialtyId', specialtyId);
            form.setFieldValue('doctorId', undefined);
            form.setFieldValue('selectedSlotId', undefined);
            setAvailableSlots([]);

            const doctorData = await getDirectoryDoctors({ specialtyId });
            setDoctors(doctorData || []);
        } catch (err) {
            message.error(
                err instanceof Error
                    ? err.message
                    : 'Không thể lọc bác sĩ theo chuyên khoa.',
            );
        } finally {
            setDirectoryLoading(false);
        }
    };

    const handleDoctorChange = async (doctorId: string) => {
        form.setFieldValue('doctorId', doctorId);
        await loadAvailableSlots(doctorId);
    };

    const handleSlotChange = (slotId: string) => {
        form.setFieldValue('selectedSlotId', slotId);

        const slot = availableSlots.find((item) => item.id === slotId);

        if (!slot) return;

        const start = dayjs(slot.startTime);

        form.setFieldValue('desiredDate', start);
        form.setFieldValue('desiredTime', start);
    };

    const handleSubmit = async (values: BookAppointmentFormValues) => {
        try {
            setSubmitting(true);

            const slot = availableSlots.find(
                (item) => item.id === values.selectedSlotId,
            );

            const payload = buildAppointmentPayload(values, slot);

            await createMyAppointmentRequest(payload);

            message.success('Đã gửi yêu cầu đặt lịch.');

            form.resetFields();
            form.setFieldsValue({
                type: 'OFFLINE',
                desiredDate: dayjs().add(1, 'day'),
            });

            setAvailableSlots([]);
        } catch (err) {
            message.error(
                err instanceof Error
                    ? err.message
                    : 'Không thể gửi yêu cầu đặt lịch.',
            );
        } finally {
            setSubmitting(false);
        }
    };

    const handleReset = () => {
        form.resetFields();
        form.setFieldsValue({
            type: 'OFFLINE',
            desiredDate: dayjs().add(1, 'day'),
        });
        setAvailableSlots([]);
    };

    const metrics = useMemo(() => {
        return {
            specialtyCount: specialties.length,
            doctorCount: doctors.length,
            slotCount: availableSlots.length,
        };
    }, [specialties, doctors, availableSlots]);

    if (authLoading || !session) {
        return <ClinicalPageState loading>Loading</ClinicalPageState>;
    }

    return (
        <PatientPortalFrame session={session}>
            <ClinicalPageState
                loading={loading}
                error={error}
                empty={specialties.length === 0 && doctors.length === 0}
                emptyTitle="Chưa có dữ liệu chuyên khoa/bác sĩ"
                emptyDescription="Hãy kiểm tra seed demo data hoặc Directory API ở backend."
            >
                <section className={styles.hero}>
                    <div>
                        <div className={styles.heroKicker}>Đặt lịch khám</div>
                        <h1 className={styles.heroTitle}>
                            Chọn bác sĩ và khung giờ phù hợp
                        </h1>
                        <p className={styles.heroDescription}>
                            Bạn chọn chuyên khoa, bác sĩ và slot còn trống. Sau khi
                            gửi yêu cầu, lễ tân sẽ xác nhận và tạo lịch hẹn chính
                            thức cho bạn.
                        </p>

                        <Space wrap style={{ marginTop: 20 }}>
                            <Link href="/dashboard/patient/appointment-requests">
                                <Button type="primary" icon={<CalendarOutlined />}>
                                    Xem yêu cầu đã gửi
                                </Button>
                            </Link>

                            <Link href="/dashboard/patient/appointments">
                                <Button>Xem lịch hẹn</Button>
                            </Link>
                        </Space>
                    </div>

                    <article className={styles.heroCard}>
                        <span>Slot khả dụng</span>
                        <strong>{metrics.slotCount}</strong>
                        <p>
                            Slot được lấy trực tiếp từ lịch làm việc của bác sĩ bạn
                            đang chọn.
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
                            <strong>Chuyên khoa</strong>
                            <Tag color="blue">{metrics.specialtyCount}</Tag>
                        </div>
                        <p className={styles.muted}>
                            Danh mục chuyên khoa có thể đặt lịch.
                        </p>
                    </article>

                    <article className={styles.listCard}>
                        <div className={styles.listTitle}>
                            <strong>Bác sĩ phù hợp</strong>
                            <Tag color="green">{metrics.doctorCount}</Tag>
                        </div>
                        <p className={styles.muted}>
                            Danh sách bác sĩ theo chuyên khoa đang chọn.
                        </p>
                    </article>

                    <article className={styles.listCard}>
                        <div className={styles.listTitle}>
                            <strong>Hình thức khám</strong>
                            <Tag color={selectedType === 'ONLINE' ? 'purple' : 'cyan'}>
                                {selectedType === 'ONLINE'
                                    ? 'Trực tuyến'
                                    : 'Trực tiếp'}
                            </Tag>
                        </div>
                        <p className={styles.muted}>
                            Bạn có thể chọn khám trực tiếp hoặc online nếu được hỗ trợ.
                        </p>
                    </article>
                </section>

                <section className={styles.contentGrid}>
                    <section className={styles.portalPanel} style={{ marginTop: 24 }}>
                        <div className={styles.panelHeader}>
                            <div>
                                <span>Thông tin yêu cầu</span>
                                <h2>Gửi yêu cầu đặt lịch</h2>
                                <p>
                                    Hãy chọn theo thứ tự: chuyên khoa, bác sĩ, slot
                                    còn trống và mô tả ngắn triệu chứng.
                                </p>
                            </div>

                            <Button icon={<ReloadOutlined />} onClick={loadDirectory}>
                                Làm mới
                            </Button>
                        </div>

                        <Form
                            form={form}
                            layout="vertical"
                            onFinish={handleSubmit}
                            requiredMark={false}
                            initialValues={{
                                type: 'OFFLINE',
                                desiredDate: dayjs().add(1, 'day'),
                            }}
                            style={{ marginTop: 20 }}
                        >
                            <Form.Item
                                label="Chuyên khoa"
                                name="specialtyId"
                                rules={[
                                    {
                                        required: true,
                                        message: 'Chọn chuyên khoa',
                                    },
                                ]}
                            >
                                <Select
                                    showSearch
                                    loading={directoryLoading}
                                    placeholder="Chọn chuyên khoa"
                                    optionFilterProp="label"
                                    suffixIcon={<SearchOutlined />}
                                    onChange={handleSpecialtyChange}
                                    options={specialties.map((item) => ({
                                        value: item.id,
                                        label: `${item.name} (${item.code})`,
                                    }))}
                                />
                            </Form.Item>

                            <Form.Item
                                label="Bác sĩ"
                                name="doctorId"
                                rules={[
                                    {
                                        required: true,
                                        message: 'Chọn bác sĩ',
                                    },
                                ]}
                            >
                                <Select
                                    showSearch
                                    loading={directoryLoading}
                                    placeholder={
                                        selectedSpecialtyId
                                            ? 'Chọn bác sĩ'
                                            : 'Chọn chuyên khoa trước'
                                    }
                                    optionFilterProp="label"
                                    disabled={!selectedSpecialtyId}
                                    onChange={handleDoctorChange}
                                    options={doctors.map((doctor) => ({
                                        value: doctor.userId,
                                        label: `${getDoctorName(doctor)} · ${doctor.specialtyName ||
                                            'Chưa rõ chuyên khoa'
                                            }`,
                                    }))}
                                />
                            </Form.Item>

                            <Form.Item
                                label="Chọn slot khám còn trống"
                                name="selectedSlotId"
                                rules={[
                                    {
                                        required: true,
                                        message:
                                            'Chọn một slot còn trống của bác sĩ',
                                    },
                                ]}
                            >
                                <Select
                                    loading={slotLoading}
                                    disabled={!selectedDoctorId}
                                    placeholder={
                                        selectedDoctorId
                                            ? 'Chọn slot khả dụng'
                                            : 'Chọn bác sĩ trước'
                                    }
                                    onChange={handleSlotChange}
                                    options={availableSlots.map((slot) => ({
                                        value: slot.id,
                                        label: getSlotLabel(slot),
                                    }))}
                                    notFoundContent={
                                        selectedDoctorId
                                            ? 'Bác sĩ này chưa có slot khả dụng'
                                            : 'Chọn bác sĩ trước'
                                    }
                                />
                            </Form.Item>

                            <div
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr',
                                    gap: 12,
                                }}
                            >
                                <Form.Item
                                    label="Ngày mong muốn"
                                    name="desiredDate"
                                    rules={[
                                        {
                                            required: true,
                                            message: 'Chọn ngày khám',
                                        },
                                    ]}
                                >
                                    <DatePicker
                                        style={{ width: '100%' }}
                                        disabledDate={(current) =>
                                            current
                                                ? current <= dayjs().endOf('day')
                                                : false
                                        }
                                    />
                                </Form.Item>

                                <Form.Item
                                    label="Giờ mong muốn"
                                    name="desiredTime"
                                    rules={[
                                        {
                                            required: true,
                                            message: 'Chọn giờ khám',
                                        },
                                    ]}
                                >
                                    <TimePicker
                                        format="HH:mm"
                                        style={{ width: '100%' }}
                                    />
                                </Form.Item>
                            </div>

                            <Form.Item
                                label="Hình thức khám"
                                name="type"
                                rules={[
                                    {
                                        required: true,
                                        message: 'Chọn hình thức khám',
                                    },
                                ]}
                            >
                                <Select
                                    options={[
                                        {
                                            value: 'OFFLINE',
                                            label: 'Khám trực tiếp',
                                        },
                                        {
                                            value: 'ONLINE',
                                            label: 'Khám online',
                                        },
                                    ]}
                                />
                            </Form.Item>

                            <Form.Item label="Triệu chứng / Ghi chú" name="symptoms">
                                <Input.TextArea
                                    rows={5}
                                    placeholder="Mô tả ngắn gọn triệu chứng, nhu cầu khám hoặc ghi chú cho lễ tân/bác sĩ."
                                />
                            </Form.Item>

                            <Space wrap style={{ width: '100%' }}>
                                <Button
                                    type="primary"
                                    htmlType="submit"
                                    loading={submitting}
                                    size="large"
                                    icon={<CheckCircleOutlined />}
                                >
                                    Gửi yêu cầu đặt lịch
                                </Button>

                                <Button size="large" onClick={handleReset}>
                                    Đặt lại
                                </Button>
                            </Space>
                        </Form>
                    </section>

                    <aside className={styles.portalPanel} style={{ marginTop: 24 }}>
                        <div className={styles.panelHeader}>
                            <div>
                                <span>Tóm tắt lựa chọn</span>
                                <h2>Thông tin đang chọn</h2>
                                <p>
                                    Kiểm tra lại chuyên khoa, bác sĩ và slot trước
                                    khi gửi yêu cầu.
                                </p>
                            </div>
                        </div>

                        <Space
                            direction="vertical"
                            size={16}
                            style={{ width: '100%', marginTop: 20 }}
                        >
                            <article className={styles.listCard}>
                                <div className={styles.listTitle}>
                                    <Space>
                                        <MedicineBoxOutlined />
                                        <strong>Chuyên khoa</strong>
                                    </Space>

                                    <Tag color={selectedSpecialty ? 'blue' : 'default'}>
                                        {selectedSpecialty ? 'Đã chọn' : 'Chưa chọn'}
                                    </Tag>
                                </div>

                                <p className={styles.muted}>
                                    {selectedSpecialty
                                        ? `${selectedSpecialty.name} (${selectedSpecialty.code})`
                                        : 'Hãy chọn chuyên khoa trước để lọc bác sĩ phù hợp.'}
                                </p>
                            </article>

                            <article className={styles.listCard}>
                                <div className={styles.listTitle}>
                                    <Space>
                                        <UserOutlined />
                                        <strong>Bác sĩ</strong>
                                    </Space>

                                    <Tag color={selectedDoctor ? 'green' : 'default'}>
                                        {selectedDoctor ? 'Đã chọn' : 'Chưa chọn'}
                                    </Tag>
                                </div>

                                {selectedDoctor ? (
                                    <>
                                        <p className={styles.muted}>
                                            <b>{getDoctorName(selectedDoctor)}</b>
                                        </p>

                                        <p className={styles.muted}>
                                            Chuyên khoa:{' '}
                                            {selectedDoctor.specialtyName ||
                                                'Chưa cập nhật'}
                                        </p>

                                        <p className={styles.muted}>
                                            Bằng cấp:{' '}
                                            {selectedDoctor.degree ||
                                                'Chưa cập nhật'}
                                        </p>

                                        <p className={styles.muted}>
                                            Kinh nghiệm:{' '}
                                            {selectedDoctor.experienceYears
                                                ? `${selectedDoctor.experienceYears} năm`
                                                : 'Chưa cập nhật'}
                                        </p>
                                    </>
                                ) : (
                                    <p className={styles.muted}>
                                        Chọn bác sĩ để hệ thống tải các slot khám
                                        còn trống.
                                    </p>
                                )}
                            </article>

                            <article className={styles.listCard}>
                                <div className={styles.listTitle}>
                                    <Space>
                                        <ClockCircleOutlined />
                                        <strong>Slot khám</strong>
                                    </Space>

                                    {selectedSlot ? (
                                        <StatusTag value={selectedSlot.status} />
                                    ) : (
                                        <Tag>Chưa chọn</Tag>
                                    )}
                                </div>

                                {selectedSlot ? (
                                    <>
                                        <p className={styles.muted}>
                                            Bắt đầu:{' '}
                                            <b>{formatDateTime(selectedSlot.startTime)}</b>
                                        </p>

                                        <p className={styles.muted}>
                                            Kết thúc:{' '}
                                            <b>{formatDateTime(selectedSlot.endTime)}</b>
                                        </p>
                                    </>
                                ) : (
                                    <p className={styles.muted}>
                                        Sau khi chọn bác sĩ, hãy chọn một slot còn
                                        trống để gửi yêu cầu.
                                    </p>
                                )}
                            </article>

                            <Alert
                                type="info"
                                showIcon
                                message="Yêu cầu chưa phải lịch hẹn chính thức"
                                description="Sau khi bạn gửi yêu cầu, lễ tân sẽ xác nhận lại slot và tạo lịch hẹn chính thức nếu phù hợp."
                            />
                        </Space>
                    </aside>
                </section>

                <section className={styles.portalPanel} style={{ marginTop: 24 }}>
                    <div className={styles.panelHeader}>
                        <div>
                            <span>Slot khả dụng</span>
                            <h2>Các khung giờ bác sĩ còn trống</h2>
                        </div>

                        {selectedDoctorId && (
                            <Button
                                icon={<ReloadOutlined />}
                                loading={slotLoading}
                                onClick={() => loadAvailableSlots(selectedDoctorId)}
                            >
                                Tải lại slot
                            </Button>
                        )}
                    </div>

                    <ClinicalPageState
                        loading={slotLoading}
                        error={null}
                        empty={Boolean(selectedDoctorId) && availableSlots.length === 0}
                        emptyTitle="Bác sĩ chưa có slot khả dụng"
                        emptyDescription="Bạn có thể chọn bác sĩ khác hoặc quay lại sau."
                    >
                        {!selectedDoctorId ? (
                            <Alert
                                type="info"
                                showIcon
                                style={{ marginTop: 20 }}
                                message="Chưa chọn bác sĩ"
                                description="Hãy chọn chuyên khoa và bác sĩ để xem danh sách slot còn trống."
                            />
                        ) : (
                            <div
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns:
                                        'repeat(auto-fit, minmax(240px, 1fr))',
                                    gap: 12,
                                    marginTop: 20,
                                }}
                            >
                                {availableSlots.map((slot) => {
                                    const active = selectedSlotId === slot.id;

                                    return (
                                        <button
                                            key={slot.id}
                                            type="button"
                                            onClick={() => handleSlotChange(slot.id)}
                                            className={styles.listCard}
                                            style={{
                                                textAlign: 'left',
                                                cursor: 'pointer',
                                                border: active
                                                    ? '1px solid #2563eb'
                                                    : undefined,
                                                background: active
                                                    ? '#eff6ff'
                                                    : undefined,
                                            }}
                                        >
                                            <div className={styles.listTitle}>
                                                <strong>
                                                    {formatDateTime(slot.startTime)}
                                                </strong>
                                                <StatusTag value={slot.status} />
                                            </div>

                                            <p className={styles.muted}>
                                                Kết thúc:{' '}
                                                <b>{formatTime(slot.endTime)}</b>
                                            </p>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </ClinicalPageState>
                </section>

                <section className={styles.portalPanel} style={{ marginTop: 24 }}>
                    <div className={styles.panelHeader}>
                        <div>
                            <span>Quy trình</span>
                            <h2>Sau khi gửi yêu cầu sẽ thế nào?</h2>
                        </div>
                    </div>

                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                            gap: 16,
                            marginTop: 20,
                        }}
                    >
                        <article className={styles.listCard}>
                            <div className={styles.listTitle}>
                                <Space>
                                    <CalendarOutlined />
                                    <strong>1. Gửi yêu cầu</strong>
                                </Space>
                            </div>
                            <p className={styles.muted}>
                                Bạn chọn chuyên khoa, bác sĩ, slot và mô tả triệu
                                chứng.
                            </p>
                        </article>

                        <article className={styles.listCard}>
                            <div className={styles.listTitle}>
                                <Space>
                                    <TeamOutlined />
                                    <strong>2. Lễ tân xác nhận</strong>
                                </Space>
                            </div>
                            <p className={styles.muted}>
                                Lễ tân kiểm tra slot, bác sĩ và phản hồi trạng thái.
                            </p>
                        </article>

                        <article className={styles.listCard}>
                            <div className={styles.listTitle}>
                                <Space>
                                    <SafetyCertificateOutlined />
                                    <strong>3. Tạo lịch hẹn</strong>
                                </Space>
                            </div>
                            <p className={styles.muted}>
                                Nếu được duyệt, hệ thống sẽ tạo lịch hẹn chính thức.
                            </p>
                        </article>
                    </div>
                </section>
            </ClinicalPageState>
        </PatientPortalFrame>
    );
}