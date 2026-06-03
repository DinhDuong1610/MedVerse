'use client';

import {
    Alert,
    Button,
    Card,
    DatePicker,
    Form,
    Input,
    Radio,
    Select,
    Skeleton,
    Steps,
    message,
} from 'antd';
import dayjs from 'dayjs';
import { useRouter } from 'next/navigation';
import DashboardFrame from '../../_components/DashboardFrame';
import { useAuthSession } from '@/lib/auth/use-auth-session';
import { createMyAppointmentRequest } from '@/services/appointment-request.service';
import type { AppointmentRequestCreatePayload } from '@/types/clinical';
import styles from '../../dashboard.module.scss';

type BookingFormValues = {
    bookingMode: 'DOCTOR' | 'SPECIALTY';
    doctorId?: string;
    specialtyId?: string;
    desiredDate: dayjs.Dayjs;
    desiredTime?: string;
    type: 'ONLINE' | 'OFFLINE';
    symptoms?: string;
};

export default function PatientBookAppointmentPage() {
    const router = useRouter();
    const { session, loading: authLoading } = useAuthSession();
    const [form] = Form.useForm<BookingFormValues>();

    const handleSubmit = async (values: BookingFormValues) => {
        try {
            const payload: AppointmentRequestCreatePayload = {
                doctorId:
                    values.bookingMode === 'DOCTOR' ? values.doctorId : undefined,
                specialtyId:
                    values.bookingMode === 'SPECIALTY' ? values.specialtyId : undefined,
                desiredDate: values.desiredDate.format('YYYY-MM-DD'),
                desiredTime: values.desiredTime,
                type: values.type,
                symptoms: values.symptoms,
            };

            if (!payload.doctorId && !payload.specialtyId) {
                message.warning('Vui lòng nhập Doctor ID hoặc Specialty ID.');
                return;
            }

            await createMyAppointmentRequest(payload);

            message.success('Đã gửi yêu cầu đặt lịch.');
            router.push('/dashboard/patient/appointment-requests');
        } catch (error) {
            message.error(
                error instanceof Error
                    ? error.message
                    : 'Không thể gửi yêu cầu đặt lịch.',
            );
        }
    };

    if (authLoading || !session) {
        return <Skeleton active paragraph={{ rows: 8 }} />;
    }

    return (
        <DashboardFrame
            session={session}
            title="Đặt lịch khám"
            subtitle="Gửi yêu cầu đặt lịch để lễ tân xác nhận và gán slot phù hợp"
        >
            <div className={styles.detailGrid}>
                <Card className={styles.detailCard}>
                    <Steps
                        current={0}
                        items={[
                            { title: 'Gửi yêu cầu' },
                            { title: 'Lễ tân duyệt' },
                            { title: 'Khám với bác sĩ' },
                        ]}
                        style={{ marginBottom: 28 }}
                    />

                    <Alert
                        type="info"
                        showIcon
                        style={{ marginBottom: 24 }}
                        message="Luồng đặt lịch MedVerse"
                        description="Bệnh nhân gửi yêu cầu. Lễ tân sẽ duyệt, chọn slot còn trống của bác sĩ và tạo appointment chính thức."
                    />

                    <Form
                        form={form}
                        layout="vertical"
                        onFinish={handleSubmit}
                        initialValues={{
                            bookingMode: 'DOCTOR',
                            type: 'OFFLINE',
                            desiredTime: 'Morning',
                        }}
                    >
                        <Form.Item
                            label="Bạn muốn đặt theo"
                            name="bookingMode"
                            rules={[{ required: true }]}
                        >
                            <Radio.Group>
                                <Radio.Button value="DOCTOR">Bác sĩ cụ thể</Radio.Button>
                                <Radio.Button value="SPECIALTY">Chuyên khoa</Radio.Button>
                            </Radio.Group>
                        </Form.Item>

                        <Form.Item shouldUpdate noStyle>
                            {({ getFieldValue }) => {
                                const mode = getFieldValue('bookingMode');

                                if (mode === 'DOCTOR') {
                                    return (
                                        <Form.Item
                                            label="Doctor ID"
                                            name="doctorId"
                                            rules={[
                                                {
                                                    required: true,
                                                    message: 'Nhập Doctor ID',
                                                },
                                            ]}
                                        >
                                            <Input placeholder="Dán doctorId từ dữ liệu demo hoặc API doctor list" />
                                        </Form.Item>
                                    );
                                }

                                return (
                                    <Form.Item
                                        label="Specialty ID"
                                        name="specialtyId"
                                        rules={[
                                            {
                                                required: true,
                                                message: 'Nhập Specialty ID',
                                            },
                                        ]}
                                    >
                                        <Input placeholder="Dán specialtyId từ dữ liệu demo hoặc API specialty list" />
                                    </Form.Item>
                                );
                            }}
                        </Form.Item>

                        <Form.Item
                            label="Ngày mong muốn"
                            name="desiredDate"
                            rules={[{ required: true, message: 'Chọn ngày mong muốn' }]}
                        >
                            <DatePicker
                                style={{ width: '100%' }}
                                disabledDate={(current) =>
                                    current ? current <= dayjs().endOf('day') : false
                                }
                            />
                        </Form.Item>

                        <Form.Item label="Khung giờ mong muốn" name="desiredTime">
                            <Select
                                options={[
                                    { value: 'Morning', label: 'Buổi sáng' },
                                    { value: 'Afternoon', label: 'Buổi chiều' },
                                    { value: 'Evening', label: 'Buổi tối' },
                                    { value: '09:00', label: '09:00' },
                                    { value: '14:00', label: '14:00' },
                                ]}
                            />
                        </Form.Item>

                        <Form.Item
                            label="Loại khám"
                            name="type"
                            rules={[{ required: true, message: 'Chọn loại khám' }]}
                        >
                            <Radio.Group>
                                <Radio.Button value="OFFLINE">Tại phòng khám</Radio.Button>
                                <Radio.Button value="ONLINE">Trực tuyến</Radio.Button>
                            </Radio.Group>
                        </Form.Item>

                        <Form.Item label="Triệu chứng" name="symptoms">
                            <Input.TextArea
                                rows={4}
                                placeholder="Ví dụ: Sốt nhẹ, đau họng, ho khan 3 ngày..."
                            />
                        </Form.Item>

                        <Button type="primary" htmlType="submit">
                            Gửi yêu cầu đặt lịch
                        </Button>
                    </Form>
                </Card>
            </div>
        </DashboardFrame>
    );
}