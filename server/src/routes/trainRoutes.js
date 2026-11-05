import { Router } from "express";
import {
  searchTrains,
  getTrainDetails,
} from "../controllers/trainController.js";

const router = Router();

// Keep /search before /:id.
router.get("/search", searchTrains);
router.get("/:id", getTrainDetails);

export default router;
