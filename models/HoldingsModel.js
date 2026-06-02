const mongoose = require("mongoose");

const HoldingsSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: String,
    qty: Number,
    avg: Number,
    price: Number,
    net: String,
    day: String,
    isLoss: Boolean,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Holding", HoldingsSchema);