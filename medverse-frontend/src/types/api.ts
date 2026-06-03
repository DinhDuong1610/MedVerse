export type AppResponse<T> = {
    status: string;
    message: string;
    data: T;
    metadata: unknown;
};

export type ApiErrorBody = {
    status?: string;
    message?: string;
    data?: unknown;
    metadata?: unknown;
};