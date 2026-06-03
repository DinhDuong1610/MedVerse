import { getAccessToken } from '@/lib/auth/auth-storage';
import type { ApiErrorBody, AppResponse } from '@/types/api';

const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080/api';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

type ApiRequestOptions = {
    method?: HttpMethod;
    body?: unknown;
    auth?: boolean;
    headers?: HeadersInit;
};

export async function apiRequest<T>(
    path: string,
    options: ApiRequestOptions = {},
): Promise<AppResponse<T>> {
    const { method = 'GET', body, auth = true, headers } = options;

    const requestHeaders: HeadersInit = {
        'Content-Type': 'application/json',
        ...headers,
    };

    if (auth) {
        const token = getAccessToken();

        if (token) {
            requestHeaders.Authorization = `Bearer ${token}`;
        }
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
    });

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