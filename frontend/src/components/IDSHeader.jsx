import { useState, useEffect } from 'react';
import styles from './IDSHeader.module.css';

const HEADER_TITLE = 'Network IDS';

export default function IDSHeader({ stats, apiStatus = 'ok' }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <div className={styles.left}>
          <h1 className={styles.glitchContainer}>
            {HEADER_TITLE}
          </h1>
          <div
            className={`${styles.statusBadge} ${apiStatus === 'degraded' ? styles.statusBadgeWarn : ''}`}
            title={apiStatus === 'degraded' ? 'Backend or database unreachable' : 'API reachable'}
          >
            <span className={apiStatus === 'degraded' ? styles.pulseDotWarn : styles.pulseDot}></span>
            <span>{apiStatus === 'degraded' ? 'API ERROR' : 'ACTIVE'}</span>
          </div>
        </div>

        <div className={styles.center}>
          <div className={styles.clock}>
            {time.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: false,
            })}
          </div>
        </div>

        <div className={styles.right}>
          <div className={styles.statItem}>
            <span className={styles.label}>Critical</span>
            <span className={styles.valueCritical}>{stats.criticalAlerts}</span>
          </div>
          <div className={styles.divider}></div>
          <div className={styles.statItem}>
            <span className={styles.label}>High</span>
            <span className={styles.valueHigh}>{stats.highAlerts}</span>
          </div>
          <div className={styles.divider}></div>
          <div className={styles.statItem}>
            <span className={styles.label}>Total</span>
            <span className={styles.valueTotal}>{stats.totalAlerts}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
