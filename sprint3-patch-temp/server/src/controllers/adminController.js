import mongoose from "mongoose";
import bcrypt from "bcrypt";
import User from "../models/User.js";
import Train from "../models/Train.js";
import Schedule from "../models/Schedule.js";
import Booking from "../models/Booking.js";
import AuditLog from "../models/AuditLog.js";

const CLASS_NAMES = ["GENERAL", "SLEEPER", "AC3", "AC2", "FIRST_AC"];
const isText = (v, max = 100) => typeof v === "string" && v.trim().length > 0 && v.trim().length <= max;
const validTime = (v) => typeof v === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);

async function audit(actor, action, targetType, targetId, metadata = {}) {
  await AuditLog.create({ actor, action, targetType, targetId: String(targetId ?? ""), metadata });
}

export async function getAdminOverview(req, res) {
  const [users, trains, schedules, bookings] = await Promise.all([
    User.countDocuments(), Train.countDocuments({ active: true }),
    Schedule.countDocuments({ active: true }), Booking.countDocuments(),
  ]);
  res.json({ users, activeTrains: trains, activeSchedules: schedules, bookings });
}

export async function listUsers(req, res) {
  const users = await User.find().select("name email role createdAt").sort({ createdAt: -1 }).limit(500).lean();
  res.json({ users });
}

export async function changeUserRole(req, res) {
  const { id } = req.params;
  const { role } = req.body ?? {};
  if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: "Invalid user ID." });
  if (!["passenger", "admin"].includes(role)) return res.status(400).json({ message: "Role must be passenger or admin." });
  if (String(req.user._id) === id && role !== "admin") return res.status(400).json({ message: "You cannot remove your own administrator role." });
  const user = await User.findByIdAndUpdate(id, { $set: { role } }, { new: true, runValidators: true }).select("name email role");
  if (!user) return res.status(404).json({ message: "User not found." });
  await audit(req.user._id, "USER_ROLE_CHANGED", "User", id, { role });
  res.json({ user });
}

export async function listTrains(req, res) {
  const trains = await Train.find().sort({ trainNumber: 1 }).lean();
  res.json({ trains });
}

export async function createTrain(req, res) {
  const { trainNumber, name, source, destination, stops = [] } = req.body ?? {};
  if (![trainNumber, name, source, destination].every((v) => isText(v, 100))) return res.status(400).json({ message: "Train number, name, source and destination are required." });
  if (source.trim().toLowerCase() === destination.trim().toLowerCase()) return res.status(400).json({ message: "Source and destination must differ." });
  if (!Array.isArray(stops) || stops.some((s) => !isText(s, 100))) return res.status(400).json({ message: "Stops must be an array of valid station names." });
  try {
    const train = await Train.create({ trainNumber: trainNumber.trim(), name: name.trim(), source: source.trim(), destination: destination.trim(), stops: stops.map((s) => s.trim()) });
    await audit(req.user._id, "TRAIN_CREATED", "Train", train._id);
    res.status(201).json({ train });
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ message: "That train number already exists." });
    throw e;
  }
}

export async function updateTrain(req, res) {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: "Invalid train ID." });
  const allowed = ["name", "source", "destination", "stops", "active"];
  const updates = {};
  for (const key of allowed) if (req.body?.[key] !== undefined) updates[key] = req.body[key];
  if (Object.keys(updates).length === 0) return res.status(400).json({ message: "No supported fields supplied." });
  for (const key of ["name", "source", "destination"]) if (updates[key] !== undefined && !isText(updates[key], 100)) return res.status(400).json({ message: `${key} is invalid.` });
  if (updates.stops !== undefined && (!Array.isArray(updates.stops) || updates.stops.some((s) => !isText(s, 100)))) return res.status(400).json({ message: "Stops are invalid." });
  if (updates.active !== undefined && typeof updates.active !== "boolean") return res.status(400).json({ message: "active must be boolean." });
  const train = await Train.findByIdAndUpdate(id, { $set: updates }, { new: true, runValidators: true });
  if (!train) return res.status(404).json({ message: "Train not found." });
  await audit(req.user._id, "TRAIN_UPDATED", "Train", id, updates);
  res.json({ train });
}

export async function createSchedule(req, res) {
  const { trainId, journeyDate, departureTime, arrivalTime, inventory, fares } = req.body ?? {};
  if (!mongoose.isValidObjectId(trainId)) return res.status(400).json({ message: "A valid trainId is required." });
  if (typeof journeyDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(journeyDate) || Number.isNaN(Date.parse(`${journeyDate}T00:00:00.000Z`))) return res.status(400).json({ message: "journeyDate must use YYYY-MM-DD." });
  if (!validTime(departureTime) || !validTime(arrivalTime)) return res.status(400).json({ message: "Departure and arrival times must use HH:mm." });
  for (const field of [inventory, fares]) {
    if (!field || typeof field !== "object" || CLASS_NAMES.some((c) => !Number.isFinite(Number(field[c])) || Number(field[c]) < 0)) return res.status(400).json({ message: "Provide non-negative inventory and fare values for every class." });
  }
  const train = await Train.findById(trainId);
  if (!train || !train.active) return res.status(404).json({ message: "Active train not found." });
  try {
    const schedule = await Schedule.create({ train: trainId, journeyDate: new Date(`${journeyDate}T00:00:00.000Z`), departureTime, arrivalTime, inventory: Object.fromEntries(CLASS_NAMES.map((c) => [c, Number(inventory[c])])), fares: Object.fromEntries(CLASS_NAMES.map((c) => [c, Number(fares[c])])) });
    await audit(req.user._id, "SCHEDULE_CREATED", "Schedule", schedule._id, { trainId, journeyDate });
    res.status(201).json({ schedule });
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ message: "A schedule for this train and date already exists." });
    throw e;
  }
}

export async function listBookings(req, res) {
  const bookings = await Booking.find().populate("user", "name email").populate({ path: "schedule", populate: { path: "train", select: "trainNumber name source destination" } }).sort({ createdAt: -1 }).limit(500).lean();
  res.json({ bookings });
}

export async function listAuditLogs(req, res) {
  const logs = await AuditLog.find().populate("actor", "name email").sort({ timestamp: -1 }).limit(200).lean();
  res.json({ logs });
}
