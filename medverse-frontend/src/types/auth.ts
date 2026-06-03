export type AuthResponse = {
    accessToken: string;
    refreshToken: string;
};

export type LoginRequest = {
    email: string;
    password: string;
};

export type DemoRole = 'ADMIN' | 'DOCTOR' | 'RECEPTIONIST' | 'PATIENT';

export type AuthSession = {
    accessToken: string;
    refreshToken?: string;
    email: string;
    role: DemoRole;
    userId?: string;
};