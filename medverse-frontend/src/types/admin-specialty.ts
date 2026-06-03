export type AdminSpecialty = {
    id: string;
    code: string;
    name: string;
    description?: string;
    createdAt?: string;
    updatedAt?: string;
};

export type AdminSpecialtyPayload = {
    code: string;
    name: string;
    description?: string;
};