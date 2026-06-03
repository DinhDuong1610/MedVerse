import {
    buildAuthSession,
    clearAuthSession,
    getAccessToken,
    getAuthSession,
    saveAuthSession,
} from '@/lib/auth/auth-storage';
import type { ApiErrorBody, AppResponse } from '@/types/api';
import type { AuthResponse } from '@/types/auth';

const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080/api';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

type ApiRequestOptions = {
    method?: HttpMethod;
    body?: unknown;
    auth?: boolean;
    headers?: HeadersInit;
    retryOnUnauthorized?: boolean;
};

function buildHeaders(auth: boolean, headers?: HeadersInit) {
    const requestHeaders = new Headers(headers);

    if (!requestHeaders.has('Content-Type')) {
        requestHeaders.set('Content-Type', 'application/json');
    }

    if (auth) {
        const token = getAccessToken();

        if (token) {
            requestHeaders.set('Authorization', `Bearer ${token}`);
        }
    }

    return requestHeaders;
}

async function refreshAccessToken() {
    const currentSession = getAuthSession();

    if (!currentSession?.refreshToken) {
        return null;
    }

    const response = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            refreshToken: currentSession.refreshToken,
        }),
    });

    if (!response.ok) {
        clearAuthSession();
        return null;
    }

    const payload = (await response.json()) as AppResponse<AuthResponse>;
    const nextSession = buildAuthSession(payload.data);

    saveAuthSession(nextSession);

    return nextSession.accessToken;
}

async function executeRequest(
    path: string,
    options: ApiRequestOptions,
): Promise<Response> {
    const { method = 'GET', body, auth = true, headers } = options;

    return fetch(`${API_BASE_URL}${path}`, {
        method,
        headers: buildHeaders(auth, headers),
        body: body !== undefined ? JSON.stringify(body) : undefined,
    });
}

export async function apiRequest<T>(
    path: string,
    options: ApiRequestOptions = {},
): Promise<AppResponse<T>> {
    const { auth = true, retryOnUnauthorized = true } = options;

    let response = await executeRequest(path, options);

    if (auth && response.status === 401 && retryOnUnauthorized) {
        const refreshedToken = await refreshAccessToken();

        if (refreshedToken) {
            response = await executeRequest(path, {
                ...options,
                retryOnUnauthorized: false,
            });
        }
    }

    if (response.status === 204) {
        return {
            status: 'SUCCESS',
            message: 'No content',
            data: undefined as T,
            metadata: null,
        };
    }

    const contentType = response.headers.get('content-type');
    const isJson = contentType?.includes('application/json');

    const payload = isJson
        ? ((await response.json()) as AppResponse<T> | ApiErrorBody)
        : null;

    if (!response.ok) {
        const message =
            payload?.message || `Request failed with status ${response.status}`;

        throw new Error(message);
    }

    return payload as AppResponse<T>;
}