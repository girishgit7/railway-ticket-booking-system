import crypto from "node:crypto";
import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import Schedule from "../models/Schedule.js";
import Payment from "../models/Payment.js";

const allowedClasses = [
  "GENERAL",
  "SLEEPER",
  "AC3",
  "AC2",
  "FIRST_AC",
];

const allowedPaymentModes = [
  "UPI",
  "CARD_SIMULATED",
  "NET_BANKING",
  "CASH",
];

export async function createBooking(req, res) {
  let allocatedScheduleId = null;
  let allocatedClass = null;
  let allocatedSeats = 0;
  let booking = null;

  try {
    const { scheduleId, travelClass, passengers, paymentMode } = req.body;

    if (!mongoose.isValidObjectId(scheduleId)) {
      return res.status(400).json({
        message: "A valid schedule ID is required.",
      });
    }

    if (!allowedClasses.includes(travelClass)) {
      return res.status(400).json({
        message: "Invalid travel class.",
      });
    }

    if (
      !Array.isArray(passengers) ||
      passengers.length < 1 ||
      passengers.length > 6
    ) {
      return res.status(400).json({
        message: "Book between 1 and 6 passengers per booking.",
      });
    }

    if (!allowedPaymentModes.includes(paymentMode)) {
      return res.status(400).json({
        message: "Invalid payment mode.",
      });
    }

    for (const passenger of passengers) {
      if (
        typeof passenger.name !== "string" ||
        !passenger.name.trim() ||
        passenger.name.trim().length > 100 ||
        !Number.isInteger(passenger.age) ||
        passenger.age < 1 ||
        passenger.age > 120
      ) {
        return res.status(400).json({
          message: "Each passenger needs a valid name and age.",
        });
      }
    }

    const schedule = await Schedule.findOne({
      _id: scheduleId,
      active: true,
      journeyDate: { $gte: new Date() },
    });

    if (!schedule) {
      return res.status(404).json({
        message: "Active future schedule not found.",
      });
    }

    const farePerPassenger = schedule.fares.get
      ? schedule.fares.get(travelClass)
      : schedule.fares[travelClass];

    if (
      typeof farePerPassenger !== "number" ||
      !Number.isFinite(farePerPassenger) ||
      farePerPassenger < 0
    ) {
      return res.status(400).json({
        message: "Fare is unavailable for this class.",
      });
    }

    const totalFare = farePerPassenger * passengers.length;
    const inventoryPath = `inventory.${travelClass}`;

    // Atomically reserve the requested seats. Concurrent bookings
    // cannot reduce the class inventory below zero.
    const allocatedSchedule = await Schedule.findOneAndUpdate(
      {
        _id: scheduleId,
        active: true,
        journeyDate: { $gte: new Date() },
        [inventoryPath]: { $gte: passengers.length },
      },
      {
        $inc: { [inventoryPath]: -passengers.length },
      },
      { new: true }
    );

    if (!allocatedSchedule) {
      return res.status(409).json({
        message: "Insufficient seats or schedule no longer available.",
      });
    }

    allocatedScheduleId = allocatedSchedule._id;
    allocatedClass = travelClass;
    allocatedSeats = passengers.length;

    // Retry if a randomly generated PNR collides with an existing one.
    for (let attempt = 0; attempt < 3; attempt++) {
      const pnr = crypto.randomInt(10000000, 100000000).toString();

      try {
        booking = await Booking.create({
          pnr,
          user: req.user.id,
          schedule: scheduleId,
          travelClass,
          passengers: passengers.map((p) => ({
            name: p.name.trim(),
            age: p.age,
            gender: p.gender,
            berthPreference: p.berthPreference,
          })),
          fare: totalFare,
          status: "confirmed",
          paymentStatus: "pending",
        });

        break;
      } catch (error) {
        if (error.code === 11000 && attempt < 2) {
          continue;
        }
        throw error;
      }
    }

    // This project records simulated payment only; no real money moves.
    await Payment.create({
      booking: booking._id,
      amount: totalFare,
      mode: paymentMode,
      status: "success",
      transactionReference: `SIM-${crypto.randomUUID()}`,
    });

    booking.paymentStatus = "paid";
    await booking.save();

    return res.status(201).json({
      message: "Booking created successfully.",
      booking: {
        id: booking._id,
        pnr: booking.pnr,
        travelClass: booking.travelClass,
        passengers: booking.passengers,
        fare: booking.fare,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
      },
    });
  } catch (error) {
    console.error("Error message:", error.message);
    console.error("Error code:", error.code);
    console.error("Error name:", error.name);
    
    // If booking or simulated payment creation fails, release reserved seats.
    if (allocatedScheduleId && allocatedClass && allocatedSeats > 0) {
      try {
        await Schedule.updateOne(
          { _id: allocatedScheduleId },
          { $inc: { [`inventory.${allocatedClass}`]: allocatedSeats } }
        );

        if (booking) {
          await Payment.deleteMany({ booking: booking._id });
          await Booking.deleteOne({ _id: booking._id });
        }
      } catch (rollbackError) {
        console.error(
          "CRITICAL: Seat rollback failed:",
          rollbackError
        );
      }
    }

    return res.status(500).json({
      message: "Unable to complete booking. Please check availability and try again.",
    });
  }
}

