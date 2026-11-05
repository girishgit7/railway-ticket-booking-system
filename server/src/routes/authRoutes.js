import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  register,
  login,
  getMe,
} from "../controllers/authController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    message: "Too many login requests. Try again later.",
  },
});

router.post("/register", register);
router.post("/login", loginLimiter, login);
router.get("/me", requireAuth, getMe);

export default router;
