'use client';

import {
    CalendarOutlined,
    FileProtectOutlined,
    HeartOutlined,
    MedicineBoxOutlined,
    PlusOutlined,
    SafetyCertificateOutlined,
    WarningOutlined,
} from '@ant-design/icons';
import { Alert, Button, Skeleton, Tag } from 'antd';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { getMyAppointmentRequests } from '@/services/appointment-request.service';
import { getMyMedicalRecords } from '@/services/ehr.service';
import { getMyAllergies, getMyMedicalProfile } from '@/services/patient-medical.service';
import { getMyPrescriptions } from '@/services/prescription.service';
import type {
    Allergy,
    AppointmentRequest,
    MedicalRecord,
    PatientMedicalProfile,
    Prescription,
} from '@/types/clinical';
import type { AuthSession } from '@/types/auth';
import StatusTag from './StatusTag';
import styles from './patient-portal.module.scss';

type PatientPortalDashboardProps = {
    session: AuthSession;
};

type PortalData = {
    profile: PatientMedicalProfile | null;
    allergies: Allergy[];
    records: MedicalRecord[];
    prescriptions: Prescription[];
    requests: AppointmentRequest[];
};

const emptyData: PortalData = {
    profile: null,
    allergies: [],
    records: [],
    prescriptions: [],
    requests: [],
};

async function safeLoad<T>(callback: () => Promise<T>, fallback: T) {
    try {
        return await callback();
    } catch {
        return fallback;
    }
}

function formatRequestTime(request?: AppointmentRequest) {
    if (!request) return 'Chưa có yêu cầu đặt lịch';

    const date = request.desiredDate || 'chưa rõ ngày';
    const time = request.desiredTime || '';

    return `${date} ${time}`.trim();
}

function getRequestStatusText(status?: string) {
    const labels: Record<string, string> = {
        PENDING: 'Đang chờ xác nhận',
        APPROVED: 'Đã xác nhận',
        REJECTED: 'Đã từ chối',
        CANCELLED: 'Đã hủy',
    };

    return labels[status || ''] || status || 'Sẵn sàng';
}

function getProfileCompletion(profile: PatientMedicalProfile | null, allergies: Allergy[]) {
    if (!profile) return 0;

    const fields = [
        profile.bloodType,
        profile.heightCm,
        profile.weightKg,
        profile.chronicDiseases,
        profile.medicalHistory,
        profile.currentMedications,
    ];

    const filled = fields.filter(Boolean).length;
    const allergyPoint = allergies.length > 0 ? 1 : 0;

    return Math.round(((filled + allergyPoint) / 7) * 100);
}

