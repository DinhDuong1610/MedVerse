'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
    clearAuthSession,
    getAuthSession,
} from './auth-storage';
import type { AuthSession } from '@/types/auth';

export function useAuthSession() {
    const router = useRouter();

    const [session, setSession] = useState<AuthSession | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const current = getAuthSession();

        if (!current?.accessToken) {
            clearAuthSession();
            setLoading(false);
            router.replace('/login');
            return;
        }

        setSession(current);
        setLoading(false);
    }, [router]);

    return {
        session,
        loading,
    };
}