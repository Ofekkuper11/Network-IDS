import express from "express"
import {
  fetchAlerts,
  fetchAlertById,
  addAlert,
  resolveAlertById,
  deleteAlertById,
} from "../controllers/alertsController.js"

const router = express.Router()

router.get("/", fetchAlerts)
router.get("/:id", fetchAlertById)
router.post("/", addAlert)
router.patch("/:id/resolve", resolveAlertById)
router.delete("/:id", deleteAlertById)

export default router