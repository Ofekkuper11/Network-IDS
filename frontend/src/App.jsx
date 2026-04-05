import { useState, useEffect, useRef } from 'react';
import SplashScreen from './components/SplashScreen.jsx';
import IDSHeader from './components/IDSHeader.jsx';
import AlertsFeed from './components/AlertsFeed.jsx';
import StatsPanel from './components/StatsPanel.jsx';
import { LineChart, PieChart, BarChart } from './components/Charts.jsx';
import { getAlerts, resolveAlert, deleteAlert } from './api/alertsApi.js';
import {
  notifyNewAlerts,
  requestNotificationPermission,
  getNotificationPermission,
} from './utils/alertNotifications.js';
import styles from './App.module.css';

function buildChartsFromAlerts(alerts) {
  const now = Date.now();
  const windowMs = 24 * 60 * 60 * 1000;
  const start = now - windowMs;

  const throughput = Array.from({ length: 24 }, (_, i) => {
    const t = start + i * 60 * 60 * 1000;
    return {
      time: new Date(t).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }),
      value: 0,
    };
  });

  for (const a of alerts) {
    const t = new Date(a.timestamp).getTime();
    if (Number.isNaN(t) || t < start || t > now) continue;
    const idx = Math.min(23, Math.floor((t - start) / (60 * 60 * 1000)));
    if (idx >= 0) throughput[idx].value += 1;
  }

  const n = (a) => Number(a.severity);
  const severityDistribution = [
    { name: 'Critical', value: alerts.filter((a) => n(a) >= 8).length },
    { name: 'High', value: alerts.filter((a) => n(a) >= 6 && n(a) <= 7).length },
    { name: 'Medium', value: alerts.filter((a) => n(a) >= 4 && n(a) <= 5).length },
    { name: 'Low', value: alerts.filter((a) => n(a) < 4).length },
  ];

  const byProto = new Map();
  for (const a of alerts) {
    const p = a.protocol != null && String(a.protocol).trim() !== '' ? String(a.protocol) : 'Unknown';
    byProto.set(p, (byProto.get(p) || 0) + 1);
  }
  const protocolBreakdown = [...byProto.entries()].map(([name, value]) => ({ name, value }));

  return { throughput, severityDistribution, protocolBreakdown };
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState([]);
  const [loadState, setLoadState] = useState('loading');
  const [fetchError, setFetchError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [notificationPermission, setNotificationPermission] = useState(() =>
    typeof window !== 'undefined' ? getNotificationPermission() : 'unsupported'
  );
  const hasLoadedOkRef = useRef(false);
  const hasCompletedInitialFetchRef = useRef(false);
  const previousAlertIdsRef = useRef(new Set());

  async function loadAlerts() {
    setFetchError(null);
    if (hasLoadedOkRef.current) {
      setRefreshing(true);
    } else {
      setLoadState('loading');
    }

    try {
      const data = await getAlerts();
      const list = Array.isArray(data) ? data : [];

      if (hasCompletedInitialFetchRef.current) {
        const prevIds = previousAlertIdsRef.current;
        const newlyArrived = list.filter((a) => !prevIds.has(String(a.id)));
        notifyNewAlerts(newlyArrived);
      }

      previousAlertIdsRef.current = new Set(list.map((a) => String(a.id)));
      hasCompletedInitialFetchRef.current = true;

      setAlerts(list);
      setLoadState('ok');
      hasLoadedOkRef.current = true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setFetchError(msg);
      setLoadState('error');
      if (!hasLoadedOkRef.current) {
        setAlerts([]);
      }
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    const t = window.setTimeout(() => setLoading(false), 3000);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (loading) return;
    void loadAlerts();
  }, [loading]);

  useEffect(() => {
    setNotificationPermission(getNotificationPermission());
  }, []);

  const handleEnableNotifications = async () => {
    const p = await requestNotificationPermission();
    setNotificationPermission(p);
  };

  const chartData = buildChartsFromAlerts(alerts);

  const n = (a) => Number(a.severity);
  const stats = {
    totalAlerts: alerts.length,
    criticalAlerts: alerts.filter((a) => n(a) >= 8).length,
    highAlerts: alerts.filter((a) => n(a) >= 6 && n(a) <= 7).length,
    mediumAlerts: alerts.filter((a) => n(a) >= 4 && n(a) <= 5).length,
    lowAlerts: alerts.filter((a) => n(a) < 4).length,
    unresolvedAlerts: alerts.filter((a) => !a.resolved).length,
  };

  const handleResolve = async (alertId) => {
    try {
      setActionError(null);
      const updated = await resolveAlert(alertId, 'frontend');
      setAlerts((prev) => prev.map((a) => (a.id == updated.id ? updated : a)));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setActionError(`Resolve failed: ${msg}`);
    }
  };

  const handleDelete = async (alertId) => {
    try {
      setActionError(null);
      const deleted = await deleteAlert(alertId);
      const deletedId = deleted?.id;
      setAlerts((prev) => prev.filter((a) => a.id != deletedId));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setActionError(`Delete failed: ${msg}`);
    }
  };

  const apiStatus = fetchError || loadState === 'error' ? 'degraded' : 'ok';

  const showNotifHint =
    notificationPermission === 'default' ||
    notificationPermission === 'denied' ||
    notificationPermission === 'unsupported';

  if (loading) {
    return <SplashScreen />;
  }

  return (
    <div className={`${styles.dashboard} ${styles.dashboardEnter}`}>
      <IDSHeader stats={stats} apiStatus={apiStatus} />

      {showNotifHint && notificationPermission !== 'unsupported' && (
        <div className={styles.notificationBanner} role="status">
          {notificationPermission === 'denied' ? (
            <span>
              Browser notifications are blocked. Allow them for this site (address bar → site settings /
              lock icon) to get high/critical alert pop-ups.
            </span>
          ) : (
            <>
              <span>
                High/critical alerts only notify after you allow desktop notifications, and only when a{' '}
                <strong>new</strong> alert row appears on a later refresh (not the first load).
              </span>
              <button type="button" className={styles.notificationEnableBtn} onClick={handleEnableNotifications}>
                Enable notifications
              </button>
            </>
          )}
        </div>
      )}

      <div className={styles.container}>
        <div className={styles.mainContent}>
          <AlertsFeed
            alerts={alerts}
            loadState={loadState}
            fetchError={fetchError}
            onRefresh={loadAlerts}
            refreshing={refreshing}
            actionError={actionError}
            onDismissActionError={() => setActionError(null)}
            onResolve={handleResolve}
            onDelete={handleDelete}
          />
          <StatsPanel stats={stats} alerts={alerts} />
        </div>

        <div className={styles.charts}>
          {alerts.length > 0 && chartData.throughput.length > 0 && (
            <LineChart data={chartData.throughput} title="Alerts per hour (last 24h)" />
          )}
          {alerts.length > 0 && chartData.severityDistribution.length > 0 && (
            <PieChart data={chartData.severityDistribution} title="Alerts by severity (from DB)" />
          )}
          {alerts.length > 0 && chartData.protocolBreakdown.length > 0 && (
            <BarChart data={chartData.protocolBreakdown} title="Protocol distribution (from DB)" />
          )}
        </div>
      </div>
    </div>
  );
}
