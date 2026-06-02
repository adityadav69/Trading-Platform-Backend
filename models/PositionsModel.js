const mongoose = require("mongoose");

const PositionsSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    product: String,
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

module.exports = mongoose.model("Position", PositionsSchema);