export async function getMyBookings(req, res) {
  try {
    const bookings = await Booking.find({ user: req.user._id })
      .populate({
        path: "schedule",
        select: "journeyDate departureTime arrivalTime train",
        populate: {
          path: "train",
          select: "trainNumber name source destination",
        },
      })
      .sort({ createdAt: -1 });

    return res.status(200).json({
      count: bookings.length,
      bookings,
    });
  } catch (error) {
    console.error("Booking history error:", error.message);

    return res.status(500).json({
      message: "Unable to retrieve booking history.",
    });
  }
}

export async function getBookingByPNR(req, res) {
  try {
    const pnr = req.params.pnr?.trim();

    if (!pnr || !/^\d{8}$/.test(pnr)) {
      return res.status(400).json({
        message: "Provide a valid 8-digit PNR.",
      });
    }

    // Passengers can retrieve only their own bookings.
    const booking = await Booking.findOne({
      pnr,
      user: req.user._id,
    }).populate({
      path: "schedule",
      select: "journeyDate departureTime arrivalTime train",
      populate: {
        path: "train",
        select: "trainNumber name source destination stops",
      },
    });

    if (!booking) {
      return res.status(404).json({
        message: "Booking not found.",
      });
    }

    return res.status(200).json({ booking });
  } catch (error) {
    console.error("PNR lookup error:", error.message);

    return res.status(500).json({
      message: "Unable to retrieve ticket details.",
    });
  }
}

export async function getTicketById(req, res) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid booking ID.",
      });
    }

    const booking = await Booking.findOne({
      _id: req.params.id,
      user: req.user._id,
    }).populate({
      path: "schedule",
      select: "journeyDate departureTime arrivalTime train",
      populate: {
        path: "train",
        select: "trainNumber name source destination stops",
      },
    });

    if (!booking) {
      return res.status(404).json({
        message: "Booking not found.",
      });
    }

    return res.status(200).json({
      ticket: booking,
    });
  } catch (error) {
    console.error("Ticket retrieval error:", error.message);

    return res.status(500).json({
      message: "Unable to retrieve ticket.",
    });
  }
}

export async function cancelBooking(req, res) {
  const session = await mongoose.startSession();

  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid booking ID.",
      });
    }

    let result;

    await session.withTransaction(async () => {
      // Atomically claim the booking so it cannot be cancelled twice.
      const booking = await Booking.findOneAndUpdate(
        {
          _id: id,
          user: req.user._id,
          status: "confirmed",
          paymentStatus: "paid",
        },
        {
          $set: {
            status: "cancelled",
            cancelledAt: new Date(),
          },
        },
        { new: false, session }
      );

      if (!booking) {
        const existing = await Booking.findOne({
          _id: id,
          user: req.user._id,
        }).session(session);

        result = {
          error: existing
            ? "Booking is already cancelled or is not eligible for cancellation."
            : "Booking not found.",
          status: existing ? 409 : 404,
        };
        return;
      }

      const schedule = await Schedule.findById(booking.schedule)
        .session(session);

      if (!schedule) {
        throw new Error("Schedule not found for booking.");
      }

      const departure = new Date(schedule.journeyDate);
      const [hours, minutes] = schedule.departureTime.split(":").map(Number);
      departure.setUTCHours(hours, minutes, 0, 0);

      if (departure <= new Date()) {
        throw new Error("CANCELLATION_NOT_ALLOWED_AFTER_DEPARTURE");
      }

      const refundAmount = Math.round(booking.fare * 0.9 * 100) / 100;

      // Restore the seats exactly once, in the same transaction.
      await Schedule.updateOne(
        { _id: booking.schedule },
        {
          $inc: {
            [`inventory.${booking.travelClass}`]: booking.passengers.length,
          },
        },
        { session }
      );

      booking.refundAmount = refundAmount;
      booking.paymentStatus = "refunded";
      await booking.save({ session });

      await Payment.updateMany(
        {
          booking: booking._id,
          status: "success",
        },
        {
          $set: { status: "refunded" },
        },
        { session }
      );

      result = {
        success: true,
        message: "Booking cancelled successfully.",
        pnr: booking.pnr,
        refundAmount,
        paymentStatus: "refunded",
        status: "cancelled",
      };
    });

    if (result?.error) {
      return res.status(result.status).json({
        message: result.error,
      });
    }

    return res.status(200).json(result);
  } catch (error) {
    if (error.message === "CANCELLATION_NOT_ALLOWED_AFTER_DEPARTURE") {
      return res.status(400).json({
        message: "Cancellation is not allowed at or after departure.",
      });
    }

    console.error("Booking cancellation error:", error);

    // MongoDB transactions are unavailable on standalone mongod instances.
    // Keep cancellation atomic rather than attempting unsafe partial writes.
    if (error.code === 20 || /Transaction numbers are only allowed|replica set|mongos/i.test(error.message || "")) {
      return res.status(503).json({
        message: "Cancellation requires MongoDB running as a replica set or on MongoDB Atlas. Configure the database and retry.",
      });
    }

    return res.status(500).json({
      message: "Unable to cancel booking.",
    });
  } finally {
    await session.endSession();
  }
}
