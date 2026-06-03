'use client';

import {
    Alert,
    Button,
    Card,
    Descriptions,
    Empty,
    Form,
    Input,
    InputNumber,
    List,
    Skeleton,
    Space,
    Tag,
    Typography,
    message,
} from 'antd';
import { useEffect, useState } from 'react';
import ClinicalPageState from '../../_components/ClinicalPageState';
import DashboardFrame from '../../_components/DashboardFrame';
import RoleGuardState from '../../_components/RoleGuardState';
import StatusTag from '../../_components/StatusTag';
import { useAuthSession } from '@/lib/auth/use-auth-session';
import {
    analyzeClinicalText,
    autocompleteAtc,
    autocompleteIcd,
    getAiHealth,
} from '@/services/ai.service';
import type {
    AiAtcSuggestion,
    AiHealth,
    AiIcdSuggestion,
} from '@/types/clinical';
import styles from '../../dashboard.module.scss';

type IcdFormValues = {
    query: string;
    topK?: number;
};

type AtcFormValues = {
    query: string;
    topK?: number;
};

type AnalyzeFormValues = {
    clinicalText: string;
    medicalHistoryText?: string;
};

function getIcdCode(item: AiIcdSuggestion) {
    return item.icdCode || item.code || '';
}

function getIcdDisplay(item: AiIcdSuggestion) {
    return (
        item.icdDisplay ||
        item.display ||
        item.title ||
        item.name ||
        item.label ||
        'ICD suggestion'
    );
}

function getAtcCode(item: AiAtcSuggestion) {
    return item.atcCode || item.code || '';
}

function getAtcDisplay(item: AiAtcSuggestion) {
    return item.name || item.label || item.code || item.atcCode || 'ATC suggestion';
}

function parseMedicalHistory(text?: string) {
    if (!text?.trim()) {
        return {};
    }

    try {
        return JSON.parse(text);
    } catch {
        return {
            note: text,
        };
    }
}

