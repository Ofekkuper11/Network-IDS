const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

async function readErrorBody(res) {
  try {
    const data = await res.json();
    if (data && typeof data.error === "string") return data.error;
    return `${res.status} ${res.statusText}`;
  } catch {
    return `${res.status} ${res.statusText}`;
  }
}

export async function getAlerts() {
  const res = await fetch(`${API_BASE_URL}/api/alerts`);
  if (!res.ok) {
    throw new Error(await readErrorBody(res));
  }
  return res.json();
}

export async function getAlertById(id) {
  const res = await fetch(`${API_BASE_URL}/api/alerts/${encodeURIComponent(id)}`);
  if (!res.ok) {
    throw new Error(await readErrorBody(res));
  }
  return res.json();
}

export async function resolveAlert(alertId, resolvedBy = "frontend") {
  const res = await fetch(`${API_BASE_URL}/api/alerts/${encodeURIComponent(alertId)}/resolve`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resolved_by: resolvedBy }),
  });
  if (!res.ok) {
    throw new Error(await readErrorBody(res));
  }
  return res.json();
}

export async function deleteAlert(alertId) {
  const res = await fetch(`${API_BASE_URL}/api/alerts/${encodeURIComponent(alertId)}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    throw new Error(await readErrorBody(res));
  }
  return res.json();
}
