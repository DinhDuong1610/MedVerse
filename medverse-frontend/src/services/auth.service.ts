import { apiRequest } from '@/lib/api/http';
import {
    buildAuthSession,
    saveAuthSession,
} from '@/lib/auth/auth-storage';
import type {
    AuthResponse,
    LoginRequest,
    RegisterRequest,
} from '@/types/auth';

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

export async function register(request: RegisterRequest) {
    const response = await apiRequest<null>('/auth/register', {
        method: 'POST',
        body: request,
        auth: false,
    });

    return response;
}