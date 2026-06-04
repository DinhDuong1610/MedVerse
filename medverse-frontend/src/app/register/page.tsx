'use client';

import {
    Button,
    Form,
    Input,
    Select,
    Typography,
    message,
} from 'antd';
import {
    ArrowLeftOutlined,
    ArrowRightOutlined,
    HomeOutlined,
    LockOutlined,
    MailOutlined,
    PhoneOutlined,
    SafetyCertificateOutlined,
    UserOutlined,
} from '@ant-design/icons';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import MedVerseMark from '@/components/brand/MedVerseMark';
import { register } from '@/services/auth.service';
import styles from './register.module.scss';

type FormValues = {
    fullName: string;
    email: string;
    password: string;
    confirmPassword: string;
    dateOfBirth?: string;
    gender?: string;
    phoneNumber?: string;
    address?: string;
};

export default function RegisterPage() {
    const router = useRouter();
    const [form] = Form.useForm<FormValues>();
    const [loading, setLoading] = useState(false);
    const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);

    const handleSubmit = async (values: FormValues) => {
        try {
            setLoading(true);

            await register({
                fullName: values.fullName.trim(),
                email: values.email.trim(),
                password: values.password,
                dateOfBirth: values.dateOfBirth || undefined,
                gender: values.gender || undefined,
                phoneNumber: values.phoneNumber?.trim() || undefined,
                address: values.address?.trim() || undefined,
            });

            setRegisteredEmail(values.email.trim());
            message.success('Đăng ký thành công. Vui lòng kiểm tra email để xác thực tài khoản.');
            form.resetFields();
        } catch (error) {
            message.error(
                error instanceof Error
                    ? error.message
                    : 'Không thể đăng ký tài khoản. Vui lòng thử lại.',
            );
        } finally {
            setLoading(false);
        }
    };

    if (registeredEmail) {
        return (
            <main className={styles.registerShell}>
                <section className={styles.successPanel}>
                    <div className={styles.successCard}>
                        <MedVerseMark compact />

                        <div className={styles.successIcon}>
                            <SafetyCertificateOutlined />
                        </div>

                        <h1>Kiểm tra email của bạn</h1>

                        <p>
                            Tài khoản với email <strong>{registeredEmail}</strong> đã
                            được tạo. Vui lòng mở email xác thực để kích hoạt tài
                            khoản trước khi đăng nhập.
                        </p>

                        <div className={styles.successActions}>
                            <Button
                                type="primary"
                                size="large"
                                onClick={() => router.push('/login')}
                            >
                                Quay lại đăng nhập
                                <ArrowRightOutlined />
                            </Button>

                            <Button
                                size="large"
                                onClick={() => setRegisteredEmail(null)}
                            >
                                Đăng ký tài khoản khác
                            </Button>
                        </div>
                    </div>
                </section>
            </main>
        );
    }

    return (
        <main className={styles.registerShell}>
            <section className={styles.brandPanel}>
                <div className={styles.brandTop}>
                    <MedVerseMark />

                    <Link href="/login" className={styles.backLink}>
                        <ArrowLeftOutlined />
                        Đăng nhập
                    </Link>
                </div>

                <div className={styles.heroContent}>
                    <p className={styles.eyebrow}>Tạo tài khoản bệnh nhân</p>

                    <h1>
                        Bắt đầu quản lý hồ sơ sức khỏe của bạn
                        trên MedVerse.
                    </h1>

                    <p>
                        Sau khi đăng ký, tài khoản cần được xác thực qua email
                        trước khi sử dụng đầy đủ các chức năng đặt lịch và theo
                        dõi kết quả khám.
                    </p>
                </div>

                <div className={styles.infoCard}>
                    <SafetyCertificateOutlined />
                    <div>
                        <strong>Xác thực trước khi sử dụng</strong>
                        <span>
                            Điều này giúp bảo vệ dữ liệu y tế cá nhân và đảm bảo
                            chỉ đúng chủ tài khoản có thể truy cập hồ sơ.
                        </span>
                    </div>
                </div>

                <div className={styles.decorCircleOne} />
                <div className={styles.decorCircleTwo} />
            </section>

            <section className={styles.formPanel}>
                <div className={styles.formCard}>
                    <div className={styles.mobileBrand}>
                        <MedVerseMark compact />
                    </div>

                    <div className={styles.cardHeader}>
                        <p>Đăng ký tài khoản</p>
                        <h2>Tạo hồ sơ mới</h2>
                        <span>
                            Điền thông tin cơ bản để khởi tạo tài khoản bệnh
                            nhân trên hệ thống.
                        </span>
                    </div>

                    <Form
                        form={form}
                        layout="vertical"
                        onFinish={handleSubmit}
                        className={styles.form}
                        requiredMark={false}
                    >
                        <Form.Item
                            label="Họ và tên"
                            name="fullName"
                            rules={[
                                {
                                    required: true,
                                    message: 'Vui lòng nhập họ và tên.',
                                },
                                {
                                    max: 100,
                                    message: 'Họ tên không được vượt quá 100 ký tự.',
                                },
                            ]}
                        >
                            <Input
                                size="large"
                                prefix={<UserOutlined />}
                                placeholder="Nguyễn Văn A"
                                autoComplete="name"
                            />
                        </Form.Item>

                        <Form.Item
                            label="Email"
                            name="email"
                            rules={[
                                {
                                    required: true,
                                    message: 'Vui lòng nhập email.',
                                },
                                {
                                    type: 'email',
                                    message: 'Email không hợp lệ.',
                                },
                            ]}
                        >
                            <Input
                                size="large"
                                prefix={<MailOutlined />}
                                placeholder="name@example.com"
                                autoComplete="email"
                            />
                        </Form.Item>

                        <div className={styles.twoColumns}>
                            <Form.Item
                                label="Mật khẩu"
                                name="password"
                                rules={[
                                    {
                                        required: true,
                                        message: 'Vui lòng nhập mật khẩu.',
                                    },
                                    {
                                        min: 8,
                                        message: 'Mật khẩu tối thiểu 8 ký tự.',
                                    },
                                ]}
                            >
                                <Input.Password
                                    size="large"
                                    prefix={<LockOutlined />}
                                    placeholder="Tối thiểu 8 ký tự"
                                    autoComplete="new-password"
                                />
                            </Form.Item>

                            <Form.Item
                                label="Nhập lại mật khẩu"
                                name="confirmPassword"
                                dependencies={['password']}
                                rules={[
                                    {
                                        required: true,
                                        message: 'Vui lòng nhập lại mật khẩu.',
                                    },
                                    ({ getFieldValue }) => ({
                                        validator(_, value) {
                                            if (
                                                !value ||
                                                getFieldValue('password') === value
                                            ) {
                                                return Promise.resolve();
                                            }

                                            return Promise.reject(
                                                new Error('Mật khẩu nhập lại không khớp.'),
                                            );
                                        },
                                    }),
                                ]}
                            >
                                <Input.Password
                                    size="large"
                                    prefix={<LockOutlined />}
                                    placeholder="Nhập lại mật khẩu"
                                    autoComplete="new-password"
                                />
                            </Form.Item>
                        </div>

                        <div className={styles.twoColumns}>
                            <Form.Item label="Ngày sinh" name="dateOfBirth">
                                <Input size="large" type="date" />
                            </Form.Item>

                            <Form.Item label="Giới tính" name="gender">
                                <Select
                                    size="large"
                                    placeholder="Chọn giới tính"
                                    options={[
                                        { label: 'Nam', value: 'Male' },
                                        { label: 'Nữ', value: 'Female' },
                                        { label: 'Khác', value: 'Other' },
                                    ]}
                                />
                            </Form.Item>
                        </div>

                        <Form.Item
                            label="Số điện thoại"
                            name="phoneNumber"
                            rules={[
                                {
                                    pattern: /^(0|\+84)[\d]{9}$/,
                                    message:
                                        'Số điện thoại chưa đúng định dạng Việt Nam.',
                                },
                            ]}
                        >
                            <Input
                                size="large"
                                prefix={<PhoneOutlined />}
                                placeholder="0987654321"
                                autoComplete="tel"
                            />
                        </Form.Item>

                        <Form.Item label="Địa chỉ" name="address">
                            <Input
                                size="large"
                                prefix={<HomeOutlined />}
                                placeholder="Địa chỉ liên hệ"
                                autoComplete="street-address"
                            />
                        </Form.Item>

                        <Button
                            type="primary"
                            htmlType="submit"
                            loading={loading}
                            block
                            size="large"
                            className={styles.submitButton}
                        >
                            Tạo tài khoản
                            <ArrowRightOutlined />
                        </Button>
                    </Form>

                    <Typography.Paragraph className={styles.loginHint}>
                        Đã có tài khoản? <Link href="/login">Đăng nhập</Link>
                    </Typography.Paragraph>
                </div>
            </section>
        </main>
    );
}