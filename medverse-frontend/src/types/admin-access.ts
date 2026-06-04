export type AdminPermission = {
    id: string;
    code: string;
    description?: string;
    groupName?: string;
};

export type AdminRolePermission = {
    id: string;
    code: string;
    name: string;
    description?: string;
    permissionCount: number;
    permissions: AdminPermission[];
};

export type AdminUpdateRolePermissionsPayload = {
    permissionCodes: string[];
};