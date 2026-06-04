'use client';

import {
    AlertOutlined,
    ArrowLeftOutlined,
    CheckCircleOutlined,
    MedicineBoxOutlined,
    ReloadOutlined,
    SearchOutlined,
    ShoppingCartOutlined,
    WarningOutlined,
} from '@ant-design/icons';
import {
    Alert,
    Button,
    Card,
    Descriptions,
    Form,
    Input,
    InputNumber,
    Select,
    Skeleton,
    Space,
    Statistic,
    Table,
    Tag,
    message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import DashboardFrame from '../../../_components/DashboardFrame';
import RoleGuardState from '../../../_components/RoleGuardState';
import { useAuthSession } from '@/lib/auth/use-auth-session';
import {
    getInventoryMedications,
    importMedicationStock,
} from '@/services/inventory.service';
import type { Medication, StockImportPayload } from '@/types/clinical';
import styles from '../../../dashboard.module.scss';

type StockImportFormValues = {
    medicationId: string;
    batchNumber: string;
    supplierName?: string;
    manufactureDate?: string;
    expiryDate: string;
    quantity: number;
    importPrice: number;
    salePrice: number;
    importReferenceCode?: string;
};

function getStockTone(totalStock?: number) {
    const stock = Number(totalStock || 0);

    if (stock <= 0) {
        return {
            label: 'Hết hàng',
            color: 'red',
        };
    }

    if (stock <= 20) {
        return {
            label: 'Sắp hết',
            color: 'orange',
        };
    }

    return {
        label: 'Còn hàng',
        color: 'green',
    };
}

function formatCurrency(value?: number) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
    }).format(Number(value || 0));
}

function buildStockPayload(values: StockImportFormValues): StockImportPayload {
    const payload: StockImportPayload = {
        medicationId: values.medicationId,
        batchNumber: values.batchNumber.trim(),
        expiryDate: values.expiryDate,
        quantity: Number(values.quantity),
        importPrice: Number(values.importPrice),
        salePrice: Number(values.salePrice),
    };

    if (values.supplierName?.trim()) {
        payload.supplierName = values.supplierName.trim();
    }

    if (values.manufactureDate) {
        payload.manufactureDate = values.manufactureDate;
    }

    if (values.importReferenceCode?.trim()) {
        payload.importReferenceCode = values.importReferenceCode.trim();
    }

    return payload;
}

