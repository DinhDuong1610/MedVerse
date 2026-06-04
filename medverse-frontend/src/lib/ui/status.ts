import type { PresetColorType } from 'antd/es/_util/colors';

export type StatusMeta = {
    label: string;
    color: PresetColorType | 'default';
};

const statusMap: Record<string, StatusMeta> = {
    /**
     * Common
     */
    ACTIVE: {
        label: 'Đang hoạt động',
        color: 'green',
    },
    INACTIVE: {
        label: 'Ngừng hoạt động',
        color: 'default',
    },
    DISABLED: {
        label: 'Đã vô hiệu hóa',
        color: 'red',
    },
    PENDING_ACTIVATION: {
        label: 'Chờ kích hoạt',
        color: 'gold',
    },

    /**
     * Appointment request
     */
    PENDING: {
        label: 'Đang chờ',
        color: 'gold',
    },
    APPROVED: {
        label: 'Đã duyệt',
        color: 'green',
    },
    REJECTED: {
        label: 'Đã từ chối',
        color: 'red',
    },

    /**
     * Appointment
     */
    SCHEDULED: {
        label: 'Đã lên lịch',
        color: 'blue',
    },
    CONFIRMED: {
        label: 'Đã xác nhận',
        color: 'cyan',
    },
    COMPLETED: {
        label: 'Đã hoàn tất',
        color: 'green',
    },
    CANCELLED: {
        label: 'Đã hủy',
        color: 'default',
    },
    NO_SHOW: {
        label: 'Vắng mặt',
        color: 'orange',
    },

    /**
     * Medical record / Prescription
     */
    DRAFT: {
        label: 'Bản nháp',
        color: 'gold',
    },
    FINALIZED: {
        label: 'Đã phát hành',
        color: 'green',
    },

    /**
     * Work slot
     */
    AVAILABLE: {
        label: 'Còn trống',
        color: 'green',
    },
    BOOKED: {
        label: 'Đã đặt',
        color: 'blue',
    },

    /**
     * Audit / system
     */
    SUCCESS: {
        label: 'Thành công',
        color: 'green',
    },
    FAILED: {
        label: 'Thất bại',
        color: 'red',
    },
    UP: {
        label: 'Sẵn sàng',
        color: 'green',
    },
    DOWN: {
        label: 'Gián đoạn',
        color: 'red',
    },

    /**
     * Severity
     */
    LOW: {
        label: 'Nhẹ',
        color: 'green',
    },
    MODERATE: {
        label: 'Trung bình',
        color: 'gold',
    },
    HIGH: {
        label: 'Cao',
        color: 'orange',
    },
    CRITICAL: {
        label: 'Nghiêm trọng',
        color: 'red',
    },
    UNKNOWN: {
        label: 'Chưa xác định',
        color: 'default',
    },

    /**
     * Appointment type
     */
    ONLINE: {
        label: 'Trực tuyến',
        color: 'blue',
    },
    OFFLINE: {
        label: 'Tại phòng khám',
        color: 'green',
    },
};

export function normalizeStatus(value?: string | null) {
    return String(value || 'UNKNOWN')
        .trim()
        .toUpperCase();
}

export function getStatusMeta(value?: string | null): StatusMeta {
    const normalized = normalizeStatus(value);

    return (
        statusMap[normalized] || {
            label: normalized || 'Chưa xác định',
            color: 'default',
        }
    );
}

export function getStatusLabel(value?: string | null) {
    return getStatusMeta(value).label;
}

export function getStatusColor(value?: string | null) {
    return getStatusMeta(value).color;
}