'use client';

import styles from './page.module.scss';
import { Button, DatePicker } from 'antd';

export default function Home() {
  return (
    <main className={styles.main}>
      <h1 className={styles.title}>Xin chào dự án!</h1>
      <p>Đây là component Ant Design:</p>
      <Button type="primary">Bấm vào tôi</Button>
      <div style={{ marginTop: 20 }}>
        <DatePicker />
      </div>
    </main>
  );
}