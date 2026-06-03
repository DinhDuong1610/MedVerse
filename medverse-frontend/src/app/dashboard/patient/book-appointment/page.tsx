'use client';

import {
    Button,
    Card,
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

    const selectedDoctorId = Form.useWatch('doctorId', form);
    const selectedSlotId = Form.useWatch('selectedSlotId', form);

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

            setSpecialties(specialtyData);
            setDoctors(doctorData);
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

            const sortedSlots = [...slots].sort((a, b) =>
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
            setDoctors(doctorData);
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

            const selectedDate = slot
                ? dayjs(slot.startTime)
                : values.desiredDate;

            const selectedTime = slot
                ? dayjs(slot.startTime)
                : values.desiredTime;

            const payload: AppointmentRequestCreatePayload = {
                doctorId: values.doctorId,
                specialtyId: values.specialtyId,
                desiredDate: selectedDate.format('YYYY-MM-DD'),
                desiredTime: selectedTime.format('HH:mm:ss'),
                type: values.type,
                symptoms: values.symptoms,
            };

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
                        <div className={styles.heroKicker}>Booking v2</div>
                        <h1 className={styles.heroTitle}>
                            Chọn lịch khám theo slot có thật
                        </h1>
                        <p className={styles.heroDescription}>
                            Sau khi chọn bác sĩ, hệ thống sẽ hiển thị các slot
                            còn trống. Bạn chọn slot phù hợp và gửi yêu cầu để
                            lễ tân xác nhận.
                        </p>
                    </div>

                    <article className={styles.heroCard}>
                        <span>Slot khả dụng</span>
                        <strong>{availableSlots.length}</strong>
                        <p>
                            Slot được lấy trực tiếp từ lịch làm việc của bác sĩ.
                        </p>
                    </article>
                </section>

                <section className={styles.contentGrid}>
                    <Card className={styles.portalPanel} style={{ marginTop: 24 }}>
                        <div className={styles.panelHeader}>
                            <div>
                                <span>Appointment request</span>
                                <h2>Thông tin yêu cầu khám</h2>
                                <p>
                                    Chọn chuyên khoa và bác sĩ trước, sau đó chọn
                                    một slot còn trống.
                                </p>
                            </div>
                        </div>

                        <Form
                            form={form}
                            layout="vertical"
                            onFinish={handleSubmit}
                            initialValues={{
                                type: 'OFFLINE',
                                desiredDate: dayjs().add(1, 'day'),
                            }}
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
                                    loading={directoryLoading}
                                    placeholder="Chọn chuyên khoa"
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
                                    placeholder="Chọn bác sĩ"
                                    optionFilterProp="label"
                                    onChange={handleDoctorChange}
                                    options={doctors.map((doctor) => ({
                                        value: doctor.userId,
                                        label: `${doctor.fullName || doctor.email} · ${doctor.specialtyName ||
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
                                        label: `${new Date(
                                            slot.startTime,
                                        ).toLocaleString('vi-VN')} → ${new Date(
                                            slot.endTime,
                                        ).toLocaleTimeString('vi-VN')}`,
                                    }))}
                                    notFoundContent={
                                        selectedDoctorId
                                            ? 'Bác sĩ này chưa có slot khả dụng'
                                            : 'Chọn bác sĩ trước'
                                    }
                                />
                            </Form.Item>

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

                            <Form.Item label="Triệu chứng/Ghi chú" name="symptoms">
                                <Input.TextArea
                                    rows={5}
                                    placeholder="Mô tả ngắn gọn triệu chứng, nhu cầu khám hoặc ghi chú cho lễ tân/bác sĩ."
                                />
                            </Form.Item>

                            <Button
                                type="primary"
                                htmlType="submit"
                                loading={submitting}
                                size="large"
                                block
                            >
                                Gửi yêu cầu đặt lịch
                            </Button>
                        </Form>
                    </Card>

                    <aside
                        className={styles.portalPanel}
                        style={{ marginTop: 24 }}
                    >
                        <div className={styles.panelHeader}>
                            <div>
                                <span>Selected slot</span>
                                <h2>Slot đã chọn</h2>
                                <p>
                                    Đây là thời gian mong muốn. Lễ tân sẽ xác
                                    nhận và gán slot chính thức khi duyệt yêu cầu.
                                </p>
                            </div>
                        </div>

                        {selectedDoctor && (
                            <article className={styles.listCard}>
                                <div className={styles.listTitle}>
                                    <strong>
                                        {selectedDoctor.fullName ||
                                            selectedDoctor.email}
                                    </strong>
                                    <Tag color="cyan">
                                        {selectedDoctor.specialtyName ||
                                            'Bác sĩ'}
                                    </Tag>
                                </div>

                                <p className={styles.muted}>
                                    Bằng cấp:{' '}
                                    {selectedDoctor.degree || 'Chưa cập nhật'}
                                </p>

                                <p className={styles.muted}>
                                    Kinh nghiệm:{' '}
                                    {selectedDoctor.experienceYears
                                        ? `${selectedDoctor.experienceYears} năm`
                                        : 'Chưa cập nhật'}
                                </p>
                            </article>
                        )}

                        {selectedSlot ? (
                            <article className={styles.listCard}>
                                <div className={styles.listTitle}>
                                    <strong>
                                        {new Date(
                                            selectedSlot.startTime,
                                        ).toLocaleString('vi-VN')}
                                    </strong>
                                    <StatusTag value={selectedSlot.status} />
                                </div>

                                <p className={styles.muted}>
                                    Kết thúc:{' '}
                                    {new Date(
                                        selectedSlot.endTime,
                                    ).toLocaleString('vi-VN')}
                                </p>
                            </article>
                        ) : (
                            <p className={styles.muted}>
                                Bạn chưa chọn slot. Hãy chọn bác sĩ để xem các
                                khung giờ còn trống.
                            </p>
                        )}

                        <Space wrap style={{ marginTop: 12 }}>
                            <Tag color="blue">Patient request</Tag>
                            <Tag color="gold">Receptionist confirms</Tag>
                            <Tag color="green">Appointment created</Tag>
                        </Space>
                    </aside>
                </section>
            </ClinicalPageState>
        </PatientPortalFrame>
    );
}