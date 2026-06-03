'use client';

import { Button, Empty, Input, List, Spin, Tag } from 'antd';
import { useState } from 'react';
import { autocompleteIcd } from '@/services/ai.service';
import type { AiIcdSuggestion } from '@/types/clinical';

type Props = {
    onPick: (item: {
        diagnosisText: string;
        icdCode?: string;
        icdDisplay?: string;
    }) => void;
};

function getIcdCode(item: AiIcdSuggestion) {
    return item.icdCode || item.code || '';
}

function getIcdDisplay(item: AiIcdSuggestion) {
    return item.icdDisplay || item.display || item.title || item.name || item.label || '';
}

export default function DiagnosisAiSuggest({ onPick }: Props) {
    const [keyword, setKeyword] = useState('');
    const [items, setItems] = useState<AiIcdSuggestion[]>([]);
    const [loading, setLoading] = useState(false);

    const search = async () => {
        if (!keyword.trim()) return;

        try {
            setLoading(true);

            const data = await autocompleteIcd(keyword, 8);
            setItems(data);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <Input.Search
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                onSearch={search}
                enterButton="Gợi ý ICD"
                placeholder="Nhập triệu chứng hoặc chẩn đoán, ví dụ: viêm họng"
            />

            <div style={{ marginTop: 14 }}>
                {loading ? (
                    <Spin />
                ) : items.length === 0 ? (
                    <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description="Chưa có gợi ý ICD"
                    />
                ) : (
                    <List
                        dataSource={items}
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
                                                onPick({
                                                    diagnosisText: display || keyword,
                                                    icdCode: code,
                                                    icdDisplay: display,
                                                })
                                            }
                                        >
                                            Dùng
                                        </Button>,
                                    ]}
                                >
                                    <List.Item.Meta
                                        title={
                                            <span>
                                                {display || 'ICD suggestion'}{' '}
                                                {code && <Tag color="blue">{code}</Tag>}
                                            </span>
                                        }
                                        description={
                                            item.score !== undefined
                                                ? `Độ phù hợp: ${Math.round(item.score * 100)}%`
                                                : undefined
                                        }
                                    />
                                </List.Item>
                            );
                        }}
                    />
                )}
            </div>
        </div>
    );
}