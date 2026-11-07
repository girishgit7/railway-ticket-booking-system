import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { connectDB } from "../config/db.js";
import User from "../models/User.js";

// Run deliberately with ADMIN_EMAIL and ADMIN_PASSWORD set in server/.env.
// If the email already exists, this promotes that account after verifying ADMIN_PASSWORD against the existing account.
async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME?.trim() || "Railway Administrator";
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Set a valid ADMIN_EMAIL in server/.env");
  if (!password || password.length < 14 || password.length > 72) throw new Error("Set ADMIN_PASSWORD to a unique password of 14–72 characters in server/.env");
  await connectDB();
  let user = await User.findOne({ email }).select("+passwordHash");
  if (user) {
    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) throw new Error("The existing account password does not match ADMIN_PASSWORD. No role was changed.");
    user.role = "admin";
    await user.save();
    console.log(`Existing account ${email} has been granted admin access. Its password was not changed.`);
  } else {
    const passwordHash = await bcrypt.hash(password, 12);
    user = await User.create({ name, email, passwordHash, role: "admin" });
    console.log(`Initial administrator account created for ${email}.`);
  }
}

seedAdmin().catch((error) => { console.error("Admin setup failed:", error.message); process.exitCode = 1; }).finally(async () => { await mongoose.disconnect(); });
