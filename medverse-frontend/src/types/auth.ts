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
    email: string;
    role: DemoRole;
    accessToken: string;
    refreshToken: string;
};