'use client';

import {
    Button,
    Card,
    Form,
    Input,
    List,
    Modal,
    Skeleton,
    Space,
    Statistic,
    Tag,
    message,
} from 'antd';
import {
    MedicineBoxOutlined,
    PlusOutlined,
    SearchOutlined,
    WarningOutlined,
} from '@ant-design/icons';
import { useEffect, useMemo, useState } from 'react';
import DashboardFrame from '../../_components/DashboardFrame';
import ClinicalEmptyState from '../../_components/ClinicalEmptyState';
import MetricCard from '../../_components/MetricCard';
import { useAuthSession } from '@/lib/auth/use-auth-session';
import {
    createMedication,
    getInventoryMedications,
} from '@/services/inventory.service';
import type { Medication, MedicationCreatePayload } from '@/types/clinical';
import styles from '../../dashboard.module.scss';

export default function AdminInventoryPage() {
    const { session, loading: authLoading } = useAuthSession();

    const [form] = Form.useForm<MedicationCreatePayload>();

    const [keyword, setKeyword] = useState('');
    const [medications, setMedications] = useState<Medication[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [openCreate, setOpenCreate] = useState(false);

    const loadMedications = async (search = keyword) => {
        try {
            setLoading(true);

            const page = await getInventoryMedications(search);
            setMedications(page.content || []);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (session?.role === 'ADMIN') {
            loadMedications('');
        }
    }, [session]);

    const lowStockCount = useMemo(
        () => medications.filter((item) => (item.totalStock || 0) <= 20).length,
        [medications],
    );

    const totalStock = useMemo(
        () =>
            medications.reduce((sum, item) => {
                return sum + (item.totalStock || 0);
            }, 0),
        [medications],
    );

    const handleCreateMedication = async (values: MedicationCreatePayload) => {
        try {
            setCreating(true);

            await createMedication(values);
            message.success('Đã tạo thuốc mới trong catalog.');

            setOpenCreate(false);
            form.resetFields();
            await loadMedications('');
        } catch (error) {
            message.error(
                error instanceof Error ? error.message : 'Không thể tạo thuốc.',
            );
        } finally {
            setCreating(false);
        }
    };

    if (authLoading || !session || loading) {
        return <Skeleton active paragraph={{ rows: 8 }} />;
    }

    return (
        <DashboardFrame
            session={session}
            title="Kho thuốc"
            subtitle="Quản lý danh mục thuốc, hoạt chất, ATC và tồn kho"
        >
            <div className={styles.roleDashboard}>
                <section className={styles.metricGrid}>
                    <MetricCard
                        label="Số loại thuốc"
                        value={medications.length}
                        caption="Medication catalog"
                        icon={<MedicineBoxOutlined />}
                    />

                    <MetricCard
                        label="Tổng tồn kho"
                        value={totalStock}
                        caption="Tính theo tất cả thuốc đang hiển thị"
                        icon={<Statistic />}
                    />

                    <MetricCard
                        label="Tồn thấp"
                        value={lowStockCount}
                        caption="Ngưỡng cảnh báo <= 20"
                        icon={<WarningOutlined />}
                    />
                </section>

                <Card className={styles.detailCard}>
                    <div className={styles.panelHeader}>
                        <div>
                            <span>Inventory control</span>
                            <h2>Danh sách thuốc</h2>
                        </div>

                        <Space>
                            <Input.Search
                                allowClear
                                value={keyword}
                                onChange={(event) => setKeyword(event.target.value)}
                                onSearch={loadMedications}
                                placeholder="Tìm tên thuốc, mã, hoạt chất..."
                                enterButton={<SearchOutlined />}
                                style={{ width: 320 }}
                            />

                            <Button
                                type="primary"
                                icon={<PlusOutlined />}
                                onClick={() => setOpenCreate(true)}
                            >
                                Tạo thuốc
                            </Button>
                        </Space>
                    </div>

                    {medications.length === 0 ? (
                        <ClinicalEmptyState
                            title="Chưa có thuốc"
                            description="Tạo thuốc mới để bắt đầu quản lý inventory."
                        />
                    ) : (
                        <List
                            dataSource={medications}
                            renderItem={(item) => {
                                const stock = item.totalStock || 0;
                                const low = stock <= 20;

                                return (
                                    <List.Item className={styles.cleanListItem}>
                                        <List.Item.Meta
                                            title={
                                                <div className={styles.listTitle}>
                                                    <strong>{item.name}</strong>
                                                    <Space>
                                                        <Tag color="blue">{item.code}</Tag>
                                                        {item.atcCode && <Tag color="cyan">{item.atcCode}</Tag>}
                                                        <Tag color={low ? 'red' : 'green'}>
                                                            Tồn: {stock}
                                                        </Tag>
                                                    </Space>
                                                </div>
                                            }
                                            description={
                                                <div>
                                                    <p>
                                                        Hoạt chất:{' '}
                                                        <b>{item.activeIngredient || 'Chưa cập nhật'}</b>
                                                    </p>
                                                    <p>
                                                        Đơn vị: <b>{item.unit}</b> · Quy cách:{' '}
                                                        <b>{item.packingSpecification || 'Chưa cập nhật'}</b>
                                                    </p>
                                                    {item.contraindication && (
                                                        <p>Chống chỉ định: {item.contraindication}</p>
                                                    )}
                                                </div>
                                            }
                                        />
                                    </List.Item>
                                );
                            }}
                        />
                    )}
                </Card>
            </div>

            <Modal
                title="Tạo thuốc mới"
                open={openCreate}
                onCancel={() => setOpenCreate(false)}
                footer={null}
                destroyOnClose
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleCreateMedication}
                >
                    <Form.Item
                        label="Tên thuốc"
                        name="name"
                        rules={[{ required: true, message: 'Nhập tên thuốc' }]}
                    >
                        <Input placeholder="Paracetamol 500mg" />
                    </Form.Item>

                    <Form.Item
                        label="Mã thuốc"
                        name="code"
                        rules={[{ required: true, message: 'Nhập mã thuốc' }]}
                    >
                        <Input placeholder="PARA-500" />
                    </Form.Item>

                    <Form.Item label="Hoạt chất" name="activeIngredient">
                        <Input placeholder="Paracetamol" />
                    </Form.Item>

                    <Form.Item label="ATC Code" name="atcCode">
                        <Input placeholder="N02BE01" />
                    </Form.Item>

                    <Form.Item
                        label="Đơn vị"
                        name="unit"
                        rules={[{ required: true, message: 'Nhập đơn vị' }]}
                    >
                        <Input placeholder="Viên" />
                    </Form.Item>

                    <Form.Item label="Quy cách đóng gói" name="packingSpecification">
                        <Input placeholder="Hộp 10 vỉ x 10 viên" />
                    </Form.Item>

                    <Form.Item label="Hướng dẫn sử dụng" name="usageInstruction">
                        <Input.TextArea rows={2} placeholder="Uống sau ăn..." />
                    </Form.Item>

                    <Form.Item label="Chống chỉ định" name="contraindication">
                        <Input.TextArea rows={2} placeholder="Không dùng nếu..." />
                    </Form.Item>

                    <Button type="primary" htmlType="submit" loading={creating} block>
                        Lưu thuốc
                    </Button>
                </Form>
            </Modal>
        </DashboardFrame>
    );
}