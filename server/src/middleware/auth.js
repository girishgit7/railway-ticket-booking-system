import jwt from "jsonwebtoken";
import User from "../models/User.js";

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization;

    if (!header?.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const token = header.slice("Bearer ".length);
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      return res.status(500).json({
        message: "Authentication is not configured",
      });
    }

    const payload = jwt.verify(token, secret);

    const user = await User.findById(payload.sub);

    if (!user) {
      return res.status(401).json({
        message: "Account no longer exists",
      });
    }

    req.user = user;
    next();
  } catch {
    return res.status(401).json({
      message: "Invalid or expired authentication token",
    });
  }
}

export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({
      message: "Administrator access required",
    });
  }

  next();
}
