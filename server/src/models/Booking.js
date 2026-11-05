import mongoose from "mongoose";

const passengerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    age: { type: Number, required: true, min: 1, max: 120 },
    gender: {
      type: String,
      enum: ["male", "female", "other", "unspecified"],
      default: "unspecified",
    },
    berthPreference: {
      type: String,
      enum: [
        "no-preference",
        "lower",
        "middle",
        "upper",
        "side-lower",
        "side-upper",
      ],
      default: "no-preference",
    },
  },
  { _id: false }
);

const bookingSchema = new mongoose.Schema(
  {
    pnr: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    schedule: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Schedule",
      required: true,
    },
    travelClass: {
      type: String,
      enum: ["GENERAL", "SLEEPER", "AC3", "AC2", "FIRST_AC"],
      required: true,
    },
    passengers: {
      type: [passengerSchema],
      required: true,
      validate: {
        validator: (value) =>
          value.length >= 1 && value.length <= 6,
        message: "A booking must contain between 1 and 6 passengers",
      },
    },
    fare: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["confirmed", "cancelled"],
      default: "confirmed",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "refunded", "failed"],
      default: "pending",
    },
    cancelledAt: { type: Date, default: null },
    refundAmount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

bookingSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model("Booking", bookingSchema);
