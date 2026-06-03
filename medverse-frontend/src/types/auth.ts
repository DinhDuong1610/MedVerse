export type DemoRole = 'ADMIN' | 'DOCTOR' | 'RECEPTIONIST' | 'PATIENT';

export type AuthResponse = {
    accessToken: string;
    refreshToken: string;

    userId: string;
    email: string;
    fullName?: string;

    primaryRole?: string;
    roles: string[];
    permissions: string[];
};

export type LoginRequest = {
    email: string;
    password: string;
};

export type AuthSession = {
    userId: string;
    email: string;
    fullName?: string;

    roles: string[];
    permissions: string[];

    primaryRole: string;

    /**
     * Legacy alias để các page cũ chưa bị vỡ.
     * Từ các task sau, ưu tiên dùng roles/permissions.
     */
    role: DemoRole;

    accessToken: string;
    refreshToken: string;
};