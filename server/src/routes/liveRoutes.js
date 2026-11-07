import { Router } from "express";
import { searchStations, liveTrainStatus, liveTrainSchedule, trainsBetweenStations, liveSeatAvailability } from "../controllers/liveController.js";
const router = Router();
router.get("/stations/search", searchStations);
router.get("/trains/between", trainsBetweenStations);
router.get("/trains/:number/seats", liveSeatAvailability);
router.get("/trains/:number/live", liveTrainStatus);
router.get("/trains/:number/schedule", liveTrainSchedule);
export default router;
