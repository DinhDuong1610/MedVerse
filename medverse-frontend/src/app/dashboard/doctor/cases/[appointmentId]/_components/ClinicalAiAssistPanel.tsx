'use client';

import {
    Alert,
    Button,
    Card,
    Empty,
    Input,
    List,
    Space,
    Spin,
    Tag,
    Typography,
    message,
} from 'antd';
import { useState } from 'react';
import {
    analyzeClinicalText,
    autocompleteIcd,
} from '@/services/ai.service';
import type {
    AiIcdSuggestion,
    Allergy,
    Appointment,
    PatientMedicalProfile,
} from '@/types/clinical';

type ClinicalAiAssistPanelProps = {
    appointment: Appointment | null;
    patientProfile: PatientMedicalProfile | null;
    allergies: Allergy[];
    clinicalText: string;
    onPickDiagnosis: (item: {
        diagnosisText: string;
        icdCode?: string;
        icdDisplay?: string;
    }) => void;
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

export default function ClinicalAiAssistPanel({
    appointment,
    patientProfile,
    allergies,
    clinicalText,
    onPickDiagnosis,
}: ClinicalAiAssistPanelProps) {
    const [manualPrompt, setManualPrompt] = useState('');
    const [analyzing, setAnalyzing] = useState(false);
    const [suggestingIcd, setSuggestingIcd] = useState(false);

    const [aiResult, setAiResult] = useState<Record<string, unknown> | null>(
        null,
    );
    const [icdSuggestions, setIcdSuggestions] = useState<AiIcdSuggestion[]>([]);

    const mergedClinicalText = [clinicalText, manualPrompt]
        .filter(Boolean)
        .join('\n')
        .trim();

    const handleAnalyze = async () => {
        if (!mergedClinicalText) {
            message.warning('Hãy nhập triệu chứng hoặc ghi chú khám trước.');
            return;
        }

        try {
            setAnalyzing(true);

            const result = await analyzeClinicalText({
                diagnosis_text_input: mergedClinicalText,
                medical_history: {
                    patientId: appointment?.patientId,
                    patientName: appointment?.patientName,
                    bloodType: patientProfile?.bloodType,
                    heightCm: patientProfile?.heightCm,
                    weightKg: patientProfile?.weightKg,
                    chronicDiseases: patientProfile?.chronicDiseases,
                    medicalHistory: patientProfile?.medicalHistory,
                    currentMedicationsNote:
                        patientProfile?.currentMedicationsNote,
                    allergies: allergies.map((item) => ({
                        allergen: item.allergen,
                        reaction: item.reaction,
                        severity: item.severity,
                        note: item.note,
                    })),
                },
            });

            setAiResult(result.data || result);
            message.success('AI đã phân tích nội dung khám.');
        } catch (err) {
            message.error(
                err instanceof Error
                    ? err.message
                    : 'Không thể phân tích nội dung khám.',
            );
        } finally {
            setAnalyzing(false);
        }
    };

    const handleSuggestIcd = async () => {
        if (!mergedClinicalText) {
            message.warning('Hãy nhập triệu chứng hoặc chẩn đoán sơ bộ trước.');
            return;
        }

        try {
            setSuggestingIcd(true);

            const suggestions = await autocompleteIcd(mergedClinicalText, 8);
            setIcdSuggestions(suggestions);

            if (suggestions.length === 0) {
                message.info('AI chưa tìm thấy gợi ý ICD phù hợp.');
            }
        } catch (err) {
            message.error(
                err instanceof Error
                    ? err.message
                    : 'Không thể gợi ý ICD.',
            );
        } finally {
            setSuggestingIcd(false);
        }
    };

    return (
        <Card
            title="AI hỗ trợ khám và chẩn đoán"
            extra={
                <Space wrap>
                    <Button onClick={handleAnalyze} loading={analyzing}>
                        Phân tích ca khám
                    </Button>

                    <Button
                        type="primary"
                        ghost
                        onClick={handleSuggestIcd}
                        loading={suggestingIcd}
                    >
                        Gợi ý ICD
                    </Button>
                </Space>
            }
        >
            <Alert
                type="info"
                showIcon
                message="AI chỉ hỗ trợ, không thay bác sĩ quyết định."
                description="Bác sĩ cần kiểm tra lại toàn bộ gợi ý trước khi lưu chẩn đoán, kê đơn hoặc hoàn tất bệnh án."
                style={{ marginBottom: 16 }}
            />

            <Input.TextArea
                rows={4}
                value={manualPrompt}
                onChange={(event) => setManualPrompt(event.target.value)}
                placeholder="Bổ sung câu hỏi cho AI nếu cần. Ví dụ: Hãy phân tích khả năng viêm họng cấp, cảm cúm hoặc nhiễm khuẩn hô hấp..."
            />

            {analyzing && (
                <div style={{ marginTop: 16 }}>
                    <Spin /> Đang phân tích...
                </div>
            )}

            {aiResult && (
                <div style={{ marginTop: 18 }}>
                    <Typography.Title level={5}>
                        Kết quả phân tích AI
                    </Typography.Title>

                    <pre
                        style={{
                            padding: 14,
                            borderRadius: 16,
                            background: '#f6fffd',
                            overflow: 'auto',
                            maxHeight: 320,
                        }}
                    >
                        {JSON.stringify(aiResult, null, 2)}
                    </pre>
                </div>
            )}

            <div style={{ marginTop: 18 }}>
                <Typography.Title level={5}>
                    Gợi ý ICD từ nội dung khám
                </Typography.Title>

                {suggestingIcd ? (
                    <Spin />
                ) : icdSuggestions.length === 0 ? (
                    <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description="Chưa có gợi ý ICD"
                    />
                ) : (
                    <List
                        dataSource={icdSuggestions}
                        renderItem={(item) => {
                            const code = getIcdCode(item);
                            const display = getIcdDisplay(item);

                            return (
                                <List.Item
                                    actions={[
                                        <Button
                                            key="pick"
                                            type="link"
                                            onClick={() =>
                                                onPickDiagnosis({
                                                    diagnosisText: display,
                                                    icdCode: code,
                                                    icdDisplay: display,
                                                })
                                            }
                                        >
                                            Dùng cho chẩn đoán
                                        </Button>,
                                    ]}
                                >
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
            </div>
        </Card>
    );
}