export type AdminUserStatus =
    | 'ACTIVE'
    | 'DISABLED'
    | 'PENDING_ACTIVATION'
    | 'INACTIVE';

export type AdminUserRole = {
    id?: string;
    code: string;
    name?: string;
};

export type AdminUser = {
    id: string;
    email: string;
    fullName?: string;
    phoneNumber?: string;
    gender?: string;
    dateOfBirth?: string;
    address?: string;

    status: AdminUserStatus | string;
    roles?: AdminUserRole[];
    primaryRole?: string;

    createdAt?: string;
    lastLoginAt?: string;

    specialtyName?: string;
    licenseNumber?: string;
    degree?: string;
    experienceYears?: number;

    bio?: string;
};

export type AdminUserFilter = {
    keyword?: string;
    status?: string;
    role?: string;
    specialtyId?: string;
    page?: number;
    size?: number;
};

export type AdminCreateUserPayload = {
    email: string;
    password: string;
    fullName: string;
    phoneNumber?: string;
    roleCodes: string[];
};

export type AdminUpdateUserStatusPayload = {
    status: string;
};

export type AdminUpdateUserRolesPayload = {
    roleCodes: string[];
};

export type AdminUpdateDoctorProfilePayload = {
    specialtyId?: string;
    licenseNumber?: string;
    degree?: string;
    experienceYears?: number;
    bio?: string;
};