export default function AdminStockImportPage() {
    const { session, loading: authLoading } = useAuthSession();

    const [medications, setMedications] = useState<Medication[]>([]);
    const [selectedMedication, setSelectedMedication] =
        useState<Medication | null>(null);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [form] = Form.useForm<StockImportFormValues>();

    const loadMedications = async () => {
        try {
            setLoading(true);
            setError(null);

            const page = await getInventoryMedications({
                size: 200,
            });

            setMedications(page.content || []);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Không thể tải danh mục thuốc.',
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!session) return;

        loadMedications();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session]);

    const medicationOptions = useMemo(
        () =>
            medications.map((item) => ({
                label: `${item.name} (${item.code})`,
                value: item.id,
                searchText: `${item.name} ${item.code} ${item.atcCode || ''} ${item.activeIngredient || ''
                    }`,
            })),
        [medications],
    );

    const metrics = useMemo(() => {
        const outOfStock = medications.filter(
            (item) => Number(item.totalStock || 0) <= 0,
        ).length;

        const lowStock = medications.filter((item) => {
            const stock = Number(item.totalStock || 0);
            return stock > 0 && stock <= 20;
        }).length;

        const totalStock = medications.reduce(
            (sum, item) => sum + Number(item.totalStock || 0),
            0,
        );

        return {
            totalMedication: medications.length,
            totalStock,
            lowStock,
            outOfStock,
        };
    }, [medications]);

    const recommendedMedications = useMemo(() => {
        return [...medications]
            .sort((a, b) => Number(a.totalStock || 0) - Number(b.totalStock || 0))
            .slice(0, 8);
    }, [medications]);

    const handleMedicationChange = (medicationId: string) => {
        const medication =
            medications.find((item) => item.id === medicationId) || null;

        setSelectedMedication(medication);
    };

    const handleSubmit = async (values: StockImportFormValues) => {
        try {
            setSaving(true);

            const payload = buildStockPayload(values);

            await importMedicationStock(payload);

            message.success('Đã nhập kho thuốc thành công.');

            form.resetFields();
            setSelectedMedication(null);

            await loadMedications();
        } catch (err) {
            message.error(
                err instanceof Error
                    ? err.message
                    : 'Không thể nhập kho thuốc.',
            );
        } finally {
            setSaving(false);
        }
    };

    const columns: ColumnsType<Medication> = [
        {
            title: 'Thuốc cần chú ý',
            key: 'medication',
            render: (_, record) => (
                <Space direction="vertical" size={2}>
                    <strong>{record.name}</strong>
                    <span className={styles.mutedText}>
                        {record.code}
                        {record.atcCode ? ` · ATC ${record.atcCode}` : ''}
                    </span>
                </Space>
            ),
        },
        {
            title: 'Hoạt chất',
            dataIndex: 'activeIngredient',
            render: (value) => value || 'Chưa cập nhật',
        },
        {
            title: 'Tồn kho',
            dataIndex: 'totalStock',
            width: 140,
            render: (value) => {
                const tone = getStockTone(value);

                return (
                    <Space direction="vertical" size={2}>
                        <strong>{Number(value || 0)}</strong>
                        <Tag color={tone.color}>{tone.label}</Tag>
                    </Space>
                );
            },
        },
        {
            title: 'Thao tác',
            key: 'actions',
            width: 140,
            render: (_, record) => (
                <Button
                    size="small"
                    type="primary"
                    ghost
                    onClick={() => {
                        form.setFieldValue('medicationId', record.id);
                        setSelectedMedication(record);
                    }}
                >
                    Chọn nhập
                </Button>
            ),
        },
    ];

    if (authLoading || !session) {
        return <Skeleton active paragraph={{ rows: 8 }} />;
    }

    return (
        <DashboardFrame
            session={session}
            title="Nhập kho thuốc"
            subtitle="Tạo phiếu nhập kho cho thuốc, lô hàng và thông tin giá"
        >
            <RoleGuardState session={session} allow={['ADMIN']}>
                <div className={styles.roleDashboard}>
                    {error && (
                        <Alert
                            type="error"
                            showIcon
                            message="Không thể tải dữ liệu nhập kho"
                            description={error}
                        />
                    )}

                    <section className={styles.heroCard}>
                        <div>
                            <span>Nhập kho</span>
                            <h2>Bổ sung tồn kho thuốc theo từng lô nhập.</h2>
                            <p>
                                Chọn thuốc từ danh mục, khai báo mã lô, hạn dùng,
                                số lượng và giá để cập nhật tồn kho phục vụ quá
                                trình kê đơn.
                            </p>

                            {/* <div style={{ marginTop: 24 }}>
                                <Link href="/dashboard/admin/inventory">
                                    <Button icon={<ArrowLeftOutlined />}>
                                        Quay lại kho thuốc
                                    </Button>
                                </Link>
                            </div> */}
                        </div>

                        <div className={styles.pulseCard}>
                            <strong>{metrics.totalStock}</strong>
                            <span>tổng số lượng tồn kho</span>
                        </div>
                    </section>

                    <section className={styles.metricGrid}>
                        <Card className={styles.metricCard}>
                            <Statistic
                                title="Danh mục thuốc"
                                value={metrics.totalMedication}
                                prefix={<MedicineBoxOutlined />}
                            />
                            <p>Số thuốc có thể nhập kho.</p>
                        </Card>

                        <Card className={styles.metricCard}>
                            <Statistic
                                title="Tổng tồn kho"
                                value={metrics.totalStock}
                                prefix={<ShoppingCartOutlined />}
                            />
                            <p>Tổng số lượng thuốc hiện có.</p>
                        </Card>

                        <Card className={styles.metricCard}>
                            <Statistic
                                title="Sắp hết"
                                value={metrics.lowStock}
                                prefix={<WarningOutlined />}
                            />
                            <p>Thuốc nên cân nhắc nhập thêm.</p>
                        </Card>

                        <Card className={styles.metricCard}>
                            <Statistic
                                title="Hết hàng"
                                value={metrics.outOfStock}
                                prefix={<AlertOutlined />}
                            />
                            <p>Thuốc không còn tồn kho.</p>
                        </Card>
                    </section>

                    {medications.length === 0 && !loading && (
                        <Alert
                            type="warning"
                            showIcon
                            message="Chưa có thuốc trong danh mục"
                            description="Bạn cần tạo thuốc trong trang Quản lý kho thuốc trước khi nhập kho."
                            action={
                                <Link href="/dashboard/admin/inventory">
                                    <Button type="primary">Tạo thuốc</Button>
                                </Link>
                            }
                        />
                    )}

                    <section className={styles.detailGrid}>
                        <Card
                            className={styles.detailCard}
                            title="Thông tin phiếu nhập"
                            extra={
                                <Button
                                    icon={<ReloadOutlined />}
                                    onClick={loadMedications}
                                >
                                    Làm mới thuốc
                                </Button>
                            }
                        >
                            <Form
                                form={form}
                                layout="vertical"
                                onFinish={handleSubmit}
                                requiredMark={false}
                                initialValues={{
                                    quantity: 1,
                                    importPrice: 0,
                                    salePrice: 0,
                                }}
                            >
                                <Form.Item
                                    label="Thuốc"
                                    name="medicationId"
                                    rules={[
                                        {
                                            required: true,
                                            message: 'Vui lòng chọn thuốc.',
                                        },
                                    ]}
                                >
                                    <Select
                                        showSearch
                                        placeholder="Tìm và chọn thuốc cần nhập kho"
                                        options={medicationOptions}
                                        onChange={handleMedicationChange}
                                        filterOption={(input, option) =>
                                            String(
                                                option?.searchText ||
                                                option?.label ||
                                                '',
                                            )
                                                .toLowerCase()
                                                .includes(input.toLowerCase())
                                        }
                                        suffixIcon={<SearchOutlined />}
                                    />
                                </Form.Item>

                                <Form.Item
                                    label="Mã lô"
                                    name="batchNumber"
                                    rules={[
                                        {
                                            required: true,
                                            message: 'Vui lòng nhập mã lô.',
                                        },
                                    ]}
                                >
                                    <Input placeholder="VD: LOT-2026-001" />
                                </Form.Item>

                                <Form.Item
                                    label="Nhà cung cấp"
                                    name="supplierName"
                                >
                                    <Input placeholder="VD: Công ty Dược ABC" />
                                </Form.Item>

                                <div className={styles.quickActionGrid}>
                                    <Form.Item
                                        label="Ngày sản xuất"
                                        name="manufactureDate"
                                    >
                                        <Input type="date" />
                                    </Form.Item>

                                    <Form.Item
                                        label="Ngày hết hạn"
                                        name="expiryDate"
                                        rules={[
                                            {
                                                required: true,
                                                message:
                                                    'Vui lòng chọn ngày hết hạn.',
                                            },
                                        ]}
                                    >
                                        <Input type="date" />
                                    </Form.Item>
                                </div>

                                <Form.Item
                                    label="Số lượng nhập"
                                    name="quantity"
                                    rules={[
                                        {
                                            required: true,
                                            message: 'Vui lòng nhập số lượng.',
                                        },
                                    ]}
                                >
                                    <InputNumber
                                        min={1}
                                        style={{ width: '100%' }}
                                    />
                                </Form.Item>

                                <div className={styles.quickActionGrid}>
                                    <Form.Item
                                        label="Giá nhập"
                                        name="importPrice"
                                        rules={[
                                            {
                                                required: true,
                                                message:
                                                    'Vui lòng nhập giá nhập.',
                                            },
                                        ]}
                                    >
                                        <InputNumber
                                            min={0}
                                            style={{ width: '100%' }}
                                            addonAfter="VNĐ"
                                        />
                                    </Form.Item>

                                    <Form.Item
                                        label="Giá bán"
                                        name="salePrice"
                                        rules={[
                                            {
                                                required: true,
                                                message:
                                                    'Vui lòng nhập giá bán.',
                                            },
                                        ]}
                                    >
                                        <InputNumber
                                            min={0}
                                            style={{ width: '100%' }}
                                            addonAfter="VNĐ"
                                        />
                                    </Form.Item>
                                </div>

                                <Form.Item
                                    label="Mã phiếu nhập"
                                    name="importReferenceCode"
                                >
                                    <Input placeholder="VD: PN-2026-001" />
                                </Form.Item>

                                <Button
                                    type="primary"
                                    htmlType="submit"
                                    loading={saving}
                                    block
                                    icon={<CheckCircleOutlined />}
                                >
                                    Xác nhận nhập kho
                                </Button>
                            </Form>
                        </Card>

                        <Card
                            className={styles.detailCard}
                            title="Thuốc đang chọn"
                        >
                            {selectedMedication ? (
                                <Descriptions
                                    bordered
                                    column={1}
                                    size="small"
                                >
                                    <Descriptions.Item label="Tên thuốc">
                                        {selectedMedication.name}
                                    </Descriptions.Item>

                                    <Descriptions.Item label="Mã thuốc">
                                        <Tag color="cyan">
                                            {selectedMedication.code}
                                        </Tag>
                                    </Descriptions.Item>

                                    <Descriptions.Item label="Mã ATC">
                                        {selectedMedication.atcCode ||
                                            'Chưa cập nhật'}
                                    </Descriptions.Item>

                                    <Descriptions.Item label="Hoạt chất">
                                        {selectedMedication.activeIngredient ||
                                            'Chưa cập nhật'}
                                    </Descriptions.Item>

                                    <Descriptions.Item label="Đơn vị">
                                        {selectedMedication.unit}
                                    </Descriptions.Item>

                                    <Descriptions.Item label="Tồn kho hiện tại">
                                        <Space>
                                            <strong>
                                                {Number(
                                                    selectedMedication.totalStock ||
                                                    0,
                                                )}
                                            </strong>
                                            <Tag
                                                color={
                                                    getStockTone(
                                                        selectedMedication.totalStock,
                                                    ).color
                                                }
                                            >
                                                {
                                                    getStockTone(
                                                        selectedMedication.totalStock,
                                                    ).label
                                                }
                                            </Tag>
                                        </Space>
                                    </Descriptions.Item>

                                    <Descriptions.Item label="Quy cách">
                                        {selectedMedication.packingSpecification ||
                                            'Chưa cập nhật'}
                                    </Descriptions.Item>
                                </Descriptions>
                            ) : (
                                <Alert
                                    type="info"
                                    showIcon
                                    message="Chưa chọn thuốc"
                                    description="Hãy chọn thuốc ở form bên trái hoặc bấm Chọn nhập trong danh sách thuốc cần chú ý."
                                />
                            )}

                            <div style={{ marginTop: 20 }}>
                                <Alert
                                    type="success"
                                    showIcon
                                    message="Kiểm tra trước khi nhập"
                                    description={
                                        <div>
                                            <p>
                                                Giá nhập và giá bán sẽ được lưu
                                                theo lô nhập. Hạn dùng cần được
                                                kiểm tra chính xác trước khi xác
                                                nhận.
                                            </p>
                                            <p>
                                                Tổng tiền nhập tạm tính sẽ phụ
                                                thuộc vào số lượng và giá nhập:
                                            </p>
                                            <strong>
                                                {formatCurrency(
                                                    Number(
                                                        form.getFieldValue(
                                                            'quantity',
                                                        ) || 0,
                                                    ) *
                                                    Number(
                                                        form.getFieldValue(
                                                            'importPrice',
                                                        ) || 0,
                                                    ),
                                                )}
                                            </strong>
                                        </div>
                                    }
                                />
                            </div>
                        </Card>
                    </section>

                    <Card
                        className={styles.detailCard}
                        title="Gợi ý thuốc cần nhập thêm"
                    >
                        <Table
                            rowKey="id"
                            loading={loading}
                            columns={columns}
                            dataSource={recommendedMedications}
                            pagination={false}
                            scroll={{ x: 860 }}
                        />
                    </Card>
                </div>
            </RoleGuardState>
        </DashboardFrame>
    );
}