'use client';

import {
    Button,
    Checkbox,
    Form,
    Input,
    Typography,
    message,
} from 'antd';
import {
    ArrowRightOutlined,
    LockOutlined,
    MailOutlined,
    MedicineBoxOutlined,
    SafetyCertificateOutlined,
    TeamOutlined,
} from '@ant-design/icons';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import MedVerseMark from '@/components/brand/MedVerseMark';
import { login } from '@/services/auth.service';
import styles from './login.module.scss';

type FormValues = {
    email: string;
    password: string;
    remember?: boolean;
};

export default function LoginPage() {
    const router = useRouter();
    const [form] = Form.useForm<FormValues>();
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (values: FormValues) => {
        try {
            setLoading(true);

            await login({
                email: values.email.trim(),
                password: values.password,
            });

            message.success('Đăng nhập thành công.');
            router.replace('/dashboard');
        } catch (error) {
            message.error(
                error instanceof Error
                    ? error.message
                    : 'Thông tin đăng nhập chưa chính xác. Vui lòng kiểm tra lại.',
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className={styles.loginShell}>
            <section className={styles.brandPanel}>
                <div className={styles.brandTop}>
                    <MedVerseMark />

                    <div className={styles.secureBadge}>
                        <SafetyCertificateOutlined />
                        <span>Truy cập bảo mật</span>
                    </div>
                </div>

                <div className={styles.heroContent}>
                    <p className={styles.eyebrow}>Nền tảng quản lý phòng khám</p>

                    <h1>
                        Hệ thống quản lý phòng khám - y tế hiện đại
                    </h1>

                    <p className={styles.heroDescription}>
                        MedVerse hỗ trợ đội ngũ y tế vận hành quy trình khám
                        bệnh rõ ràng, an toàn và nhất quán hơn từ tiếp nhận,
                        thăm khám đến theo dõi sau điều trị.
                    </p>
                </div>

                <div className={styles.featureGrid}>
                    <article>
                        <div className={styles.featureIcon}>
                            <MedicineBoxOutlined />
                        </div>

                        <div>
                            <strong>Quản lý lâm sàng</strong>
                            <span>
                                Bệnh án điện tử, đơn thuốc và kiểm tra an toàn
                                điều trị.
                            </span>
                        </div>
                    </article>

                    <article>
                        <div className={styles.featureIcon}>
                            <TeamOutlined />
                        </div>

                        <div>
                            <strong>Phối hợp đa vai trò</strong>
                            <span>
                                Bệnh nhân, lễ tân, bác sĩ và quản trị viên làm
                                việc trên cùng một nền tảng.
                            </span>
                        </div>
                    </article>
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
                        <p>Đăng nhập hệ thống</p>
                        <h2>Chào mừng trở lại</h2>
                        <span>
                            Vui lòng sử dụng tài khoản đã được cấp để truy cập
                            không gian làm việc MedVerse.
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
                                placeholder="name@medverse.vn"
                                autoComplete="email"
                            />
                        </Form.Item>

                        <Form.Item
                            label="Mật khẩu"
                            name="password"
                            rules={[
                                {
                                    required: true,
                                    message: 'Vui lòng nhập mật khẩu.',
                                },
                            ]}
                        >
                            <Input.Password
                                size="large"
                                prefix={<LockOutlined />}
                                placeholder="Nhập mật khẩu"
                                autoComplete="current-password"
                            />
                        </Form.Item>

                        <div className={styles.formMeta}>
                            <Form.Item name="remember" valuePropName="checked" noStyle>
                                <Checkbox>Ghi nhớ phiên đăng nhập</Checkbox>
                            </Form.Item>

                            <Typography.Text className={styles.supportText}>
                                Cần hỗ trợ? Liên hệ quản trị viên.
                            </Typography.Text>
                        </div>

                        <Button
                            type="primary"
                            htmlType="submit"
                            loading={loading}
                            block
                            size="large"
                            className={styles.loginButton}
                        >
                            Đăng nhập
                            <ArrowRightOutlined />
                        </Button>
                    </Form>

                    <Typography.Paragraph className={styles.registerHint}>
                        Chưa có tài khoản? <Link href="/register">Đăng ký ngay</Link>
                    </Typography.Paragraph>

                    <div className={styles.complianceNote}>
                        <SafetyCertificateOutlined />
                        <span>
                            Dữ liệu y tế được bảo vệ theo cơ chế phân quyền và
                            xác thực người dùng.
                        </span>
                    </div>
                </div>
            </section>
        </main>
    );
}