import pool from "../config/db.js"

export async function getAllAlerts() {
  const query = `
    SELECT *
    FROM alerts
    ORDER BY timestamp DESC
  `

  const result = await pool.query(query)
  return result.rows
}

export async function getAlertById(id) {
  const query = `
    SELECT *
    FROM alerts
    WHERE id = $1
  `

  const result = await pool.query(query, [id])
  return result.rows[0]
}

export async function createAlert(alertData) {
  const {
    type,
    severity,
    source_ip,
    destination_ip = null,
    source_port = null,
    destination_port = null,
    protocol = null,
    details = null,
    packet_count = 1,
    description = null,
    resolved = false,
  } = alertData

  const query = `
    INSERT INTO alerts (
      type,
      severity,
      source_ip,
      destination_ip,
      source_port,
      destination_port,
      protocol,
      details,
      packet_count,
      description,
      resolved
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    RETURNING *
  `

  const values = [
    type,
    severity,
    source_ip,
    destination_ip,
    source_port,
    destination_port,
    protocol,
    details,
    packet_count,
    description,
    resolved,
  ]

  const result = await pool.query(query, values)
  return result.rows[0]
}

export async function resolveAlert(id, resolved_by = null) {
  const query = `
    UPDATE alerts
    SET resolved = TRUE,
        resolved_at = NOW(),
        resolved_by = COALESCE($2, resolved_by)
    WHERE id = $1
    RETURNING *
  `

  const result = await pool.query(query, [id, resolved_by])
  return result.rows[0] ?? null
}

export async function deleteAlert(id) {
  const query = `
    DELETE FROM alerts
    WHERE id = $1
    RETURNING *
  `

  const result = await pool.query(query, [id])
  return result.rows[0] ?? null
}