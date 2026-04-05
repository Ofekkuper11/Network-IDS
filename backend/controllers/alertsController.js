import {
  getAllAlerts,
  getAlertById,
  createAlert,
  resolveAlert,
  deleteAlert,
} from "../models/alertsModel.js"
import { runPortScanToSynFloodCorrelation } from "../services/alertCorrelation.js"

export async function fetchAlerts(req, res) {
  try {
    const alerts = await getAllAlerts()
    res.status(200).json(alerts)
  } catch (error) {
    console.error("Error fetching alerts:", error)
    res.status(500).json({ error: "Failed to fetch alerts" })
  }
}

export async function fetchAlertById(req, res) {
  try {
    const { id } = req.params
    const alert = await getAlertById(id)

    if (!alert) {
      return res.status(404).json({ error: "Alert not found" })
    }

    res.status(200).json(alert)
  } catch (error) {
    console.error("Error fetching alert by id:", error)
    res.status(500).json({ error: "Failed to fetch alert" })
  }
}

export async function addAlert(req, res) {
  try {
    const {
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
    } = req.body

    if (!type || severity === undefined || !source_ip) {
      return res.status(400).json({
        error: "type, severity, and source_ip are required",
      })
    }

    const newAlert = await createAlert({
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
    })

    try {
      await runPortScanToSynFloodCorrelation(newAlert)
    } catch (corrErr) {
      console.error("Event correlation error:", corrErr)
    }

    res.status(201).json(newAlert)
  } catch (error) {
    console.error("Error creating alert:", error)
    res.status(500).json({ error: "Failed to create alert" })
  }
}

export async function resolveAlertById(req, res) {
  try {
    const { id } = req.params
    const { resolved_by } = req.body ?? {}

    const updated = await resolveAlert(id, resolved_by ?? "frontend")
    if (!updated) {
      return res.status(404).json({ error: "Alert not found" })
    }

    res.status(200).json(updated)
  } catch (error) {
    console.error("Error resolving alert:", error)
    res.status(500).json({ error: "Failed to resolve alert" })
  }
}

export async function deleteAlertById(req, res) {
  try {
    const { id } = req.params

    const deleted = await deleteAlert(id)
    if (!deleted) {
      return res.status(404).json({ error: "Alert not found" })
    }

    res.status(200).json(deleted)
  } catch (error) {
    console.error("Error deleting alert:", error)
    res.status(500).json({ error: "Failed to delete alert" })
  }
}