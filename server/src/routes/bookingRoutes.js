
import { Router } from "express";
import {
  createBooking,
  getMyBookings,
  getBookingByPNR,
  getTicketById,
  cancelBooking,
} from "../controllers/bookingController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.post("/", requireAuth, createBooking);
router.get("/my", requireAuth, getMyBookings);
router.get("/pnr/:pnr", requireAuth, getBookingByPNR);
router.get("/:id/ticket", requireAuth, getTicketById);
router.post("/:id/cancel", requireAuth, cancelBooking);

export default router;
