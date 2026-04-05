export const SEVERITY_COLORS = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#eab308",
  low: "#3b82f6",
};

/** Maps DB severity 1–10 to a band for colors and filters. */
export function severityBand(severity) {
  const n = Number(severity);
  if (!Number.isFinite(n)) return "low";
  if (n >= 9) return "critical";
  if (n >= 7) return "high";
  if (n >= 4) return "medium";
  return "low";
}

export function getSeverityColor(severity) {
  return SEVERITY_COLORS[severityBand(severity)] || SEVERITY_COLORS.low;
}

export function severityLabel(severity) {
  const n = Number(severity);
  if (!Number.isFinite(n)) return "?";
  return String(n);
}

const time24Opts = {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
};

export function formatTime(date) {
  return new Date(date).toLocaleTimeString([], time24Opts);
}

/** Date + time for dashboards (24-hour). */
export function formatDateTime24(date) {
  if (date == null || date === "") return "—";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
    ...time24Opts,
  });
}

export function formatDate(date) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
