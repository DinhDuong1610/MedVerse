export type PageResponse<T> = {
    content: T[];
    pageable?: unknown;
    totalElements: number;
    totalPages: number;
    size: number;
    number: number;
    first: boolean;
    last: boolean;
    empty: boolean;
};