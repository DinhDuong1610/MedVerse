'use client';

import { AppstoreOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import Link from 'next/link';
import type { DemoRole } from '@/types/auth';
import styles from '../dashboard.module.scss';

export default function StaffDashboardPlaceholder({ role }: { role: DemoRole }) {
    const isReceptionist = role === 'RECEPTIONIST';

    return (
        <section className={styles.clinicalPanel}>
            <div className={styles.placeholderHero}>
                <AppstoreOutlined />
                <h2>
                    {isReceptionist
                        ? 'Không gian lễ tân đã sẵn sàng'
                        : 'Admin workspace đang chờ dựng chi tiết'}
                </h2>

                <p>
                    {isReceptionist
                        ? 'Lễ tân có thể duyệt yêu cầu đặt lịch, gán slot bác sĩ và theo dõi appointment.'
                        : 'Các màn quản trị hệ thống sẽ được nối dữ liệu ở task sau.'}
                </p>

                {isReceptionist && (
                    <Link href="/dashboard/receptionist/requests">
                        <Button type="primary">Đi tới yêu cầu đặt lịch</Button>
                    </Link>
                )}
            </div>
        </section>
    );
}