'use client';

import { AppstoreOutlined } from '@ant-design/icons';
import { Button, Space } from 'antd';
import Link from 'next/link';
import type { DemoRole } from '@/types/auth';
import styles from '../dashboard.module.scss';

export default function StaffDashboardPlaceholder({ role }: { role: DemoRole }) {
    const isReceptionist = role === 'RECEPTIONIST';
    const isAdmin = role === 'ADMIN';

    return (
        <section className={styles.clinicalPanel}>
            <div className={styles.placeholderHero}>
                <AppstoreOutlined />

                <h2>
                    {isReceptionist
                        ? 'Không gian lễ tân đã sẵn sàng'
                        : 'Admin workspace đã sẵn sàng'}
                </h2>

                <p>
                    {isReceptionist
                        ? 'Lễ tân có thể duyệt yêu cầu đặt lịch, gán slot bác sĩ và theo dõi appointment.'
                        : 'Admin có thể quản lý danh mục thuốc và nhập kho để phục vụ kê đơn.'}
                </p>

                {isReceptionist && (
                    <Link href="/dashboard/receptionist/requests">
                        <Button type="primary">Đi tới yêu cầu đặt lịch</Button>
                    </Link>
                )}

                {isAdmin && (
                    <Space>
                        <Link href="/dashboard/admin/inventory">
                            <Button type="primary">Quản lý kho thuốc</Button>
                        </Link>

                        <Link href="/dashboard/admin/inventory/import">
                            <Button>Nhập kho</Button>
                        </Link>
                    </Space>
                )}
            </div>
        </section>
    );
}