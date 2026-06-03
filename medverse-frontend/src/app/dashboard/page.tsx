'use client';

import {
    ApiOutlined,
    CalendarOutlined,
    FileProtectOutlined,
    LogoutOutlined,
    MedicineBoxOutlined,
    RobotOutlined,
    TeamOutlined,
} from '@ant-design/icons';
import { Button, Tag } from 'antd';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import MedVerseMark from '@/components/brand/MedVerseMark';
import { clearAuthSession, getAuthSession } from '@/lib/auth/auth-storage';
import { getRoleLabel } from '@/lib/auth/roles';
import type { AuthSession } from '@/types/auth';
import styles from './dashboard.module.scss';

const roleModules = {
    ADMIN: [
        ['Nhân sự', 'Quản lý bác sĩ, lễ tân và phân quyền', TeamOutlined],
        ['Kho thuốc', 'Theo dõi thuốc, lô nhập và tồn kho', MedicineBoxOutlined],
        ['AI Health', 'Kiểm tra trạng thái AI service', RobotOutlined],
    ],
    DOCTOR: [
        ['Lịch khám', 'Theo dõi lịch hẹn và ca khám hôm nay', CalendarOutlined],
        ['Bệnh án điện tử', 'Ghi nhận triệu chứng, chẩn đoán và ICD', FileProtectOutlined],
        ['Đơn thuốc + AI', 'Kê đơn và chạy kiểm tra an toàn thuốc', RobotOutlined],
    ],
    RECEPTIONIST: [
        ['Yêu cầu đặt lịch', 'Duyệt request và gán lịch khám', CalendarOutlined],
        ['Bệnh nhân', 'Tra cứu hồ sơ bệnh nhân', TeamOutlined],
        ['Đơn thuốc', 'Xem và hỗ trợ in đơn thuốc', MedicineBoxOutlined],
    ],
    PATIENT: [
        ['Lịch hẹn của tôi', 'Theo dõi lịch khám và trạng thái yêu cầu', CalendarOutlined],
        ['Hồ sơ y tế', 'Thông tin nền, dị ứng và bệnh sử', FileProtectOutlined],
        ['Đơn thuốc', 'Xem đơn thuốc sau buổi khám', MedicineBoxOutlined],
    ],
} as const;

export default function DashboardPage() {
    const router = useRouter();
    const [session, setSession] = useState<AuthSession | null>(null);

    useEffect(() => {
        const current = getAuthSession();

        if (!current) {
            router.replace('/login');
            return;
        }

        setSession(current);
    }, [router]);

    const modules = useMemo(() => {
        if (!session) return [];

        return roleModules[session.role];
    }, [session]);

    const logout = () => {
        clearAuthSession();
        router.replace('/login');
    };

    if (!session) {
        return null;
    }

    return (
        <main className={styles.dashboardShell}>
            <aside className={styles.sidebar}>
                <MedVerseMark compact />

                <nav className={styles.nav}>
                    <button className={styles.navItemActive}>
                        <ApiOutlined />
                        Tổng quan
                    </button>
                    <button className={styles.navItem}>
                        <CalendarOutlined />
                        Lịch khám
                    </button>
                    <button className={styles.navItem}>
                        <FileProtectOutlined />
                        Bệnh án
                    </button>
                    <button className={styles.navItem}>
                        <MedicineBoxOutlined />
                        Đơn thuốc
                    </button>
                    <button className={styles.navItem}>
                        <RobotOutlined />
                        AI
                    </button>
                </nav>

                <div className={styles.sidebarFooter}>
                    <span>Workspace</span>
                    <strong>{getRoleLabel(session.role)}</strong>
                </div>
            </aside>

            <section className={styles.mainArea}>
                <header className={styles.topbar}>
                    <div>
                        <Tag color="cyan">Demo workspace</Tag>
                        <h1>Xin chào, {getRoleLabel(session.role)}</h1>
                        <p>{session.email}</p>
                    </div>

                    <Button icon={<LogoutOutlined />} onClick={logout}>
                        Đăng xuất
                    </Button>
                </header>

                <section className={styles.heroCard}>
                    <div>
                        <span>MedVerse Control Plane</span>
                        <h2>Nền giao diện đã sẵn sàng để dựng dashboard theo vai trò.</h2>
                        <p>
                            Task 9 tập trung vào auth, API client và layout. Các màn nghiệp vụ
                            sẽ nối vào shell này ở những task tiếp theo.
                        </p>
                    </div>

                    <div className={styles.pulseCard}>
                        <strong>AI</strong>
                        <span>Connected / Fallback ready</span>
                    </div>
                </section>

                <section className={styles.moduleGrid}>
                    {modules.map(([title, description, Icon]) => (
                        <article key={title} className={styles.moduleCard}>
                            <div className={styles.iconBox}>
                                <Icon />
                            </div>
                            <h3>{title}</h3>
                            <p>{description}</p>
                        </article>
                    ))}
                </section>
            </section>
        </main>
    );
}