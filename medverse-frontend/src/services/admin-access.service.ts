import { apiRequest } from '@/lib/api/http';
import type {
    AdminPermission,
    AdminRolePermission,
    AdminUpdateRolePermissionsPayload,
} from '@/types/admin-access';

export async function getAdminRoles() {
    const res = await apiRequest<AdminRolePermission[]>(
        '/v1/admin/access-control/roles',
    );

    return res.data;
}

export async function getAdminPermissions() {
    const res = await apiRequest<AdminPermission[]>(
        '/v1/admin/access-control/permissions',
    );

    return res.data;
}

export async function updateAdminRolePermissions(
    roleId: string,
    payload: AdminUpdateRolePermissionsPayload,
) {
    const res = await apiRequest<AdminRolePermission>(
        `/v1/admin/access-control/roles/${roleId}/permissions`,
        {
            method: 'PUT',
            body: payload,
        },
    );

    return res.data;
}