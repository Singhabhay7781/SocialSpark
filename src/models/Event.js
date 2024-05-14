import mongoose from "mongoose";

const eventSchema = mongoose.Schema(
  {
    text: {
      type: String,
      required: true,
    },
    tgId: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now(),
    },
  },
  { timeStamps: true }
);

export default mongoose.model("Event", eventSchema);
