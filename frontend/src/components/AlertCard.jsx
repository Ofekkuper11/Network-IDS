import { useState } from 'react';
import { getSeverityColor, formatTime, severityBand, severityLabel } from '../utils/ids-types.js';
import styles from './AlertCard.module.css';

function fmtIp(value) {
  if (value == null || value === '') return '—';
  return String(value);
}

export default function AlertCard({ alert, onResolve, onDelete }) {
  const [showDetails, setShowDetails] = useState(false);

  const band = severityBand(alert.severity);
  const bytesExtra =
    alert.details && typeof alert.details === 'object' && typeof alert.details.bytes === 'number'
      ? alert.details.bytes
      : null;

  return (
    <div
      className={`${styles.card} alert-enter`}
      style={{ borderLeftColor: getSeverityColor(alert.severity) }}
    >
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h3 className={styles.title}>{alert.type}</h3>
          <span
            className={styles.severityBadge}
            style={{
              backgroundColor: `${getSeverityColor(alert.severity)}20`,
              color: getSeverityColor(alert.severity),
            }}
          >
            {severityLabel(alert.severity)} · {band.toUpperCase()}
          </span>
        </div>
        <div className={styles.actions}>
          <button className={styles.btn} onClick={() => setShowDetails(!showDetails)}>
            {showDetails ? 'Hide' : 'Show'}
          </button>
          <button
            className={styles.btn}
            onClick={() => onResolve(alert.id)}
            title="Resolve alert"
            disabled={alert.resolved}
          >
            Resolve
          </button>
          <button className={styles.btn} onClick={() => onDelete(alert.id)} title="Delete alert">
            Delete
          </button>
        </div>
      </div>

      <div className={styles.meta}>
        <span className={styles.time}>{formatTime(alert.timestamp)}</span>
        <span className={styles.pipe}>|</span>
        <span className={styles.ip}>{fmtIp(alert.source_ip)}</span>
        <span className={styles.pipe}>-&gt;</span>
        <span className={styles.ip}>{fmtIp(alert.destination_ip)}</span>
        <span className={styles.pipe}>|</span>
        <span className={styles.protocol}>{alert.protocol ?? '—'}</span>
      </div>

      {showDetails && (
        <div className={styles.details}>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Description:</span>
            <span>{alert.description ?? '—'}</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Source:</span>
            <span className={styles.mono}>
              {fmtIp(alert.source_ip)}:{alert.source_port ?? '—'}
            </span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Destination:</span>
            <span className={styles.mono}>
              {fmtIp(alert.destination_ip)}:{alert.destination_port ?? '—'}
            </span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Packet count:</span>
            <span className={styles.mono}>{Number(alert.packet_count ?? 0).toLocaleString()}</span>
          </div>
          {bytesExtra != null && (
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Bytes (details):</span>
              <span className={styles.mono}>{bytesExtra.toLocaleString()}</span>
            </div>
          )}
          {alert.details != null && (
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>details (JSONB):</span>
              <pre className={styles.monoPre}>
                {typeof alert.details === 'string'
                  ? alert.details
                  : JSON.stringify(alert.details, null, 2)}
              </pre>
            </div>
          )}
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Status:</span>
            <span style={{ color: alert.resolved ? 'var(--accent-cyan)' : 'var(--severity-critical)' }}>
              {alert.resolved ? 'RESOLVED' : 'UNRESOLVED'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
