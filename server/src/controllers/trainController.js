import mongoose from "mongoose";
import Train from "../models/Train.js";
import Schedule from "../models/Schedule.js";
import { classes } from "../models/Schedule.js";

function parseJourneyDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) {
    return null;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    return null;
  }

  return date;
}

// GET /api/trains/search?source=Chennai&destination=Bengaluru&date=2026-11-15
export async function searchTrains(req, res) {
  try {
    const { source, destination, date } = req.query;

    if (
      typeof source !== "string" ||
      typeof destination !== "string" ||
      !source.trim() ||
      !destination.trim() ||
      source.trim().length > 100 ||
      destination.trim().length > 100
    ) {
      return res.status(400).json({
        message: "Valid source and destination are required.",
      });
    }

    if (source.trim().toLowerCase() === destination.trim().toLowerCase()) {
      return res.status(400).json({
        message: "Source and destination must be different.",
      });
    }

    const startDate = parseJourneyDate(date);

    if (!startDate) {
      return res.status(400).json({
        message: "Provide a valid date in YYYY-MM-DD format.",
      });
    }

    const endDate = new Date(startDate);
    endDate.setUTCDate(endDate.getUTCDate() + 1);

    const trainFilter = {
      active: true,
      source: { $regex: `^${escapeRegex(source.trim())}$`, $options: "i" },
      destination: {
        $regex: `^${escapeRegex(destination.trim())}$`,
        $options: "i",
      },
    };

    const trains = await Train.find(trainFilter).select(
      "trainNumber name source destination stops"
    );

    if (trains.length === 0) {
      return res.status(200).json({
        count: 0,
        journeys: [],
        message: "No trains found for this route.",
      });
    }

    const schedules = await Schedule.find({
      train: { $in: trains.map((train) => train._id) },
      journeyDate: { $gte: startDate, $lt: endDate },
      active: true,
    })
      .populate(
        "train",
        "trainNumber name source destination stops"
      )
      .sort({ departureTime: 1 });

    const journeys = schedules.map((schedule) => ({
      scheduleId: schedule._id,
      journeyDate: schedule.journeyDate,
      departureTime: schedule.departureTime,
      arrivalTime: schedule.arrivalTime,
      train: schedule.train,
      availability: schedule.inventory,
      fares: schedule.fares,
    }));

    return res.status(200).json({
      count: journeys.length,
      journeys,
      message:
        journeys.length > 0
          ? "Train search completed successfully."
          : "No active schedules found for this route and date.",
    });
  } catch (error) {
    console.error("Train search error:", error);
    return res.status(500).json({
      message: "Unable to search trains at this time.",
    });
  }
}

// GET /api/trains/:id
export async function getTrainDetails(req, res) {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid train ID." });
    }

    const train = await Train.findOne({
      _id: id,
      active: true,
    }).select("trainNumber name source destination stops");

    if (!train) {
      return res.status(404).json({ message: "Train not found." });
    }

    const schedules = await Schedule.find({
      train: train._id,
      active: true,
      journeyDate: { $gte: new Date() },
    })
      .sort({ journeyDate: 1, departureTime: 1 })
      .limit(30)
      .select("journeyDate departureTime arrivalTime inventory fares");

    return res.status(200).json({ train, schedules });
  } catch (error) {
    console.error("Train details error:", error);
    return res.status(500).json({
      message: "Unable to retrieve train details.",
    });
  }
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
