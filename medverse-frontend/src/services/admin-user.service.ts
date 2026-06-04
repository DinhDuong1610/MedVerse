import { apiRequest } from '@/lib/api/http';
import type {
    AdminCreateUserPayload,
    AdminUpdateDoctorProfilePayload,
    AdminUpdateUserRolesPayload,
    AdminUpdateUserStatusPayload,
    AdminUser,
    AdminUserFilter,
} from '@/types/admin-user';
import type { PageResponse } from '@/types/pagination';

function buildUserQuery(filter?: AdminUserFilter) {
    const params = new URLSearchParams();

    params.set('page', String(filter?.page || 0));
    params.set('size', String(filter?.size || 20));

    if (filter?.keyword) params.set('keyword', filter.keyword);
    if (filter?.status && filter.status !== 'ALL') {
        params.set('status', filter.status);
    }
    if (filter?.role && filter.role !== 'ALL') {
        params.set('role', filter.role);
    }

    return params.toString();
}

export async function getAdminUsers(filter?: AdminUserFilter) {
    const res = await apiRequest<PageResponse<AdminUser>>(
        `/v1/admin/users?${buildUserQuery(filter)}`,
    );

    return res.data;
}

export async function createAdminUser(payload: AdminCreateUserPayload) {
    const res = await apiRequest<AdminUser>('/v1/admin/users', {
        method: 'POST',
        body: payload,
    });

    return res.data;
}

export async function updateAdminUserStatus(
    userId: string,
    payload: AdminUpdateUserStatusPayload,
) {
    const res = await apiRequest<AdminUser>(
        `/v1/admin/users/${userId}/status`,
        {
            method: 'PUT',
            body: payload,
        },
    );

    return res.data;
}

export async function updateAdminUserRoles(
    userId: string,
    payload: AdminUpdateUserRolesPayload,
) {
    const res = await apiRequest<AdminUser>(
        `/v1/admin/users/${userId}/roles`,
        {
            method: 'PUT',
            body: payload,
        },
    );

    return res.data;
}

export async function updateAdminDoctorProfile(
    userId: string,
    payload: AdminUpdateDoctorProfilePayload,
) {
    const res = await apiRequest<AdminUser>(
        `/v1/admin/users/${userId}/doctor-profile`,
        {
            method: 'PUT',
            body: payload,
        },
    );

    return res.data;
}