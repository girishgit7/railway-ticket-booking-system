import { Router } from "express";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { getAdminOverview, listUsers, changeUserRole, listTrains, createTrain, updateTrain, createSchedule, listBookings, listAuditLogs } from "../controllers/adminController.js";

const router = Router();
router.use(requireAuth, requireAdmin);
router.get("/overview", getAdminOverview);
router.get("/users", listUsers);
router.patch("/users/:id/role", changeUserRole);
router.get("/trains", listTrains);
router.post("/trains", createTrain);
router.patch("/trains/:id", updateTrain);
router.post("/schedules", createSchedule);
router.get("/bookings", listBookings);
router.get("/audit", listAuditLogs);
export default router;
