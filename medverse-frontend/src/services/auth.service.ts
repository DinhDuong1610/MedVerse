import { apiRequest } from '@/lib/api/http';
import { resolveDemoRole } from '@/lib/auth/roles';
import { saveAuthSession } from '@/lib/auth/auth-storage';
import type { AuthResponse, LoginRequest } from '@/types/auth';

export async function login(request: LoginRequest) {
    const response = await apiRequest<AuthResponse>('/auth/login', {
        method: 'POST',
        body: request,
        auth: false,
    });

    const role = resolveDemoRole(request.email);

    saveAuthSession({
        email: request.email,
        role,
        accessToken: response.data.accessToken,
        refreshToken: response.data.refreshToken,
    });

    return {
        ...response.data,
        role,
    };
}