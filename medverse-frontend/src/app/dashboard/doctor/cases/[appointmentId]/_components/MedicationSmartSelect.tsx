'use client';

import { Alert, Select, Spin, Tag } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { autocompleteAtc } from '@/services/ai.service';
import { searchMedications } from '@/services/medication.service';
import type { AiAtcSuggestion, Medication } from '@/types/clinical';

type Props = {
    value?: string;
    onChange?: (value: string) => void;
};

function getAtcCode(item: AiAtcSuggestion) {
    return item.atcCode || item.code || '';
}

function getAtcLabel(item: AiAtcSuggestion) {
    return item.name || item.label || item.code || item.atcCode || 'ATC suggestion';
}

export default function MedicationSmartSelect({ value, onChange }: Props) {
    const [keyword, setKeyword] = useState('');
    const [medications, setMedications] = useState<Medication[]>([]);
    const [atcSuggestions, setAtcSuggestions] = useState<AiAtcSuggestion[]>([]);
    const [loadingMedication, setLoadingMedication] = useState(false);
    const [loadingAi, setLoadingAi] = useState(false);

    useEffect(() => {
        const timer = window.setTimeout(async () => {
            try {
                setLoadingMedication(true);

                const data = await searchMedications(keyword);
                setMedications(data);
            } finally {
                setLoadingMedication(false);
            }
        }, 350);

        return () => window.clearTimeout(timer);
    }, [keyword]);

    useEffect(() => {
        const timer = window.setTimeout(async () => {
            if (!keyword.trim()) {
                setAtcSuggestions([]);
                return;
            }

            try {
                setLoadingAi(true);

                const data = await autocompleteAtc(keyword, 6);
                setAtcSuggestions(data);
            } catch {
                setAtcSuggestions([]);
            } finally {
                setLoadingAi(false);
            }
        }, 450);

        return () => window.clearTimeout(timer);
    }, [keyword]);

    const options = useMemo(
        () =>
            medications.map((medication) => ({
                value: medication.id,
                label: (
                    <div>
                        <strong>{medication.name}</strong>
                        <div style={{ marginTop: 4, color: '#6a7c7a', fontSize: 12 }}>
                            {medication.code} · {medication.activeIngredient || 'Chưa rõ hoạt chất'} ·{' '}
                            {medication.atcCode || 'No ATC'}
                        </div>
                    </div>
                ),
            })),
        [medications],
    );

    return (
        <div>
            <Select
                showSearch
                value={value}
                onChange={onChange}
                onSearch={setKeyword}
                filterOption={false}
                placeholder="Tìm thuốc trong kho, ví dụ: para, amox..."
                notFoundContent={loadingMedication ? <Spin size="small" /> : 'Không có thuốc'}
                options={options}
                style={{ width: '100%' }}
            />

            {keyword.trim() && (
                <div style={{ marginTop: 12 }}>
                    <Alert
                        type="info"
                        showIcon
                        message="AI gợi ý ATC"
                        description={
                            loadingAi ? (
                                <Spin size="small" />
                            ) : atcSuggestions.length ? (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                    {atcSuggestions.map((item, index) => (
                                        <Tag key={`${getAtcCode(item)}-${index}`} color="cyan">
                                            {getAtcCode(item)} · {getAtcLabel(item)}
                                        </Tag>
                                    ))}
                                </div>
                            ) : (
                                'Chưa có gợi ý phù hợp.'
                            )
                        }
                    />
                </div>
            )}
        </div>
    );
}