'use client';

import {
    Button,
    Card,
    Input,
    List,
    Select,
    Space,
} from 'antd';
import { useEffect, useState } from 'react';
import DashboardFrame from '../../_components/DashboardFrame';
import ClinicalEmptyState from '../../_components/ClinicalEmptyState';
import ClinicalPageState from '../../_components/ClinicalPageState';
import RoleGuardState from '../../_components/RoleGuardState';
import StatusTag from '../../_components/StatusTag';
import { useAuthSession } from '@/lib/auth/use-auth-session';
import {
    getAuditLogs,
    type AuditLogFilter,
} from '@/services/admin-audit.service';
import type { AuditLog } from '@/types/clinical';
import styles from '../../dashboard.module.scss';

export default function AdminAuditLogsPage() {
    const { session, loading: authLoading } = useAuthSession();

    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [filter, setFilter] = useState<AuditLogFilter>({
        size: 30,
    });

    const loadLogs = async (nextFilter = filter) => {
        try {
            setLoading(true);
            setError(null);

            const page = await getAuditLogs(nextFilter);
            setLogs(page.content || []);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Không thể tải audit logs.',
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!session) return;

        if (session.role !== 'ADMIN') {
            setLoading(false);
            return;
        }

        loadLogs();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session]);

    const handleResetFilter = () => {
        const resetFilter: AuditLogFilter = {
            size: 30,
        };

        setFilter(resetFilter);
        loadLogs(resetFilter);
    };

    if (authLoading || !session) {
        return <ClinicalPageState loading>Loading</ClinicalPageState>;
    }

    return (
        <DashboardFrame
            session={session}
            title="Audit Logs"
            subtitle="Theo dõi nhật ký hành động quan trọng trong hệ thống"
        >
            <RoleGuardState session={session} allow={['ADMIN']}>
                <ClinicalPageState loading={loading} error={error}>
                    <Card className={styles.detailCard}>
                        <div className={styles.panelHeader}>
                            <div>
                                <span>System audit</span>
                                <h2>Nhật ký hệ thống</h2>
                            </div>
                        </div>

                        <Space wrap style={{ marginBottom: 20 }}>
                            <Input
                                placeholder="Action, ví dụ CREATE_APPOINTMENT"
                                value={filter.action}
                                onChange={(event) =>
                                    setFilter((prev) => ({
                                        ...prev,
                                        action: event.target.value,
                                    }))
                                }
                                style={{ width: 280 }}
                            />

                            <Input
                                placeholder="Actor email"
                                value={filter.actorEmail}
                                onChange={(event) =>
                                    setFilter((prev) => ({
                                        ...prev,
                                        actorEmail: event.target.value,
                                    }))
                                }
                                style={{ width: 240 }}
                            />

                            <Select
                                allowClear
                                placeholder="Entity type"
                                value={filter.entityType}
                                onChange={(value) =>
                                    setFilter((prev) => ({
                                        ...prev,
                                        entityType: value,
                                    }))
                                }
                                options={[
                                    {
                                        value: 'APPOINTMENT',
                                        label: 'APPOINTMENT',
                                    },
                                    {
                                        value: 'APPOINTMENT_REQUEST',
                                        label: 'APPOINTMENT_REQUEST',
                                    },
                                    {
                                        value: 'PRESCRIPTION',
                                        label: 'PRESCRIPTION',
                                    },
                                    {
                                        value: 'MEDICAL_RECORD',
                                        label: 'MEDICAL_RECORD',
                                    },
                                    {
                                        value: 'NOTIFICATION',
                                        label: 'NOTIFICATION',
                                    },
                                    {
                                        value: 'MEDICATION',
                                        label: 'MEDICATION',
                                    },
                                    {
                                        value: 'SYSTEM',
                                        label: 'SYSTEM',
                                    },
                                ]}
                                style={{ width: 230 }}
                            />

                            <Select
                                allowClear
                                placeholder="Result"
                                value={filter.result}
                                onChange={(value) =>
                                    setFilter((prev) => ({
                                        ...prev,
                                        result: value,
                                    }))
                                }
                                options={[
                                    { value: 'SUCCESS', label: 'SUCCESS' },
                                    { value: 'FAILED', label: 'FAILED' },
                                ]}
                                style={{ width: 160 }}
                            />

                            <Button type="primary" onClick={() => loadLogs()}>
                                Lọc
                            </Button>

                            <Button onClick={handleResetFilter}>Xóa lọc</Button>
                        </Space>

                        {logs.length === 0 ? (
                            <ClinicalEmptyState
                                title="Chưa có audit log"
                                description="Các hành động quan trọng sẽ xuất hiện tại đây."
                            />
                        ) : (
                            <List
                                dataSource={logs}
                                renderItem={(item) => (
                                    <List.Item className={styles.cleanListItem}>
                                        <List.Item.Meta
                                            title={
                                                <div className={styles.listTitle}>
                                                    <strong>{item.action}</strong>

                                                    <Space>
                                                        <StatusTag
                                                            value={
                                                                item.entityType ||
                                                                'SYSTEM'
                                                            }
                                                        />
                                                        <StatusTag
                                                            value={item.result}
                                                        />
                                                    </Space>
                                                </div>
                                            }
                                            description={
                                                <div>
                                                    <p>
                                                        Actor:{' '}
                                                        <b>
                                                            {item.actorEmail ||
                                                                'SYSTEM'}
                                                        </b>
                                                    </p>

                                                    <p>
                                                        Entity ID:{' '}
                                                        <code>
                                                            {item.entityId || 'N/A'}
                                                        </code>
                                                    </p>

                                                    <p>
                                                        Time:{' '}
                                                        {item.occurredAt
                                                            ? new Date(
                                                                item.occurredAt,
                                                            ).toLocaleString(
                                                                'vi-VN',
                                                            )
                                                            : 'N/A'}
                                                    </p>

                                                    {item.details && (
                                                        <pre
                                                            style={{
                                                                whiteSpace:
                                                                    'pre-wrap',
                                                                background:
                                                                    'rgba(15, 23, 42, 0.04)',
                                                                borderRadius: 12,
                                                                padding: 12,
                                                                marginTop: 12,
                                                            }}
                                                        >
                                                            {item.details}
                                                        </pre>
                                                    )}
                                                </div>
                                            }
                                        />
                                    </List.Item>
                                )}
                            />
                        )}
                    </Card>
                </ClinicalPageState>
            </RoleGuardState>
        </DashboardFrame>
    );
}