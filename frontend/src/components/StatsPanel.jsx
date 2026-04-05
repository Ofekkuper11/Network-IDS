import { IMPLEMENTED_ATTACK_TYPES } from '../constants/attackTypes.js';
import { formatDateTime24 } from '../utils/ids-types.js';
import styles from './StatsPanel.module.css';

function fmtIp(value) {
  if (value == null || value === '') return '—';
  return String(value);
}

export default function StatsPanel({ stats, alerts = [] }) {
  const statCards = [
    { label: 'Total Alerts', value: stats.totalAlerts, color: 'cyan', format: (v) => v.toLocaleString() },
    { label: 'Critical', value: stats.criticalAlerts, color: 'critical', format: (v) => v.toLocaleString() },
    { label: 'High', value: stats.highAlerts, color: 'high', format: (v) => v.toLocaleString() },
    { label: 'Medium', value: stats.mediumAlerts, color: 'medium', format: (v) => v.toLocaleString() },
    { label: 'Unresolved', value: stats.unresolvedAlerts, color: 'blue', format: (v) => v.toLocaleString() },
  ];

  let latestAlert = null;
  if (alerts.length > 0) {
    latestAlert = [...alerts].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
  }

  const counts = new Map();
  for (const a of alerts) {
    const ip = a.source_ip != null && String(a.source_ip).trim() !== '' ? String(a.source_ip) : 'Unknown';
    counts.set(ip, (counts.get(ip) || 0) + 1);
  }
  const topSources = [...counts.entries()]
    .sort((x, y) => y[1] - x[1])
    .slice(0, 3);

  const tallies = Object.fromEntries(IMPLEMENTED_ATTACK_TYPES.map((t) => [t, 0]));
  for (const a of alerts) {
    if (a.type != null && Object.prototype.hasOwnProperty.call(tallies, a.type)) {
      tallies[a.type] += 1;
    }
  }
  const alertsByType = IMPLEMENTED_ATTACK_TYPES.map((type) => ({ type, count: tallies[type] }));

  return (
    <div className={styles.panel}>
      <h2 className={styles.title}>Statistics</h2>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Detection overview</h3>
        <div className={styles.cards}>
          {statCards.map((card) => (
            <div key={card.label} className={`${styles.card} ${styles[card.color]}`}>
              <p className={styles.cardLabel}>{card.label}</p>
              <p className={styles.cardValue}>{card.format(card.value)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Recent activity</h3>
        <div className={styles.detailCard}>
          {latestAlert ? (
            <>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Last alert type</span>
                <span className={styles.detailValue}>{latestAlert.type ?? '—'}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Last alert time</span>
                <span className={styles.detailValueMono}>{formatDateTime24(latestAlert.timestamp)}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Last source IP</span>
                <span className={styles.detailValueMono}>{fmtIp(latestAlert.source_ip)}</span>
              </div>
            </>
          ) : (
            <p className={styles.emptyHint}>No alerts loaded yet.</p>
          )}
        </div>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Top sources</h3>
        <div className={styles.detailCard}>
          {topSources.length > 0 ? (
            <ul className={styles.sourceList}>
              {topSources.map(([ip, count]) => (
                <li key={ip} className={styles.sourceRow}>
                  <span className={styles.detailValueMono}>{ip}</span>
                  <span className={styles.sourceArrow}>→</span>
                  <span className={styles.sourceCount}>{count} alerts</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.emptyHint}>No source data yet.</p>
          )}
        </div>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Alerts by type</h3>
        <div className={styles.detailCard}>
          <ul className={styles.typeList}>
            {alertsByType.map(({ type, count }) => (
              <li key={type} className={styles.typeRow}>
                <span className={styles.typeName}>{type}</span>
                <span className={styles.typeCount}>{count}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
