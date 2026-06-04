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

export type RegisterRequest = {
    email: string;
    password: string;
    fullName: string;
    dateOfBirth?: string;
    gender?: string;
    phoneNumber?: string;
    address?: string;
};

export type AuthSession = {
    userId: string;
    email: string;
    fullName?: string;

    roles: string[];
    permissions: string[];

    primaryRole: string;

    role: DemoRole;

    accessToken: string;
    refreshToken: string;
};