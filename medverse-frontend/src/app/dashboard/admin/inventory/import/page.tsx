'use client';

import {
    Button,
    Card,
    DatePicker,
    Form,
    Input,
    InputNumber,
    Select,
    Skeleton,
    message,
} from 'antd';
import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import DashboardFrame from '../../../_components/DashboardFrame';
import { useAuthSession } from '@/lib/auth/use-auth-session';
import {
    getInventoryMedications,
    importStock,
} from '@/services/inventory.service';
import type { Medication } from '@/types/clinical';
import styles from '../../../dashboard.module.scss';

type ImportFormValues = {
    medicationId: string;
    batchNumber: string;
    supplierName?: string;
    manufactureDate?: dayjs.Dayjs;
    expiryDate: dayjs.Dayjs;
    quantity: number;
    importPrice: number;
    salePrice: number;
    importReferenceCode?: string;
};

export default function AdminStockImportPage() {
    const { session, loading: authLoading } = useAuthSession();

    const [form] = Form.useForm<ImportFormValues>();

    const [medications, setMedications] = useState<Medication[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        async function load() {
            const page = await getInventoryMedications('');
            setMedications(page.content || []);
            setLoading(false);
        }

        if (session?.role === 'ADMIN') {
            load();
        }
    }, [session]);

    const handleImport = async (values: ImportFormValues) => {
        try {
            setSubmitting(true);

            await importStock({
                medicationId: values.medicationId,
                batchNumber: values.batchNumber,
                supplierName: values.supplierName,
                manufactureDate: values.manufactureDate?.format('YYYY-MM-DD'),
                expiryDate: values.expiryDate.format('YYYY-MM-DD'),
                quantity: values.quantity,
                importPrice: values.importPrice,
                salePrice: values.salePrice,
                importReferenceCode: values.importReferenceCode,
            });

            message.success('Nhập kho thành công.');
            form.resetFields();
        } catch (error) {
            message.error(
                error instanceof Error ? error.message : 'Không thể nhập kho.',
            );
        } finally {
            setSubmitting(false);
        }
    };

    if (authLoading || !session || loading) {
        return <Skeleton active paragraph={{ rows: 8 }} />;
    }

    return (
        <DashboardFrame
            session={session}
            title="Nhập kho"
            subtitle="Tạo hoặc cập nhật lô thuốc trong kho"
        >
            <Card className={styles.detailCard}>
                <Form form={form} layout="vertical" onFinish={handleImport}>
                    <Form.Item
                        label="Thuốc"
                        name="medicationId"
                        rules={[{ required: true, message: 'Chọn thuốc' }]}
                    >
                        <Select
                            showSearch
                            placeholder="Chọn thuốc"
                            optionFilterProp="label"
                            options={medications.map((item) => ({
                                value: item.id,
                                label: `${item.name} (${item.code}) - tồn ${item.totalStock || 0}`,
                            }))}
                        />
                    </Form.Item>

                    <Form.Item
                        label="Số lô"
                        name="batchNumber"
                        rules={[{ required: true, message: 'Nhập số lô' }]}
                    >
                        <Input placeholder="BATCH-2026-001" />
                    </Form.Item>

                    <Form.Item label="Nhà cung cấp" name="supplierName">
                        <Input placeholder="Tên nhà cung cấp" />
                    </Form.Item>

                    <Form.Item label="Mã phiếu nhập" name="importReferenceCode">
                        <Input placeholder="IMP-2026-001" />
                    </Form.Item>

                    <Form.Item label="Ngày sản xuất" name="manufactureDate">
                        <DatePicker style={{ width: '100%' }} />
                    </Form.Item>

                    <Form.Item
                        label="Ngày hết hạn"
                        name="expiryDate"
                        rules={[{ required: true, message: 'Chọn ngày hết hạn' }]}
                    >
                        <DatePicker style={{ width: '100%' }} />
                    </Form.Item>

                    <Form.Item
                        label="Số lượng"
                        name="quantity"
                        rules={[{ required: true, message: 'Nhập số lượng' }]}
                    >
                        <InputNumber min={1} style={{ width: '100%' }} />
                    </Form.Item>

                    <Form.Item
                        label="Giá nhập"
                        name="importPrice"
                        rules={[{ required: true, message: 'Nhập giá nhập' }]}
                    >
                        <InputNumber min={0} style={{ width: '100%' }} />
                    </Form.Item>

                    <Form.Item
                        label="Giá bán"
                        name="salePrice"
                        rules={[{ required: true, message: 'Nhập giá bán' }]}
                    >
                        <InputNumber min={0} style={{ width: '100%' }} />
                    </Form.Item>

                    <Button type="primary" htmlType="submit" loading={submitting}>
                        Xác nhận nhập kho
                    </Button>
                </Form>
            </Card>
        </DashboardFrame>
    );
}