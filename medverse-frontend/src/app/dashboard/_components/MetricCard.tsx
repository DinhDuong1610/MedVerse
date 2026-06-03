import type { ReactNode } from 'react';
import styles from '../dashboard.module.scss';

type Props = {
    label: string;
    value: string | number;
    caption?: string;
    icon?: ReactNode;
};

export default function MetricCard({ label, value, caption, icon }: Props) {
    return (
        <article className={styles.metricCard}>
            <div className={styles.metricIcon}>{icon}</div>
            <span>{label}</span>
            <strong>{value}</strong>
            {caption && <p>{caption}</p>}
        </article>
    );
}