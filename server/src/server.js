import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import mongoose from "mongoose";
import rateLimit from "express-rate-limit";

import { connectDB } from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import trainRoutes from "./routes/trainRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import engineRoutes from "./routes/engineRoutes.js";
import liveRoutes from "./routes/liveRoutes.js";

const app = express();
app.disable("x-powered-by");

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Too many requests. Please try again later." },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Too many authentication attempts. Please wait before trying again." },
});

// Security and request configuration
app.use(helmet());

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
  })
);

app.use(express.json({ limit: "20kb" }));
app.use("/api", apiLimiter);
app.use("/api/auth", authLimiter);

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "railway-reservation-api",
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/trains", trainRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/engine", engineRoutes);
app.use("/api/live", liveRoutes);

// Handle unknown endpoints
app.use((req, res) => {
  res.status(404).json({
    message: "API endpoint not found",
  });
});

// Central error handler
app.use((err, req, res, next) => {
  console.error("Unhandled server error:", err);

  if (res.headersSent) {
    return next(err);
  }

  res.status(err.status || 500).json({
    message: err.status && err.status < 500 ? err.message : (err.status === 503 || err.status === 429 ? err.message : "Internal server error"),
    ...(err.providerCode ? { providerCode: err.providerCode } : {}),
  });
});

// Start server only after connecting to MongoDB
const PORT = Number(process.env.PORT || 5000);

async function startServer() {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`API running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
}

startServer();
