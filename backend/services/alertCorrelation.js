import pool from "../config/db.js"
import { createAlert } from "../models/alertsModel.js"

const TYPE_PORT_SCAN = "Port Scan"
const TYPE_SYN_FLOOD = "SYN Flood"
const TYPE_COORDINATED = "Coordinated Attack"
const WINDOW_SECONDS = 30

/**
 * After a SYN Flood alert is stored, see if the same source_ip had a Port Scan
 * within WINDOW_SECONDS before this alert. If so, insert one correlated row.
 * Idempotent per SYN Flood alert id (no duplicate Coordinated Attack for same current_alert_id).
 */
export async function runPortScanToSynFloodCorrelation(synAlert) {
  if (synAlert?.type !== TYPE_SYN_FLOOD) {
    return null
  }

  const synId = synAlert.id
  const sourceIp = synAlert.source_ip
  const tsSyn = synAlert.timestamp

  const dup = await pool.query(
    `SELECT 1 FROM alerts
     WHERE type = $1
       AND (details->>'current_alert_id') = $2
     LIMIT 1`,
    [TYPE_COORDINATED, String(synId)]
  )
  if (dup.rows.length > 0) {
    return null
  }

  const prev = await pool.query(
    `SELECT id FROM alerts
     WHERE type = $1
       AND source_ip = $2
       AND id <> $3
       AND timestamp < $4
       AND ($4 - timestamp) <= interval '30 seconds'
     ORDER BY timestamp DESC
     LIMIT 1`,
    [TYPE_PORT_SCAN, sourceIp, synId, tsSyn]
  )

  if (prev.rows.length === 0) {
    return null
  }

  const previousAlertId = prev.rows[0].id

  const details = {
    previous_alert_id: previousAlertId,
    current_alert_id: synId,
    correlation_window_seconds: WINDOW_SECONDS,
    source_ip: String(sourceIp),
  }

  return createAlert({
    type: TYPE_COORDINATED,
    severity: 10,
    source_ip: sourceIp,
    destination_ip: synAlert.destination_ip ?? null,
    source_port: null,
    destination_port: null,
    protocol: "TCP",
    description:
      "Correlated attack detected: Port Scan followed by SYN Flood from the same source IP",
    details,
    packet_count: 1,
    resolved: false,
  })
}
