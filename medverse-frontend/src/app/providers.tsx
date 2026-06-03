'use client';

import { App as AntApp, ConfigProvider, theme } from 'antd';
import type { ReactNode } from 'react';

export default function Providers({ children }: { children: ReactNode }) {
    return (
        <ConfigProvider
            theme={{
                algorithm: theme.defaultAlgorithm,
                token: {
                    colorPrimary: '#19b6a4',
                    colorInfo: '#3b82f6',
                    colorSuccess: '#20c997',
                    colorWarning: '#f59e0b',
                    colorError: '#ef4444',
                    borderRadius: 16,
                    fontFamily:
                        'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                },
                components: {
                    Button: {
                        controlHeight: 44,
                        borderRadius: 999,
                        fontWeight: 700,
                    },
                    Input: {
                        controlHeight: 46,
                        borderRadius: 14,
                    },
                    Card: {
                        borderRadiusLG: 24,
                    },
                },
            }}
        >
            <AntApp>{children}</AntApp>
        </ConfigProvider>
    );
}