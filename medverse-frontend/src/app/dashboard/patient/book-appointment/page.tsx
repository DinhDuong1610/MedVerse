'use client';

import {
    Button,
    Card,
    DatePicker,
    Form,
    Input,
    Select,
    TimePicker,
    message,
} from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { useEffect, useState } from 'react';
import ClinicalPageState from '../../_components/ClinicalPageState';
import PatientPortalFrame from '../../_components/PatientPortalFrame';
import { hasRole } from '@/lib/auth/roles';
import { useAuthSession } from '@/lib/auth/use-auth-session';
import { createMyAppointmentRequest } from '@/services/appointment-request.service';
import {
    getDirectoryDoctors,
    getDirectorySpecialties,
} from '@/services/directory.service';
import type {
    AppointmentRequestCreatePayload,
    DirectoryDoctor,
    DirectorySpecialty,
} from '@/types/clinical';
import styles from '../../_components/patient-portal.module.scss';

type BookAppointmentFormValues = {
    specialtyId: string;
    doctorId: string;
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
    const [loading, setLoading] = useState(true);
    const [directoryLoading, setDirectoryLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

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

    useEffect(() => {
        if (!session) return;

        if (!hasRole(session, 'PATIENT')) {
            setError('Trang này chỉ dành cho bệnh nhân.');
            setLoading(false);
            return;
        }

        loadDirectory();
    }, [session]);

    const handleSpecialtyChange = async (specialtyId: string) => {
        try {
            setDirectoryLoading(true);

            form.setFieldValue('specialtyId', specialtyId);
            form.setFieldValue('doctorId', undefined);

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

    const handleSubmit = async (values: BookAppointmentFormValues) => {
        try {
            setSubmitting(true);

            const payload: AppointmentRequestCreatePayload = {
                doctorId: values.doctorId,
                specialtyId: values.specialtyId,
                desiredDate: values.desiredDate.format('YYYY-MM-DD'),
                desiredTime: values.desiredTime.format('HH:mm:ss'),
                type: values.type,
                symptoms: values.symptoms,
            };

            await createMyAppointmentRequest(payload);

            message.success('Đã gửi yêu cầu đặt lịch.');
            form.resetFields();
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
                        <div className={styles.heroKicker}>Booking</div>
                        <h1 className={styles.heroTitle}>
                            Đặt lịch khám với bác sĩ phù hợp
                        </h1>
                        <p className={styles.heroDescription}>
                            Chọn chuyên khoa, bác sĩ và thời gian mong muốn. Lễ
                            tân sẽ xác nhận yêu cầu và tạo lịch hẹn chính thức.
                        </p>
                    </div>

                    <article className={styles.heroCard}>
                        <span>Quy trình</span>
                        <strong>3 bước</strong>
                        <p>
                            Chọn chuyên khoa → chọn bác sĩ → gửi yêu cầu đặt
                            lịch.
                        </p>
                    </article>
                </section>

                <Card className={styles.portalPanel} style={{ marginTop: 24 }}>
                    <div className={styles.panelHeader}>
                        <div>
                            <span>Appointment request</span>
                            <h2>Thông tin yêu cầu khám</h2>
                            <p>
                                Mô tả triệu chứng càng rõ, lễ tân và bác sĩ càng
                                dễ hỗ trợ bạn.
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
                                options={doctors.map((doctor) => ({
                                    value: doctor.userId,
                                    label: `${doctor.fullName || doctor.email} · ${doctor.specialtyName ||
                                        'Chưa rõ chuyên khoa'
                                        }`,
                                }))}
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
            </ClinicalPageState>
        </PatientPortalFrame>
    );
}