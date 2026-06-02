const mongoose = require("mongoose");

const OrdersSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: String,
    qty: Number,
    price: Number,
    mode: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", OrdersSchema);