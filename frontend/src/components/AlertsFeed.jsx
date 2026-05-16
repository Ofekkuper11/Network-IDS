import { useState, useRef, useEffect } from 'react';
import AlertCard from './AlertCard.jsx';
import { severityBand } from '../utils/ids-types.js';
import { IMPLEMENTED_ATTACK_TYPES } from '../constants/attackTypes.js';
import styles from './AlertsFeed.module.css';

const FILTERS = [
  'All',
  'Critical',
  'High',
  'Medium',
  'Low',
  'Unresolved',
  ...IMPLEMENTED_ATTACK_TYPES,
];

export default function AlertsFeed({
  alerts,
  loadState,
  fetchError,
  onRefresh,
  refreshing,
  actionError,
  onDismissActionError,
  onResolve,
  onDelete,
}) {
  const [filter, setFilter] = useState('All');
  const feedRef = useRef(null);

  const filteredAlerts = alerts.filter((alert) => {
    if (filter === 'All') return true;
    if (filter === 'Unresolved') return !alert.resolved;
    if (['Critical', 'High', 'Medium', 'Low'].includes(filter)) {
      return severityBand(alert.severity) === filter.toLowerCase();
    }
    return alert.type === filter;
  });

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = 0;
    }
  }, [alerts.length]);

  useEffect(() => {
    if (!onRefresh) return;

    const intervalId = setInterval(() => {
      onRefresh();
    }, 5000);

    return () => clearInterval(intervalId);
  }, [onRefresh]);

  const showInitialLoading = loadState === 'loading' && alerts.length === 0;
  const showFatalError = loadState === 'error' && alerts.length === 0;
  const showEmptyDb = loadState === 'ok' && alerts.length === 0;

  return (
    <div className={styles.container}>
      {fetchError && alerts.length > 0 && (
        <div className={styles.warnBanner} role="status">
          <span>Could not refresh alerts: {fetchError}</span>
          <button type="button" className={`${styles.filterBtn} ${styles.inlineRetry}`} onClick={onRefresh} disabled={refreshing}>
            Retry
          </button>
        </div>
      )}

      {actionError && (
        <div className={styles.actionErrorBanner} role="alert">
          <span>{actionError}</span>
          {onDismissActionError && (
            <button type="button" className={styles.dismissBtn} onClick={onDismissActionError}>
              Dismiss
            </button>
          )}
        </div>
      )}

      <div className={styles.filterBar}>
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            className={`${styles.filterBtn} ${filter === f ? styles.active : ''}`}
            onClick={() => setFilter(f)}
            disabled={showInitialLoading || showFatalError}
          >
            {f}
          </button>
        ))}
        <button
          type="button"
          className={`${styles.filterBtn} ${styles.toolbarRefresh}`}
          onClick={onRefresh}
          disabled={refreshing || showInitialLoading}
        >
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      <div className={styles.counters}>
        <span className={styles.counter}>
          Showing <strong>{filteredAlerts.length}</strong> of <strong>{alerts.length}</strong> alerts
          {refreshing ? <span className={styles.refreshingHint}> · updating…</span> : null}
        </span>
        <span className={styles.unresolved}>
          <span className={styles.unresolvedDot}></span>
          {alerts.filter((a) => !a.resolved).length} Unresolved
        </span>
      </div>

      <div className={styles.feed} ref={feedRef}>
        {showInitialLoading && (
          <div className={styles.stateMessage}>
            <p>Loading alerts…</p>
          </div>
        )}

        {showFatalError && (
          <div className={styles.stateMessageError} role="alert">
            <p className={styles.errorTitle}>Could not load alerts</p>
            <p className={styles.errorDetail}>{fetchError}</p>
            <button type="button" className={styles.retryPrimary} onClick={onRefresh} disabled={refreshing}>
              Retry
            </button>
          </div>
        )}

        {showEmptyDb && (
          <div className={styles.stateMessage}>
            <p>No alerts in the database yet.</p>
            <p className={styles.hint}>Insert rows into the `alerts` table or use POST /api/alerts, then refresh.</p>
          </div>
        )}

        {!showInitialLoading && !showFatalError && !showEmptyDb && filteredAlerts.length === 0 && (
          <div className={styles.empty}>
            <p>No alerts match the selected filter</p>
          </div>
        )}

        {!showInitialLoading &&
          !showFatalError &&
          !showEmptyDb &&
          filteredAlerts.map((alert) => (
            <AlertCard key={alert.id} alert={alert} onResolve={onResolve} onDelete={onDelete} />
          ))}
      </div>
    </div>
  );
}