import { apiRequest } from '@/lib/api/http';
import type {
    AdminCreateStaffPayload,
    AdminUpdateUserStatusPayload,
    AdminUser,
    AdminUserRoleCode,
} from '@/types/admin-user';
import type { PageResponse } from '@/types/pagination';

export async function getAdminUsers(params?: {
    roleCode?: AdminUserRoleCode;
    size?: number;
}) {
    const searchParams = new URLSearchParams();

    searchParams.set('size', String(params?.size || 100));

    if (params?.roleCode && params.roleCode !== 'ALL') {
        searchParams.set('roleCode', params.roleCode);
    }

    const res = await apiRequest<PageResponse<AdminUser>>(
        `/v1/admin/users?${searchParams.toString()}`,
    );

    return res.data;
}

export async function getAdminUserById(id: string) {
    const res = await apiRequest<AdminUser>(`/v1/admin/users/${id}`);

    return res.data;
}

export async function createAdminStaff(payload: AdminCreateStaffPayload) {
    const res = await apiRequest<AdminUser>('/v1/admin/users/staff', {
        method: 'POST',
        body: payload,
    });

    return res.data;
}

export async function updateAdminUserStatus(
    id: string,
    payload: AdminUpdateUserStatusPayload,
) {
    const res = await apiRequest<AdminUser>(`/v1/admin/users/${id}/status`, {
        method: 'PATCH',
        body: payload,
    });

    return res.data;
}