'use client';

import { AppstoreOutlined } from '@ant-design/icons';
import type { DemoRole } from '@/types/auth';
import styles from '../dashboard.module.scss';

export default function StaffDashboardPlaceholder({ role }: { role: DemoRole }) {
    return (
        <section className={styles.clinicalPanel}>
            <div className={styles.placeholderHero}>
                <AppstoreOutlined />
                <h2>
                    {role === 'ADMIN'
                        ? 'Admin workspace đang chờ dựng chi tiết'
                        : 'Receptionist workspace đang chờ dựng chi tiết'}
                </h2>
                <p>
                    Task 10 ưu tiên Patient và Doctor để hoàn thiện flow demo chính. Các
                    màn quản trị/lễ tân sẽ được nối dữ liệu ở task sau.
                </p>
            </div>
        </section>
    );
}