import { FileSearchOutlined } from '@ant-design/icons';
import styles from '../dashboard.module.scss';

export default function ClinicalEmptyState({
    title,
    description,
}: {
    title: string;
    description: string;
}) {
    return (
        <div className={styles.emptyState}>
            <FileSearchOutlined />
            <h3>{title}</h3>
            <p>{description}</p>
        </div>
    );
}