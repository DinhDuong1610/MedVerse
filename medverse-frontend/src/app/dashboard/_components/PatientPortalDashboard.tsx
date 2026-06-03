'use client';

import {
    BellOutlined,
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
import { getMyNotifications } from '@/services/notification.service';
import { getMyAllergies, getMyMedicalProfile } from '@/services/patient-medical.service';
import { getMyPrescriptions } from '@/services/prescription.service';
import type {
    Allergy,
    AppNotification,
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
    notifications: AppNotification[];
};

const emptyData: PortalData = {
    profile: null,
    allergies: [],
    records: [],
    prescriptions: [],
    requests: [],
    notifications: [],
};

async function safeLoad<T>(callback: () => Promise<T>, fallback: T) {
    try {
        return await callback();
    } catch {
        return fallback;
    }
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
    const unreadNotifications = data.notifications.filter((item) => !item.read);

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
                    notificationPage,
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
                    safeLoad(() => getMyNotifications(), {
                        content: [],
                    } as Awaited<ReturnType<typeof getMyNotifications>>),
                ]);

                setData({
                    profile,
                    allergies,
                    records: recordPage.content || [],
                    prescriptions: prescriptionPage.content || [],
                    requests: requestPage.content || [],
                    notifications: notificationPage.content || [],
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
                        Patient Portal
                    </div>

                    <h1 className={styles.heroTitle}>
                        Xin chào, {displayName}. Hôm nay bạn muốn theo dõi điều gì?
                    </h1>

                    <p className={styles.heroDescription}>
                        Đây là cổng bệnh nhân của MedVerse. Bạn có thể đặt lịch,
                        theo dõi yêu cầu khám, xem hồ sơ sức khỏe, bệnh án và đơn
                        thuốc theo cách dễ hiểu hơn.
                    </p>

                    <div className={styles.heroActions}>
                        <Link href="/dashboard/patient/book-appointment">
                            <Button type="primary" size="large" icon={<PlusOutlined />}>
                                Đặt lịch khám
                            </Button>
                        </Link>

                        <Link href="/dashboard/patient/profile">
                            <Button size="large">Xem hồ sơ sức khỏe</Button>
                        </Link>
                    </div>
                </div>

                <article className={styles.heroCard}>
                    <span>Trạng thái gần nhất</span>
                    <strong>{latestRequest?.status || 'Sẵn sàng'}</strong>
                    <p>
                        {latestRequest
                            ? `Yêu cầu khám gần nhất: ${latestRequest.desiredDate || 'chưa rõ ngày'
                            } ${latestRequest.desiredTime || ''}`
                            : 'Bạn chưa có yêu cầu đặt lịch mới. Hãy bắt đầu bằng việc chọn chuyên khoa và bác sĩ phù hợp.'}
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
                        Chọn chuyên khoa, bác sĩ và thời gian mong muốn.
                    </div>
                </Link>

                <Link href="/dashboard/patient/profile" className={styles.quickCard}>
                    <div className={styles.quickIcon}>
                        <HeartOutlined />
                    </div>
                    <div className={styles.quickTitle}>Hồ sơ sức khỏe</div>
                    <div className={styles.quickDescription}>
                        Cập nhật nhóm máu, bệnh nền, tiền sử và dị ứng.
                    </div>
                </Link>

                <Link href="/dashboard/patient/medical-records" className={styles.quickCard}>
                    <div className={styles.quickIcon}>
                        <FileProtectOutlined />
                    </div>
                    <div className={styles.quickTitle}>Bệnh án</div>
                    <div className={styles.quickDescription}>
                        Xem lịch sử khám và kết luận từ bác sĩ.
                    </div>
                </Link>

                <Link href="/dashboard/patient/prescriptions" className={styles.quickCard}>
                    <div className={styles.quickIcon}>
                        <MedicineBoxOutlined />
                    </div>
                    <div className={styles.quickTitle}>Đơn thuốc</div>
                    <div className={styles.quickDescription}>
                        Theo dõi thuốc, liều dùng và hướng dẫn điều trị.
                    </div>
                </Link>
            </section>

            <section className={styles.contentGrid}>
                <div>
                    <article className={styles.portalPanel}>
                        <div className={styles.panelHeader}>
                            <div>
                                <span>Care timeline</span>
                                <h2>Hoạt động gần đây</h2>
                                <p>
                                    Các yêu cầu khám, bệnh án và đơn thuốc gần nhất
                                    của bạn.
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
                                    {latestRequest.desiredDate || 'N/A'}{' '}
                                    {latestRequest.desiredTime || ''}
                                </p>
                            </div>
                        ) : (
                            <div className={styles.listCard}>
                                <div className={styles.listTitle}>
                                    <strong>Chưa có yêu cầu đặt lịch</strong>
                                    <Tag color="blue">NEW</Tag>
                                </div>
                                <p className={styles.muted}>
                                    Bạn có thể gửi yêu cầu khám mới để lễ tân xác nhận.
                                </p>
                            </div>
                        )}

                        {latestRecord && (
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
                                        'Không có ghi chú điều trị.'}
                                </p>
                            </div>
                        )}

                        {latestPrescription && (
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
                        )}
                    </article>

                    <article className={styles.portalPanel} style={{ marginTop: 20 }}>
                        <div className={styles.panelHeader}>
                            <div>
                                <span>Notifications</span>
                                <h2>Thông báo mới</h2>
                            </div>

                            <Link href="/dashboard/notifications">
                                <Button>Xem tất cả</Button>
                            </Link>
                        </div>

                        {unreadNotifications.length === 0 ? (
                            <p className={styles.muted}>
                                Bạn chưa có thông báo mới.
                            </p>
                        ) : (
                            unreadNotifications.slice(0, 3).map((item) => (
                                <div key={item.id} className={styles.listCard}>
                                    <div className={styles.listTitle}>
                                        <strong>
                                            <BellOutlined /> {item.title}
                                        </strong>
                                        <Tag color="blue">Mới</Tag>
                                    </div>
                                    <p className={styles.muted}>
                                        {item.message || 'Không có nội dung.'}
                                    </p>
                                </div>
                            ))
                        )}
                    </article>
                </div>

                <div>
                    <article className={styles.portalPanel}>
                        <div className={styles.panelHeader}>
                            <div>
                                <span>Health summary</span>
                                <h2>Tóm tắt sức khỏe</h2>
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
                                <span>Safety profile</span>
                                <h2>Dị ứng cần chú ý</h2>
                            </div>

                            <WarningOutlined style={{ color: '#f59e0b', fontSize: 24 }} />
                        </div>

                        {data.allergies.length === 0 ? (
                            <p className={styles.muted}>
                                Bạn chưa khai báo dị ứng. Ở task sau, trang hồ sơ
                                sức khỏe sẽ cho phép thêm/sửa/xóa dị ứng.
                            </p>
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