import { apiRequest } from '@/lib/api/http';
import type {
    CancelAppointmentRequestPayload,
    PatientAppointmentRequest,
    PatientAppointmentRequestFilter,
    PatientAppointmentRequestPage,
} from '@/types/patient-appointment-request';

type AppointmentRequestResponseLike =
    | PatientAppointmentRequest[]
    | PatientAppointmentRequestPage
    | {
        content?: PatientAppointmentRequest[];
        data?: PatientAppointmentRequest[] | PatientAppointmentRequestPage;
    }
    | null
    | undefined;

function emptyPage(): PatientAppointmentRequestPage {
    return {
        content: [],
        page: 0,
        size: 0,
        totalElements: 0,
        totalPages: 0,
    };
}

function extractAppointmentRequestPage(
    response: AppointmentRequestResponseLike,
): PatientAppointmentRequestPage {
    if (Array.isArray(response)) {
        return {
            content: response,
            page: 0,
            size: response.length,
            totalElements: response.length,
            totalPages: 1,
        };
    }

    if (!response || typeof response !== 'object') {
        return emptyPage();
    }

    if (Array.isArray(response.content)) {
        return response as PatientAppointmentRequestPage;
    }

    if (Array.isArray(response.data)) {
        return {
            content: response.data,
            page: 0,
            size: response.data.length,
            totalElements: response.data.length,
            totalPages: 1,
        };
    }

    if (
        response.data &&
        typeof response.data === 'object' &&
        Array.isArray(response.data.content)
    ) {
        return response.data as PatientAppointmentRequestPage;
    }

    return emptyPage();
}

function buildQuery(filter?: PatientAppointmentRequestFilter) {
    const params = new URLSearchParams();

    params.set('page', String(filter?.page || 0));
    params.set('size', String(filter?.size || 100));

    if (filter?.keyword?.trim()) {
        params.set('keyword', filter.keyword.trim());
    }

    if (filter?.status && filter.status !== 'ALL') {
        params.set('status', filter.status);
    }

    return params.toString();
}

export async function getMyAppointmentRequests(
    filter?: PatientAppointmentRequestFilter,
) {
    const res = await apiRequest<AppointmentRequestResponseLike>(
        `/v1/appointment-requests/me?${buildQuery(filter)}`,
    );

    return extractAppointmentRequestPage(res.data);
}

export async function cancelMyAppointmentRequest(
    requestId: string,
    payload?: CancelAppointmentRequestPayload,
) {
    const res = await apiRequest<PatientAppointmentRequest>(
        `/v1/appointment-requests/${requestId}/cancel`,
        {
            method: 'PATCH',
            body: payload || {},
        },
    );

    return res.data;
}