'use client';

import {
    AlertOutlined,
    CheckCircleOutlined,
    EditOutlined,
    EyeOutlined,
    MedicineBoxOutlined,
    PlusOutlined,
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
    Drawer,
    Form,
    Input,
    InputNumber,
    Modal,
    Skeleton,
    Space,
    Statistic,
    Table,
    Tag,
    message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useMemo, useState } from 'react';
import DashboardFrame from '../../_components/DashboardFrame';
import RoleGuardState from '../../_components/RoleGuardState';
import { useAuthSession } from '@/lib/auth/use-auth-session';
import {
    createInventoryMedication,
    getInventoryMedications,
    importMedicationStock,
    updateInventoryMedication,
} from '@/services/inventory.service';
import type {
    Medication,
    MedicationCreatePayload,
    StockImportPayload,
} from '@/types/clinical';
import styles from '../../dashboard.module.scss';

type MedicationFormValues = {
    code: string;
    name: string;
    activeIngredient?: string;
    atcCode?: string;
    unit: string;
    packingSpecification?: string;
    usageInstruction?: string;
    contraindication?: string;
};

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

function normalizeKeyword(value?: string) {
    return String(value || '')
        .trim()
        .toLowerCase();
}

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

function buildMedicationPayload(values: MedicationFormValues): MedicationCreatePayload {
    const payload: MedicationCreatePayload = {
        code: values.code.trim().toUpperCase(),
        name: values.name.trim(),
        unit: values.unit.trim(),
    };

    if (values.activeIngredient?.trim()) {
        payload.activeIngredient = values.activeIngredient.trim();
    }

    if (values.atcCode?.trim()) {
        payload.atcCode = values.atcCode.trim().toUpperCase();
    }

    if (values.packingSpecification?.trim()) {
        payload.packingSpecification = values.packingSpecification.trim();
    }

    if (values.usageInstruction?.trim()) {
        payload.usageInstruction = values.usageInstruction.trim();
    }

    if (values.contraindication?.trim()) {
        payload.contraindication = values.contraindication.trim();
    }

    return payload;
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

export default function AdminInventoryPage() {
    const { session, loading: authLoading } = useAuthSession();

    const [medications, setMedications] = useState<Medication[]>([]);
    const [keyword, setKeyword] = useState('');

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [selectedMedication, setSelectedMedication] =
        useState<Medication | null>(null);

    const [openDetailDrawer, setOpenDetailDrawer] = useState(false);
    const [openMedicationModal, setOpenMedicationModal] = useState(false);
    const [openStockModal, setOpenStockModal] = useState(false);
    const [editingMedication, setEditingMedication] =
        useState<Medication | null>(null);

    const [medicationForm] = Form.useForm<MedicationFormValues>();
    const [stockForm] = Form.useForm<StockImportFormValues>();

    const loadMedications = async () => {
        try {
            setLoading(true);
            setError(null);

            const page = await getInventoryMedications({
                size: 100,
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

    const filteredMedications = useMemo(() => {
        const search = normalizeKeyword(keyword);

        if (!search) return medications;

        return medications.filter((item) => {
            return (
                item.name.toLowerCase().includes(search) ||
                item.code.toLowerCase().includes(search) ||
                item.atcCode?.toLowerCase().includes(search) ||
                item.activeIngredient?.toLowerCase().includes(search)
            );
        });
    }, [medications, keyword]);

    const metrics = useMemo(() => {
        const outOfStock = medications.filter(
            (item) => Number(item.totalStock || 0) <= 0,
        ).length;

        const lowStock = medications.filter((item) => {
            const stock = Number(item.totalStock || 0);
            return stock > 0 && stock <= 20;
        }).length;

        const available = medications.filter(
            (item) => Number(item.totalStock || 0) > 20,
        ).length;

        const totalStock = medications.reduce(
            (sum, item) => sum + Number(item.totalStock || 0),
            0,
        );

        return {
            total: medications.length,
            available,
            lowStock,
            outOfStock,
            totalStock,
        };
    }, [medications]);

    const openCreateMedication = () => {
        setEditingMedication(null);
        medicationForm.resetFields();
        setOpenMedicationModal(true);
    };

    const openEditMedication = (medication: Medication) => {
        setEditingMedication(medication);

        medicationForm.setFieldsValue({
            code: medication.code,
            name: medication.name,
            activeIngredient: medication.activeIngredient,
            atcCode: medication.atcCode,
            unit: medication.unit,
            packingSpecification: medication.packingSpecification,
            usageInstruction: medication.usageInstruction,
            contraindication: medication.contraindication,
        });

        setOpenMedicationModal(true);
    };

    const openDetail = (medication: Medication) => {
        setSelectedMedication(medication);
        setOpenDetailDrawer(true);
    };

    const openImportStock = (medication: Medication) => {
        setSelectedMedication(medication);

        stockForm.setFieldsValue({
            medicationId: medication.id,
            batchNumber: '',
            supplierName: '',
            manufactureDate: undefined,
            expiryDate: undefined,
            quantity: 1,
            importPrice: 0,
            salePrice: 0,
            importReferenceCode: '',
        });

        setOpenStockModal(true);
    };

    const handleSubmitMedication = async (values: MedicationFormValues) => {
        try {
            setSaving(true);

            const payload = buildMedicationPayload(values);

            if (editingMedication) {
                await updateInventoryMedication(editingMedication.id, payload);
                message.success('Đã cập nhật thông tin thuốc.');
            } else {
                await createInventoryMedication(payload);
                message.success('Đã tạo thuốc mới.');
            }

            setOpenMedicationModal(false);
            setEditingMedication(null);
            medicationForm.resetFields();

            await loadMedications();
        } catch (err) {
            message.error(
                err instanceof Error
                    ? err.message
                    : 'Không thể lưu thông tin thuốc.',
            );
        } finally {
            setSaving(false);
        }
    };

    const handleImportStock = async (values: StockImportFormValues) => {
        try {
            setSaving(true);

            const payload = buildStockPayload(values);

            await importMedicationStock(payload);

            message.success('Đã nhập kho thuốc.');
            setOpenStockModal(false);
            stockForm.resetFields();

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
            title: 'Thuốc',
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
            title: 'Đơn vị',
            dataIndex: 'unit',
            width: 120,
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
            title: 'Quy cách',
            dataIndex: 'packingSpecification',
            render: (value) => value || 'Chưa cập nhật',
        },
        {
            title: 'Thao tác',
            key: 'actions',
            width: 280,
            fixed: 'right',
            render: (_, record) => (
                <Space wrap>
                    <Button
                        size="small"
                        icon={<EyeOutlined />}
                        onClick={() => openDetail(record)}
                    >
                        Chi tiết
                    </Button>

                    <Button
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => openEditMedication(record)}
                    >
                        Chỉnh sửa
                    </Button>

                    <Button
                        size="small"
                        type="primary"
                        icon={<ShoppingCartOutlined />}
                        onClick={() => openImportStock(record)}
                    >
                        Nhập kho
                    </Button>
                </Space>
            ),
        },
    ];

    if (authLoading || !session) {
        return <Skeleton active paragraph={{ rows: 8 }} />;
    }

    return (
        <DashboardFrame
            session={session}
            title="Quản lý kho thuốc"
            subtitle="Theo dõi danh mục thuốc, tồn kho và thao tác nhập kho"
        >
            <RoleGuardState session={session} allow={['ADMIN']}>
                <div className={styles.roleDashboard}>
                    {error && (
                        <Alert
                            type="error"
                            showIcon
                            message="Không thể tải kho thuốc"
                            description={error}
                        />
                    )}

                    <section className={styles.heroCard}>
                        <div>
                            <span>Kho thuốc</span>
                            <h2>Quản lý danh mục thuốc và tồn kho sử dụng trong kê đơn.</h2>
                            <p>
                                Admin có thể tạo thuốc, cập nhật thông tin thuốc,
                                nhập kho và theo dõi nhanh các thuốc hết hàng hoặc
                                sắp hết hàng để phục vụ quy trình kê đơn.
                            </p>
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
                                value={metrics.total}
                                prefix={<MedicineBoxOutlined />}
                            />
                            <p>Tổng số thuốc trong danh mục.</p>
                        </Card>

                        <Card className={styles.metricCard}>
                            <Statistic
                                title="Còn hàng"
                                value={metrics.available}
                                prefix={<CheckCircleOutlined />}
                            />
                            <p>Thuốc có tồn kho ổn định.</p>
                        </Card>

                        <Card className={styles.metricCard}>
                            <Statistic
                                title="Sắp hết"
                                value={metrics.lowStock}
                                prefix={<WarningOutlined />}
                            />
                            <p>Thuốc còn ít, nên cân nhắc nhập thêm.</p>
                        </Card>

                        <Card className={styles.metricCard}>
                            <Statistic
                                title="Hết hàng"
                                value={metrics.outOfStock}
                                prefix={<AlertOutlined />}
                            />
                            <p>Thuốc không còn tồn kho khả dụng.</p>
                        </Card>
                    </section>

                    <Card
                        className={styles.detailCard}
                        title="Danh sách thuốc"
                        extra={
                            <Button
                                type="primary"
                                icon={<PlusOutlined />}
                                onClick={openCreateMedication}
                            >
                                Tạo thuốc
                            </Button>
                        }
                    >
                        <div className={styles.toolbar}>
                            <Input
                                allowClear
                                prefix={<SearchOutlined />}
                                placeholder="Tìm theo tên thuốc, mã thuốc, ATC hoặc hoạt chất"
                                value={keyword}
                                onChange={(event) => setKeyword(event.target.value)}
                            />

                            <Button
                                icon={<ReloadOutlined />}
                                onClick={() => {
                                    setKeyword('');
                                    loadMedications();
                                }}
                            >
                                Làm mới
                            </Button>
                        </div>

                        <Table
                            rowKey="id"
                            loading={loading}
                            columns={columns}
                            dataSource={filteredMedications}
                            pagination={{
                                pageSize: 10,
                                showSizeChanger: false,
                            }}
                            scroll={{ x: 1180 }}
                        />
                    </Card>
                </div>

                <Drawer
                    title="Chi tiết thuốc"
                    open={openDetailDrawer}
                    width={620}
                    onClose={() => setOpenDetailDrawer(false)}
                    extra={
                        selectedMedication && (
                            <Space>
                                <Button
                                    icon={<EditOutlined />}
                                    onClick={() => openEditMedication(selectedMedication)}
                                >
                                    Chỉnh sửa
                                </Button>

                                <Button
                                    type="primary"
                                    icon={<ShoppingCartOutlined />}
                                    onClick={() => openImportStock(selectedMedication)}
                                >
                                    Nhập kho
                                </Button>
                            </Space>
                        )
                    }
                >
                    {selectedMedication && (
                        <Descriptions
                            bordered
                            column={1}
                            size="small"
                            title="Thông tin thuốc"
                        >
                            <Descriptions.Item label="Tên thuốc">
                                {selectedMedication.name}
                            </Descriptions.Item>

                            <Descriptions.Item label="Mã thuốc">
                                <Tag color="cyan">{selectedMedication.code}</Tag>
                            </Descriptions.Item>

                            <Descriptions.Item label="Mã ATC">
                                {selectedMedication.atcCode || 'Chưa cập nhật'}
                            </Descriptions.Item>

                            <Descriptions.Item label="Hoạt chất">
                                {selectedMedication.activeIngredient || 'Chưa cập nhật'}
                            </Descriptions.Item>

                            <Descriptions.Item label="Đơn vị">
                                {selectedMedication.unit}
                            </Descriptions.Item>

                            <Descriptions.Item label="Quy cách">
                                {selectedMedication.packingSpecification || 'Chưa cập nhật'}
                            </Descriptions.Item>

                            <Descriptions.Item label="Tồn kho">
                                <Space>
                                    <strong>{Number(selectedMedication.totalStock || 0)}</strong>
                                    <Tag color={getStockTone(selectedMedication.totalStock).color}>
                                        {getStockTone(selectedMedication.totalStock).label}
                                    </Tag>
                                </Space>
                            </Descriptions.Item>

                            <Descriptions.Item label="Hướng dẫn sử dụng">
                                {selectedMedication.usageInstruction || 'Chưa cập nhật'}
                            </Descriptions.Item>

                            <Descriptions.Item label="Chống chỉ định">
                                {selectedMedication.contraindication || 'Chưa cập nhật'}
                            </Descriptions.Item>
                        </Descriptions>
                    )}
                </Drawer>

                <Modal
                    title={editingMedication ? 'Chỉnh sửa thuốc' : 'Tạo thuốc mới'}
                    open={openMedicationModal}
                    onCancel={() => {
                        setOpenMedicationModal(false);
                        setEditingMedication(null);
                    }}
                    footer={null}
                    destroyOnClose
                >
                    <Form
                        form={medicationForm}
                        layout="vertical"
                        onFinish={handleSubmitMedication}
                        requiredMark={false}
                    >
                        <Form.Item
                            label="Mã thuốc"
                            name="code"
                            rules={[
                                {
                                    required: true,
                                    message: 'Vui lòng nhập mã thuốc.',
                                },
                            ]}
                        >
                            <Input
                                placeholder="VD: PARA500"
                                onChange={(event) => {
                                    medicationForm.setFieldValue(
                                        'code',
                                        event.target.value.toUpperCase(),
                                    );
                                }}
                            />
                        </Form.Item>

                        <Form.Item
                            label="Tên thuốc"
                            name="name"
                            rules={[
                                {
                                    required: true,
                                    message: 'Vui lòng nhập tên thuốc.',
                                },
                            ]}
                        >
                            <Input placeholder="VD: Paracetamol 500mg" />
                        </Form.Item>

                        <Form.Item label="Hoạt chất" name="activeIngredient">
                            <Input placeholder="VD: Paracetamol" />
                        </Form.Item>

                        <Form.Item label="Mã ATC" name="atcCode">
                            <Input
                                placeholder="VD: N02BE01"
                                onChange={(event) => {
                                    medicationForm.setFieldValue(
                                        'atcCode',
                                        event.target.value.toUpperCase(),
                                    );
                                }}
                            />
                        </Form.Item>

                        <Form.Item
                            label="Đơn vị"
                            name="unit"
                            rules={[
                                {
                                    required: true,
                                    message: 'Vui lòng nhập đơn vị.',
                                },
                            ]}
                        >
                            <Input placeholder="VD: viên, hộp, chai" />
                        </Form.Item>

                        <Form.Item label="Quy cách" name="packingSpecification">
                            <Input placeholder="VD: Hộp 10 vỉ x 10 viên" />
                        </Form.Item>

                        <Form.Item label="Hướng dẫn sử dụng" name="usageInstruction">
                            <Input.TextArea
                                rows={3}
                                placeholder="VD: Uống sau ăn, theo chỉ định của bác sĩ..."
                            />
                        </Form.Item>

                        <Form.Item label="Chống chỉ định" name="contraindication">
                            <Input.TextArea
                                rows={3}
                                placeholder="VD: Không dùng cho bệnh nhân dị ứng với thành phần thuốc..."
                            />
                        </Form.Item>

                        <Button
                            type="primary"
                            htmlType="submit"
                            loading={saving}
                            block
                        >
                            {editingMedication ? 'Lưu thay đổi' : 'Tạo thuốc'}
                        </Button>
                    </Form>
                </Modal>

                <Modal
                    title="Nhập kho thuốc"
                    open={openStockModal}
                    onCancel={() => setOpenStockModal(false)}
                    footer={null}
                    destroyOnClose
                >
                    <Form
                        form={stockForm}
                        layout="vertical"
                        onFinish={handleImportStock}
                        requiredMark={false}
                    >
                        <Form.Item label="Thuốc">
                            <Input value={selectedMedication?.name} disabled />
                        </Form.Item>

                        <Form.Item name="medicationId" hidden>
                            <Input />
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

                        <Form.Item label="Nhà cung cấp" name="supplierName">
                            <Input placeholder="VD: Công ty Dược ABC" />
                        </Form.Item>

                        <Form.Item label="Ngày sản xuất" name="manufactureDate">
                            <Input type="date" />
                        </Form.Item>

                        <Form.Item
                            label="Ngày hết hạn"
                            name="expiryDate"
                            rules={[
                                {
                                    required: true,
                                    message: 'Vui lòng chọn ngày hết hạn.',
                                },
                            ]}
                        >
                            <Input type="date" />
                        </Form.Item>

                        <Form.Item
                            label="Số lượng"
                            name="quantity"
                            rules={[
                                {
                                    required: true,
                                    message: 'Vui lòng nhập số lượng.',
                                },
                            ]}
                        >
                            <InputNumber min={1} style={{ width: '100%' }} />
                        </Form.Item>

                        <Form.Item
                            label="Giá nhập"
                            name="importPrice"
                            rules={[
                                {
                                    required: true,
                                    message: 'Vui lòng nhập giá nhập.',
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
                                    message: 'Vui lòng nhập giá bán.',
                                },
                            ]}
                        >
                            <InputNumber
                                min={0}
                                style={{ width: '100%' }}
                                addonAfter="VNĐ"
                            />
                        </Form.Item>

                        <Form.Item label="Mã phiếu nhập" name="importReferenceCode">
                            <Input placeholder="VD: PN-2026-001" />
                        </Form.Item>

                        <Button
                            type="primary"
                            htmlType="submit"
                            loading={saving}
                            block
                        >
                            Xác nhận nhập kho
                        </Button>
                    </Form>
                </Modal>
            </RoleGuardState>
        </DashboardFrame>
    );
}