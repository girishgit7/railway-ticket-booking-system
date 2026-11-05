import mongoose from "mongoose";

const classes = ["GENERAL", "SLEEPER", "AC3", "AC2", "FIRST_AC"];

const inventorySchema = new mongoose.Schema(
  Object.fromEntries(
    classes.map((name) => [
      name,
      { type: Number, required: true, min: 0, default: 0 },
    ])
  ),
  { _id: false }
);

const fareSchema = new mongoose.Schema(
  Object.fromEntries(
    classes.map((name) => [
      name,
      { type: Number, required: true, min: 0, default: 0 },
    ])
  ),
  { _id: false }
);

const scheduleSchema = new mongoose.Schema(
  {
    train: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Train",
      required: true,
    },
    journeyDate: {
      type: Date,
      required: true,
    },
    departureTime: {
      type: String,
      required: true,
    },
    arrivalTime: {
      type: String,
      required: true,
    },
    inventory: {
      type: inventorySchema,
      required: true,
    },
    fares: {
      type: fareSchema,
      required: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

scheduleSchema.index(
  { train: 1, journeyDate: 1 },
  { unique: true }
);

scheduleSchema.index({ journeyDate: 1, active: 1 });

export { classes };
export default mongoose.model("Schedule", scheduleSchema);
