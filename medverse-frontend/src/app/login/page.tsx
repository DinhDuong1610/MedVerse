'use client';

import { Alert, Button, Form, Input, message } from 'antd';
import {
    ArrowRightOutlined,
    LockOutlined,
    MailOutlined,
    SafetyCertificateOutlined,
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import MedVerseMark from '@/components/brand/MedVerseMark';
import { login } from '@/services/auth.service';
import type { DemoRole } from '@/types/auth';
import styles from './login.module.scss';

const demoAccounts: Array<{
    role: DemoRole;
    title: string;
    email: string;
    password: string;
    accent: string;
}> = [
        {
            role: 'DOCTOR',
            title: 'Bác sĩ',
            email: 'doctor.demo@medverse.vn',
            password: 'Doctor@123456',
            accent: '#19b6a4',
        },
        {
            role: 'RECEPTIONIST',
            title: 'Lễ tân',
            email: 'receptionist.demo@medverse.vn',
            password: 'Receptionist@123456',
            accent: '#3b82f6',
        },
        {
            role: 'PATIENT',
            title: 'Bệnh nhân',
            email: 'patient.demo@medverse.vn',
            password: 'Patient@123456',
            accent: '#f59e0b',
        },
        {
            role: 'ADMIN',
            title: 'Quản trị',
            email: 'admin@medverse.vn',
            password: 'Admin@123456',
            accent: '#7c3aed',
        },
    ];

type FormValues = {
    email: string;
    password: string;
};

export default function LoginPage() {
    const router = useRouter();
    const [form] = Form.useForm<FormValues>();
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (values: FormValues) => {
        try {
            setLoading(true);
            const result = await login(values);

            message.success(`Đăng nhập thành công với vai trò ${result.role}`);
            router.replace('/dashboard');
        } catch (error) {
            message.error(
                error instanceof Error
                    ? error.message
                    : 'Không thể đăng nhập. Vui lòng thử lại.',
            );
        } finally {
            setLoading(false);
        }
    };

    const fillAccount = (email: string, password: string) => {
        form.setFieldsValue({ email, password });
    };

    return (
        <main className={styles.loginShell}>
            <section className={styles.leftPanel}>
                <div className={styles.brandBlock}>
                    <MedVerseMark />
                </div>

                <div className={styles.heroContent}>
                    <div className={styles.badge}>
                        <SafetyCertificateOutlined />
                        AI-ready clinic operating system
                    </div>

                    <h1>
                        Một không gian điều phối phòng khám mang phong cách riêng của
                        MedVerse.
                    </h1>

                    <p>
                        Quản lý lịch hẹn, bệnh án điện tử, đơn thuốc và AI hỗ trợ lâm sàng
                        trong một trải nghiệm thống nhất.
                    </p>
                </div>

                <div className={styles.signalBoard}>
                    <div>
                        <span>Live modules</span>
                        <strong>Auth · EHR · Prescription · AI</strong>
                    </div>
                    <div>
                        <span>Demo data</span>
                        <strong>Ready for role-based UI</strong>
                    </div>
                </div>

                <div className={styles.orbitOne} />
                <div className={styles.orbitTwo} />
            </section>

            <section className={styles.formPanel}>
                <div className={styles.formCard}>
                    <div className={styles.cardHeader}>
                        <span className={styles.kicker}>Secure access</span>
                        <h2>Đăng nhập MedVerse</h2>
                        <p>Chọn nhanh tài khoản demo hoặc nhập thông tin thủ công.</p>
                    </div>

                    <div className={styles.accountGrid}>
                        {demoAccounts.map((account) => (
                            <button
                                key={account.email}
                                type="button"
                                className={styles.accountCard}
                                style={{ '--accent': account.accent } as React.CSSProperties}
                                onClick={() => fillAccount(account.email, account.password)}
                            >
                                <span>{account.title}</span>
                                <strong>{account.email}</strong>
                            </button>
                        ))}
                    </div>

                    <Alert
                        className={styles.demoHint}
                        type="info"
                        showIcon
                        message="Dữ liệu demo đã được seed từ Task 8. Dùng các tài khoản trên để kiểm thử UI theo từng vai trò."
                    />

                    <Form
                        form={form}
                        layout="vertical"
                        onFinish={handleSubmit}
                        className={styles.form}
                    >
                        <Form.Item
                            label="Email"
                            name="email"
                            rules={[
                                { required: true, message: 'Vui lòng nhập email' },
                                { type: 'email', message: 'Email không hợp lệ' },
                            ]}
                        >
                            <Input
                                prefix={<MailOutlined />}
                                placeholder="doctor.demo@medverse.vn"
                            />
                        </Form.Item>

                        <Form.Item
                            label="Mật khẩu"
                            name="password"
                            rules={[{ required: true, message: 'Vui lòng nhập mật khẩu' }]}
                        >
                            <Input.Password
                                prefix={<LockOutlined />}
                                placeholder="••••••••"
                            />
                        </Form.Item>

                        <Button
                            type="primary"
                            htmlType="submit"
                            loading={loading}
                            block
                            className={styles.loginButton}
                        >
                            Vào không gian làm việc <ArrowRightOutlined />
                        </Button>
                    </Form>
                </div>
            </section>
        </main>
    );
}