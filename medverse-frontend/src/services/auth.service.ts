import { apiRequest } from '@/lib/api/http';
import {
    buildAuthSession,
    saveAuthSession,
} from '@/lib/auth/auth-storage';
import type { AuthResponse, LoginRequest } from '@/types/auth';

export async function login(request: LoginRequest) {
    const response = await apiRequest<AuthResponse>('/auth/login', {
        method: 'POST',
        body: request,
        auth: false,
    });

    const session = buildAuthSession(response.data);

    saveAuthSession(session);

    return {
        ...response.data,
        role: session.role,
        primaryRole: session.primaryRole,
        roles: session.roles,
        permissions: session.permissions,
    };
}