export default function PatientPortalDashboard({
    session,
}: PatientPortalDashboardProps) {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<PortalData>(emptyData);
    const [error, setError] = useState<string | null>(null);

    const displayName = session.fullName || session.email;

    const latestRequest = useMemo(
        () =>
            [...data.requests].sort((a, b) =>
                String(b.createdAt || '').localeCompare(String(a.createdAt || '')),
            )[0],
        [data.requests],
    );

    const latestRecord = data.records[0];
    const latestPrescription = data.prescriptions[0];

    const profileCompletion = useMemo(
        () => getProfileCompletion(data.profile, data.allergies),
        [data.profile, data.allergies],
    );

    useEffect(() => {
        async function loadPortal() {
            try {
                setLoading(true);
                setError(null);

                const [
                    profile,
                    allergies,
                    recordPage,
                    prescriptionPage,
                    requestPage,
                ] = await Promise.all([
                    safeLoad(() => getMyMedicalProfile(), null),
                    safeLoad(() => getMyAllergies(), []),
                    safeLoad(() => getMyMedicalRecords(), {
                        content: [],
                    } as Awaited<ReturnType<typeof getMyMedicalRecords>>),
                    safeLoad(() => getMyPrescriptions(), {
                        content: [],
                    } as Awaited<ReturnType<typeof getMyPrescriptions>>),
                    safeLoad(() => getMyAppointmentRequests(), {
                        content: [],
                    } as Awaited<ReturnType<typeof getMyAppointmentRequests>>),
                ]);

                setData({
                    profile,
                    allergies,
                    records: recordPage.content || [],
                    prescriptions: prescriptionPage.content || [],
                    requests: requestPage.content || [],
                });
            } catch (err) {
                setError(
                    err instanceof Error
                        ? err.message
                        : 'Không thể tải dữ liệu cổng bệnh nhân.',
                );
            } finally {
                setLoading(false);
            }
        }

        loadPortal();
    }, []);

    if (loading) {
        return <Skeleton active paragraph={{ rows: 10 }} />;
    }

    return (
        <div>
            {error && (
                <Alert
                    type="error"
                    showIcon
                    message="Không thể tải đầy đủ dữ liệu"
                    description={error}
                    style={{ marginBottom: 20 }}
                />
            )}

            <section className={styles.hero}>
                <div>
                    <div className={styles.heroKicker}>
                        <SafetyCertificateOutlined />
                        Cổng bệnh nhân
                    </div>

                    <h1 className={styles.heroTitle}>
                        Xin chào, {displayName}. Bạn muốn theo dõi thông tin nào hôm nay?
                    </h1>

                    <p className={styles.heroDescription}>
                        Đây là khu vực giúp bạn đặt lịch khám, theo dõi yêu cầu,
                        cập nhật hồ sơ sức khỏe, xem bệnh án và đơn thuốc sau mỗi
                        lần thăm khám.
                    </p>

                    <div className={styles.heroActions}>
                        <Link href="/dashboard/patient/book-appointment">
                            <Button type="primary" size="large" icon={<PlusOutlined />}>
                                Đặt lịch khám
                            </Button>
                        </Link>

                        <Link href="/dashboard/patient/profile">
                            <Button size="large">Cập nhật hồ sơ sức khỏe</Button>
                        </Link>
                    </div>
                </div>

                <article className={styles.heroCard}>
                    <span>Yêu cầu gần nhất</span>
                    <strong>{getRequestStatusText(latestRequest?.status)}</strong>
                    <p>
                        {latestRequest
                            ? `Thời gian mong muốn: ${formatRequestTime(latestRequest)}`
                            : 'Bạn chưa có yêu cầu đặt lịch mới. Hãy chọn chuyên khoa và thời gian phù hợp để bắt đầu.'}
                    </p>
                </article>
            </section>

            <section className={styles.quickGrid}>
                <Link href="/dashboard/patient/book-appointment" className={styles.quickCard}>
                    <div className={styles.quickIcon}>
                        <CalendarOutlined />
                    </div>
                    <div className={styles.quickTitle}>Đặt lịch khám</div>
                    <div className={styles.quickDescription}>
                        Gửi yêu cầu khám theo chuyên khoa, bác sĩ và thời gian mong muốn.
                    </div>
                </Link>

                <Link href="/dashboard/patient/profile" className={styles.quickCard}>
                    <div className={styles.quickIcon}>
                        <HeartOutlined />
                    </div>
                    <div className={styles.quickTitle}>Hồ sơ sức khỏe</div>
                    <div className={styles.quickDescription}>
                        Cập nhật nhóm máu, chỉ số cơ thể, bệnh nền, thuốc đang dùng và dị ứng.
                    </div>
                </Link>

                <Link href="/dashboard/patient/medical-records" className={styles.quickCard}>
                    <div className={styles.quickIcon}>
                        <FileProtectOutlined />
                    </div>
                    <div className={styles.quickTitle}>Bệnh án</div>
                    <div className={styles.quickDescription}>
                        Xem kết quả khám, chẩn đoán, hướng điều trị và ghi chú từ bác sĩ.
                    </div>
                </Link>

                <Link href="/dashboard/patient/prescriptions" className={styles.quickCard}>
                    <div className={styles.quickIcon}>
                        <MedicineBoxOutlined />
                    </div>
                    <div className={styles.quickTitle}>Đơn thuốc</div>
                    <div className={styles.quickDescription}>
                        Theo dõi thuốc, liều dùng, thời gian sử dụng và hướng dẫn điều trị.
                    </div>
                </Link>
            </section>

            <section className={styles.contentGrid}>
                <div>
                    <article className={styles.portalPanel}>
                        <div className={styles.panelHeader}>
                            <div>
                                <span>Theo dõi chăm sóc</span>
                                <h2>Hoạt động gần đây</h2>
                                <p>
                                    Các yêu cầu đặt lịch, bệnh án và đơn thuốc gần
                                    nhất của bạn sẽ được tổng hợp tại đây.
                                </p>
                            </div>
                        </div>

                        {latestRequest ? (
                            <div className={styles.listCard}>
                                <div className={styles.listTitle}>
                                    <strong>Yêu cầu đặt lịch</strong>
                                    <StatusTag value={latestRequest.status} />
                                </div>
                                <p className={styles.muted}>
                                    {latestRequest.specialtyName || 'Chuyên khoa chưa rõ'} ·{' '}
                                    {latestRequest.doctorName || 'Chưa chọn bác sĩ'} ·{' '}
                                    {formatRequestTime(latestRequest)}
                                </p>
                            </div>
                        ) : (
                            <div className={styles.listCard}>
                                <div className={styles.listTitle}>
                                    <strong>Chưa có yêu cầu đặt lịch</strong>
                                    <Tag color="blue">Có thể bắt đầu</Tag>
                                </div>
                                <p className={styles.muted}>
                                    Bạn có thể gửi yêu cầu khám mới để lễ tân xác nhận
                                    và sắp xếp lịch phù hợp.
                                </p>
                            </div>
                        )}

                        {latestRecord ? (
                            <div className={styles.listCard}>
                                <div className={styles.listTitle}>
                                    <strong>
                                        {latestRecord.diagnosisText ||
                                            latestRecord.chiefComplaint ||
                                            'Bệnh án gần nhất'}
                                    </strong>
                                    <StatusTag value={latestRecord.status} />
                                </div>
                                <p className={styles.muted}>
                                    {latestRecord.treatmentPlan ||
                                        latestRecord.clinicalNote ||
                                        'Chưa có ghi chú điều trị.'}
                                </p>
                            </div>
                        ) : (
                            <div className={styles.listCard}>
                                <div className={styles.listTitle}>
                                    <strong>Chưa có bệnh án</strong>
                                    <Tag color="default">Đang chờ dữ liệu</Tag>
                                </div>
                                <p className={styles.muted}>
                                    Sau khi hoàn tất ca khám, kết quả khám sẽ xuất hiện tại đây.
                                </p>
                            </div>
                        )}

                        {latestPrescription ? (
                            <div className={styles.listCard}>
                                <div className={styles.listTitle}>
                                    <strong>Đơn thuốc gần nhất</strong>
                                    <StatusTag value={latestPrescription.status} />
                                </div>
                                <p className={styles.muted}>
                                    {latestPrescription.items?.length || 0} thuốc ·{' '}
                                    {latestPrescription.note || 'Không có ghi chú.'}
                                </p>
                            </div>
                        ) : (
                            <div className={styles.listCard}>
                                <div className={styles.listTitle}>
                                    <strong>Chưa có đơn thuốc</strong>
                                    <Tag color="default">Chưa phát sinh</Tag>
                                </div>
                                <p className={styles.muted}>
                                    Đơn thuốc sẽ hiển thị sau khi bác sĩ kê đơn và hoàn tất hồ sơ.
                                </p>
                            </div>
                        )}
                    </article>

                    <article className={styles.portalPanel} style={{ marginTop: 20 }}>
                        <div className={styles.panelHeader}>
                            <div>
                                <span>Việc nên hoàn thiện</span>
                                <h2>Gợi ý cho hồ sơ của bạn</h2>
                                <p>
                                    Hồ sơ càng đầy đủ thì bác sĩ càng có thêm thông tin
                                    để đánh giá an toàn khi khám và kê đơn.
                                </p>
                            </div>

                            <Tag color={profileCompletion >= 70 ? 'green' : 'orange'}>
                                {profileCompletion}% hoàn thiện
                            </Tag>
                        </div>

                        <div className={styles.listCard}>
                            <div className={styles.listTitle}>
                                <strong>Cập nhật thông tin sức khỏe</strong>
                                <Tag color={data.profile ? 'green' : 'orange'}>
                                    {data.profile ? 'Đã có hồ sơ' : 'Chưa có hồ sơ'}
                                </Tag>
                            </div>
                            <p className={styles.muted}>
                                Bổ sung nhóm máu, bệnh nền, thuốc đang dùng và tiền sử
                                điều trị để hồ sơ sức khỏe đầy đủ hơn.
                            </p>
                        </div>

                        <div className={styles.listCard}>
                            <div className={styles.listTitle}>
                                <strong>Khai báo dị ứng</strong>
                                <Tag color={data.allergies.length > 0 ? 'green' : 'orange'}>
                                    {data.allergies.length} mục
                                </Tag>
                            </div>
                            <p className={styles.muted}>
                                Nếu bạn từng dị ứng với thuốc, thực phẩm hoặc tác nhân
                                khác, hãy cập nhật để bác sĩ có thêm thông tin khi điều trị.
                            </p>
                        </div>

                        <Link href="/dashboard/patient/profile">
                            <Button type="primary">Mở hồ sơ sức khỏe</Button>
                        </Link>
                    </article>
                </div>

                <div>
                    <article className={styles.portalPanel}>
                        <div className={styles.panelHeader}>
                            <div>
                                <span>Tổng quan sức khỏe</span>
                                <h2>Thông tin cá nhân y tế</h2>
                            </div>
                        </div>

                        <div className={styles.healthGrid}>
                            <div className={styles.healthItem}>
                                <span>Nhóm máu</span>
                                <strong>{data.profile?.bloodType || 'Chưa cập nhật'}</strong>
                            </div>

                            <div className={styles.healthItem}>
                                <span>Chiều cao</span>
                                <strong>
                                    {data.profile?.heightCm
                                        ? `${data.profile.heightCm} cm`
                                        : 'Chưa cập nhật'}
                                </strong>
                            </div>

                            <div className={styles.healthItem}>
                                <span>Cân nặng</span>
                                <strong>
                                    {data.profile?.weightKg
                                        ? `${data.profile.weightKg} kg`
                                        : 'Chưa cập nhật'}
                                </strong>
                            </div>

                            <div className={styles.healthItem}>
                                <span>Dị ứng</span>
                                <strong>{data.allergies.length} mục</strong>
                            </div>
                        </div>
                    </article>

                    <article className={styles.portalPanel} style={{ marginTop: 20 }}>
                        <div className={styles.panelHeader}>
                            <div>
                                <span>An toàn điều trị</span>
                                <h2>Dị ứng cần lưu ý</h2>
                            </div>

                            <WarningOutlined style={{ color: '#f59e0b', fontSize: 24 }} />
                        </div>

                        {data.allergies.length === 0 ? (
                            <div className={styles.listCard}>
                                <div className={styles.listTitle}>
                                    <strong>Chưa ghi nhận dị ứng</strong>
                                    <Tag color="orange">Nên cập nhật</Tag>
                                </div>
                                <p className={styles.muted}>
                                    Bạn có thể bổ sung dị ứng trong hồ sơ sức khỏe
                                    để hỗ trợ bác sĩ khi thăm khám và kê đơn.
                                </p>
                            </div>
                        ) : (
                            data.allergies.slice(0, 4).map((item) => (
                                <div key={item.id} className={styles.listCard}>
                                    <div className={styles.listTitle}>
                                        <strong>{item.allergen}</strong>
                                        <StatusTag value={item.severity || 'UNKNOWN'} />
                                    </div>
                                    <p className={styles.muted}>
                                        {item.reaction || item.note || 'Không có ghi chú.'}
                                    </p>
                                </div>
                            ))
                        )}
                    </article>
                </div>
            </section>
        </div>
    );
}