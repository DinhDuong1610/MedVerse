import type { AuthSession } from '@/types/auth';

const ACCESS_TOKEN_KEY = 'mv_access_token';
const REFRESH_TOKEN_KEY = 'mv_refresh_token';
const SESSION_KEY = 'mv_auth_session';

function isBrowser() {
    return typeof window !== 'undefined';
}

function setCookie(name: string, value: string, maxAgeSeconds: number) {
    if (!isBrowser()) return;

    document.cookie = `${name}=${value}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax`;
}

function clearCookie(name: string) {
    if (!isBrowser()) return;

    document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
}

export function saveAuthSession(session: AuthSession) {
    if (!isBrowser()) return;

    localStorage.setItem(ACCESS_TOKEN_KEY, session.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, session.refreshToken);
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));

    setCookie(ACCESS_TOKEN_KEY, session.accessToken, 60 * 60 * 24);
}

export function getAccessToken() {
    if (!isBrowser()) return null;

    return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getAuthSession(): AuthSession | null {
    if (!isBrowser()) return null;

    const raw = localStorage.getItem(SESSION_KEY);

    if (!raw) return null;

    try {
        return JSON.parse(raw) as AuthSession;
    } catch {
        return null;
    }
}

export function clearAuthSession() {
    if (!isBrowser()) return;

    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(SESSION_KEY);
    clearCookie(ACCESS_TOKEN_KEY);
}