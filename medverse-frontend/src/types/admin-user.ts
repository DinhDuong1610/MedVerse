export type AdminUserStatus =
    | 'PENDING_ACTIVATION'
    | 'ACTIVE'
    | 'LOCKED'
    | 'DISABLED';

export type AdminUserRoleCode =
    | 'ALL'
    | 'ADMIN'
    | 'DOCTOR'
    | 'RECEPTIONIST'
    | 'PATIENT';

export type AdminStaffRoleCode = 'DOCTOR' | 'RECEPTIONIST';

export type AdminUser = {
    id: string;
    email: string;
    status: AdminUserStatus;
    lastLoginAt?: string;

    fullName?: string;
    dateOfBirth?: string;
    gender?: string;
    phoneNumber?: string;
    address?: string;

    roles: string[];
    permissions: string[];

    doctorProfileId?: string;
    specialtyId?: string;
    specialtyName?: string;
    licenseNumber?: string;
    degree?: string;
    experienceYears?: number;
    bio?: string;
};

export type AdminCreateStaffPayload = {
    email: string;
    password: string;
    fullName: string;

    dateOfBirth?: string;
    gender?: string;
    phoneNumber?: string;
    address?: string;

    roleCode: AdminStaffRoleCode;

    specialtyId?: string;
    licenseNumber?: string;
    degree?: string;
    experienceYears?: number;
    bio?: string;
};

export type AdminUpdateUserStatusPayload = {
    status: AdminUserStatus;
    reason?: string;
};

export type AdminUpdateDoctorProfilePayload = {
    specialtyId?: string;
    licenseNumber?: string;
    degree?: string;
    experienceYears?: number;
    bio?: string;
};