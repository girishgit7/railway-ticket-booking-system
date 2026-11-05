import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import AuditLog from "../models/AuditLog.js";

const LOCK_DURATION_MS = 15 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 3;


function createToken(user) {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.trim().length < 32) {
    throw new Error("Set a strong JWT_SECRET in server/.env");
  }

  return jwt.sign(
    { role: user.role },
    secret,
    {
      subject: user._id.toString(),
      expiresIn: "2h",
    }
  );
}


async function writeAudit(action, actor = null, metadata = {}) {
  try {
    await AuditLog.create({
      actor,
      action,
      targetType: "User",
      targetId: actor ? actor.toString() : null,
      metadata,
    });
  } catch (error) {
    console.error("Audit log write failed:", error.message);
  }
}

function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

export async function register(req, res) {
  try {
    const { name, email, password } = req.body ?? {};

    if (
      typeof name !== "string" ||
      name.trim().length < 2 ||
      name.trim().length > 80
    ) {
      return res.status(400).json({
        message: "Name must contain between 2 and 80 characters",
      });
    }

    if (
      typeof email !== "string" ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
      email.trim().length > 254
    ) {
      return res.status(400).json({ message: "Enter a valid email address" });
    }

    if (
      typeof password !== "string" ||
      password.length < 10 ||
      password.length > 72
    ) {
      return res.status(400).json({
        message: "Password must be between 10 and 72 characters",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(409).json({
        message: "An account with this email already exists",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Public registration must never allow a user to choose "admin".
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      role: "passenger",
    });

    await writeAudit("USER_REGISTERED", user._id);

    return res.status(201).json({
      message: "Registration successful",
      user: publicUser(user),
      token: createToken(user),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "An account with this email already exists",
      });
    }

    console.error("Registration error:", error.message);
    return res.status(500).json({ message: "Registration failed" });
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body ?? {};

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      email.length > 254 ||
      password.length > 72
    ) {
      return res.status(400).json({
        message: "Enter a valid email and password",
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    }).select("+passwordHash");

    if (!user) {
      await writeAudit("LOGIN_FAILED", null, {
        reason: "invalid_credentials",
      });

      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const now = new Date();

    if (user.lockedUntil && user.lockedUntil > now) {
      return res.status(423).json({
        message: "Account temporarily locked. Try again later.",
        lockedUntil: user.lockedUntil,
      });
    }

    // Expired lockouts reset the consecutive-failure counter.
    if (user.lockedUntil && user.lockedUntil <= now) {
      user.failedLoginAttempts = 0;
      user.lockedUntil = null;
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.passwordHash
    );

    if (!passwordMatches) {
      user.failedLoginAttempts += 1;

      if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
        user.lockedUntil = new Date(Date.now() + LOCK_DURATION_MS);
      }

      await user.save();

      await writeAudit("LOGIN_FAILED", user._id, {
        attempts: user.failedLoginAttempts,
        locked: Boolean(user.lockedUntil),
      });

      if (user.lockedUntil) {
        return res.status(423).json({
          message: "Three failed attempts. Account locked for 15 minutes.",
          lockedUntil: user.lockedUntil,
        });
      }

      return res.status(401).json({
        message: "Invalid email or password",
        attemptsRemaining:
          MAX_FAILED_ATTEMPTS - user.failedLoginAttempts,
      });
    }

    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
    await user.save();

    const token = createToken(user);

    await writeAudit("LOGIN_SUCCESS", user._id);

    return res.json({
      message: "Login successful",
      user: publicUser(user),
      token,
    });
  } catch (error) {
    console.error("Login error:", error.message);
    return res.status(500).json({ message: "Login failed" });
  }
}

export async function getMe(req, res) {
  return res.json({ user: publicUser(req.user) });
}