export default function DoctorAiPage() {
    const { session, loading: authLoading } = useAuthSession();

    const [icdForm] = Form.useForm<IcdFormValues>();
    const [atcForm] = Form.useForm<AtcFormValues>();
    const [analyzeForm] = Form.useForm<AnalyzeFormValues>();

    const [health, setHealth] = useState<AiHealth | null>(null);
    const [icdItems, setIcdItems] = useState<AiIcdSuggestion[]>([]);
    const [atcItems, setAtcItems] = useState<AiAtcSuggestion[]>([]);
    const [analyzeResult, setAnalyzeResult] =
        useState<Record<string, unknown> | null>(null);

    const [loading, setLoading] = useState(true);
    const [healthLoading, setHealthLoading] = useState(false);
    const [icdLoading, setIcdLoading] = useState(false);
    const [atcLoading, setAtcLoading] = useState(false);
    const [analyzeLoading, setAnalyzeLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadHealth = async () => {
        try {
            setHealthLoading(true);
            setError(null);

            const data = await getAiHealth();
            setHealth(data);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Không thể kiểm tra trạng thái AI service.',
            );
        } finally {
            setHealthLoading(false);
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!session) return;

        loadHealth();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session]);

    const handleSearchIcd = async (values: IcdFormValues) => {
        try {
            setIcdLoading(true);

            const data = await autocompleteIcd(values.query, values.topK || 8);
            setIcdItems(data);

            if (data.length === 0) {
                message.info('Không tìm thấy gợi ý ICD phù hợp.');
            }
        } catch (err) {
            message.error(
                err instanceof Error
                    ? err.message
                    : 'Không thể gọi ICD autocomplete.',
            );
        } finally {
            setIcdLoading(false);
        }
    };

    const handleSearchAtc = async (values: AtcFormValues) => {
        try {
            setAtcLoading(true);

            const data = await autocompleteAtc(values.query, values.topK || 8);
            setAtcItems(data);

            if (data.length === 0) {
                message.info('Không tìm thấy gợi ý ATC phù hợp.');
            }
        } catch (err) {
            message.error(
                err instanceof Error
                    ? err.message
                    : 'Không thể gọi ATC autocomplete.',
            );
        } finally {
            setAtcLoading(false);
        }
    };

    const handleAnalyzeText = async (values: AnalyzeFormValues) => {
        try {
            setAnalyzeLoading(true);

            const result = await analyzeClinicalText({
                diagnosis_text_input: values.clinicalText,
                medical_history: parseMedicalHistory(values.medicalHistoryText),
            });

            setAnalyzeResult(result.data || result);
            message.success('AI đã phân tích clinical text.');
        } catch (err) {
            message.error(
                err instanceof Error
                    ? err.message
                    : 'Không thể gọi AI analyze text.',
            );
        } finally {
            setAnalyzeLoading(false);
        }
    };

    if (authLoading || !session || loading) {
        return <Skeleton active paragraph={{ rows: 10 }} />;
    }

    return (
        <DashboardFrame
            session={session}
            title="AI Clinical Workspace"
            subtitle="Kiểm tra AI service, ICD/ATC autocomplete và phân tích clinical text"
        >
            <RoleGuardState
                session={session}
                anyPermissions={['EHR:WRITE', 'PRESCRIPTION:WRITE']}
            >
                {error && (
                    <Alert
                        type="error"
                        showIcon
                        message="AI service error"
                        description={error}
                        style={{ marginBottom: 20 }}
                    />
                )}

                <section className={styles.detailGrid}>
                    <Card
                        className={styles.detailCard}
                        title="AI Service Health"
                        extra={
                            <Button
                                onClick={loadHealth}
                                loading={healthLoading}
                            >
                                Kiểm tra lại
                            </Button>
                        }
                    >
                        <Descriptions column={1}>
                            <Descriptions.Item label="Service">
                                {health?.service || 'medverse-ai'}
                            </Descriptions.Item>

                            <Descriptions.Item label="Status">
                                <StatusTag value={health?.status || 'UNKNOWN'} />
                            </Descriptions.Item>

                            <Descriptions.Item label="Fallback">
                                {health?.fallbackEnabled ? (
                                    <Tag color="gold">Enabled</Tag>
                                ) : (
                                    <Tag color="green">Disabled</Tag>
                                )}
                            </Descriptions.Item>
                        </Descriptions>

                        <DividerLike />

                        <div className={styles.medicationList}>
                            {health?.modules &&
                                Object.entries(health.modules).map(
                                    ([module, status]) => (
                                        <div key={module}>
                                            <strong>{module}</strong>
                                            <span>{status}</span>
                                        </div>
                                    ),
                                )}
                        </div>
                    </Card>

                    <Card className={styles.detailCard} title="ICD Autocomplete">
                        <Form
                            form={icdForm}
                            layout="vertical"
                            onFinish={handleSearchIcd}
                            initialValues={{
                                query: 'viêm họng',
                                topK: 8,
                            }}
                        >
                            <Form.Item
                                label="Triệu chứng hoặc chẩn đoán"
                                name="query"
                                rules={[
                                    {
                                        required: true,
                                        message: 'Nhập từ khóa ICD',
                                    },
                                ]}
                            >
                                <Input placeholder="Ví dụ: viêm họng, đau đầu, sốt..." />
                            </Form.Item>

                            <Form.Item label="Số lượng gợi ý" name="topK">
                                <InputNumber
                                    min={1}
                                    max={20}
                                    style={{ width: '100%' }}
                                />
                            </Form.Item>

                            <Button
                                type="primary"
                                htmlType="submit"
                                loading={icdLoading}
                            >
                                Gợi ý ICD
                            </Button>
                        </Form>

                        <DividerLike />

                        {icdItems.length === 0 ? (
                            <Empty
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                                description="Chưa có gợi ý ICD"
                            />
                        ) : (
                            <List
                                dataSource={icdItems}
                                renderItem={(item) => {
                                    const code = getIcdCode(item);
                                    const display = getIcdDisplay(item);

                                    return (
                                        <List.Item>
                                            <List.Item.Meta
                                                title={
                                                    <span>
                                                        {display}{' '}
                                                        {code && (
                                                            <Tag color="blue">
                                                                {code}
                                                            </Tag>
                                                        )}
                                                    </span>
                                                }
                                                description={
                                                    item.score !== undefined
                                                        ? `Độ phù hợp: ${Math.round(
                                                            item.score * 100,
                                                        )}%`
                                                        : 'Không có score'
                                                }
                                            />
                                        </List.Item>
                                    );
                                }}
                            />
                        )}
                    </Card>

                    <Card className={styles.detailCard} title="ATC Autocomplete">
                        <Form
                            form={atcForm}
                            layout="vertical"
                            onFinish={handleSearchAtc}
                            initialValues={{
                                query: 'paracetamol',
                                topK: 8,
                            }}
                        >
                            <Form.Item
                                label="Tên thuốc hoặc hoạt chất"
                                name="query"
                                rules={[
                                    {
                                        required: true,
                                        message: 'Nhập từ khóa ATC',
                                    },
                                ]}
                            >
                                <Input placeholder="Ví dụ: paracetamol, amoxicillin..." />
                            </Form.Item>

                            <Form.Item label="Số lượng gợi ý" name="topK">
                                <InputNumber
                                    min={1}
                                    max={20}
                                    style={{ width: '100%' }}
                                />
                            </Form.Item>

                            <Button
                                type="primary"
                                htmlType="submit"
                                loading={atcLoading}
                            >
                                Gợi ý ATC
                            </Button>
                        </Form>

                        <DividerLike />

                        {atcItems.length === 0 ? (
                            <Empty
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                                description="Chưa có gợi ý ATC"
                            />
                        ) : (
                            <List
                                dataSource={atcItems}
                                renderItem={(item) => {
                                    const code = getAtcCode(item);
                                    const display = getAtcDisplay(item);

                                    return (
                                        <List.Item>
                                            <List.Item.Meta
                                                title={
                                                    <span>
                                                        {display}{' '}
                                                        {code && (
                                                            <Tag color="cyan">
                                                                {code}
                                                            </Tag>
                                                        )}
                                                    </span>
                                                }
                                                description={
                                                    item.score !== undefined
                                                        ? `Độ phù hợp: ${Math.round(
                                                            item.score * 100,
                                                        )}%`
                                                        : 'Không có score'
                                                }
                                            />
                                        </List.Item>
                                    );
                                }}
                            />
                        )}
                    </Card>

                    <Card className={styles.detailCard} title="Analyze Clinical Text">
                        <Alert
                            type="info"
                            showIcon
                            message="AI chỉ hỗ trợ phân tích. Bác sĩ là người xác nhận cuối cùng."
                            style={{ marginBottom: 16 }}
                        />

                        <Form
                            form={analyzeForm}
                            layout="vertical"
                            onFinish={handleAnalyzeText}
                            initialValues={{
                                clinicalText:
                                    'Bệnh nhân sốt 38.5 độ, đau họng, ho khan 3 ngày. Khám họng đỏ, không khó thở.',
                                medicalHistoryText:
                                    '{ "bloodType": "O+", "allergies": ["Penicillin"], "chronicDiseases": "Không ghi nhận" }',
                            }}
                        >
                            <Form.Item
                                label="Clinical text"
                                name="clinicalText"
                                rules={[
                                    {
                                        required: true,
                                        message:
                                            'Nhập clinical text để phân tích',
                                    },
                                ]}
                            >
                                <Input.TextArea
                                    rows={6}
                                    placeholder="Nhập triệu chứng, ghi chú khám, chẩn đoán sơ bộ..."
                                />
                            </Form.Item>

                            <Form.Item
                                label="Medical history / context"
                                name="medicalHistoryText"
                            >
                                <Input.TextArea
                                    rows={4}
                                    placeholder='Có thể nhập JSON hoặc text thường. Ví dụ: { "allergies": ["Penicillin"] }'
                                />
                            </Form.Item>

                            <Button
                                type="primary"
                                htmlType="submit"
                                loading={analyzeLoading}
                            >
                                Phân tích clinical text
                            </Button>
                        </Form>

                        {analyzeResult && (
                            <>
                                <DividerLike />

                                <Typography.Title level={5}>
                                    Kết quả AI
                                </Typography.Title>

                                <pre
                                    style={{
                                        marginTop: 12,
                                        padding: 14,
                                        borderRadius: 16,
                                        background: '#f6fffd',
                                        overflow: 'auto',
                                        maxHeight: 360,
                                    }}
                                >
                                    {JSON.stringify(analyzeResult, null, 2)}
                                </pre>
                            </>
                        )}
                    </Card>
                </section>
            </RoleGuardState>
        </DashboardFrame>
    );
}

function DividerLike() {
    return (
        <div
            style={{
                height: 1,
                width: '100%',
                background: 'rgba(16, 32, 31, 0.08)',
                margin: '18px 0',
            }}
        />
    );
}