/**
 * Browser notifications for new IDS alerts (high/critical only), with per-source/type throttling.
 *
 * Requires Notification.permission === "granted". Many browsers only grant after a user gesture
 * (click "Enable" in the app banner), not from automatic calls on page load.
 *
 * Notifications only run for alerts whose id was not seen on the previous poll — not for the
 * initial load, and not for rows that were already in the last poll.
 */

const THROTTLE_MS = 60_000;

const lastNotifyAtByKey = new Map();

function throttleKey(alert) {
  const src = alert.source_ip != null ? String(alert.source_ip) : 'unknown';
  const type = alert.type != null ? String(alert.type) : 'unknown';
  return `${src}|${type}`;
}

function isHighOrCritical(severity) {
  const n = Number(severity);
  if (!Number.isFinite(n)) return false;
  return n >= 6;
}

/**
 * Call once (e.g. on mount). Safe to call multiple times; respects existing permission.
 */
export function getNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

export function requestNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return Promise.resolve('denied');
  }
  if (Notification.permission === 'granted' || Notification.permission === 'denied') {
    return Promise.resolve(Notification.permission);
  }
  return Notification.requestPermission();
}

/**
 * Show notifications for alerts that passed the severity + throttle checks.
 */
export function notifyNewAlerts(alerts) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  const now = Date.now();

  for (const alert of alerts) {
    if (!isHighOrCritical(alert.severity)) continue;

    const key = throttleKey(alert);
    const last = lastNotifyAtByKey.get(key) ?? 0;
    if (now - last < THROTTLE_MS) continue;
    lastNotifyAtByKey.set(key, now);

    const sev = Number(alert.severity);
    const band = sev >= 8 ? 'Critical' : 'High';
    const title = `IDS: ${band} alert`;
    const body = [alert.type, alert.source_ip].filter(Boolean).join(' — ') || 'New alert';

    try {
      new Notification(title, {
        body,
        tag: `ids-alert-${alert.id}`,
      });
    } catch {
      /* ignore */
    }
  }
}
