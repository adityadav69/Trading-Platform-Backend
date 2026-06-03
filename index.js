const express = require("express");
require("dotenv").config();
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const HoldingsModel = require("./models/HoldingsModel");
const PositionsModel = require("./models/PositionsModel");
const OrdersModel = require("./models/OrdersModel");
const UserModel = require("./models/UserModel");
const authMiddleware = require("./middleware/authMiddleware");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3002;
const MONGO_URL = process.env.MONGO_URL;

mongoose
  .connect(MONGO_URL)
  .then(() => {
    console.log("DB CONNECTION SUCCESSFULL");
  })
  .catch((err) => {
    console.log("DB CONNECTION FAILED", err);
  });

app.post("/signup", async (req, res) => {
  try {
    const { name, age, email, password } = req.body;

    if (!name || !age || !email || !password) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    const existingUser = await UserModel.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        message: "User already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await UserModel.create({
      name,
      age,
      email,
      password: hashedPassword,
    });

    return res.status(201).json({
      message: "Signup successful",
      user: {
        id: user._id,
        name: user.name,
        age: user.age,
        email: user.email,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Signup failed",
      error: error.message,
    });
  }
});


app.get('/',(req,res)=>{
  res.send("App is running on render")
})

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const user = await UserModel.findOne({ email });

    if (!user) {
      return res.status(400).json({
        message: "Invalid email or password",
      });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);

    if (!isPasswordCorrect) {
      return res.status(400).json({
        message: "Invalid email or password",
      });
    }

    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      }
    );

    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        age: user.age,
        email: user.email,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Login failed",
      error: error.message,
    });
  }
});

app.get("/profile", authMiddleware, async (req, res) => {
  try {
    const user = await UserModel.findById(req.user.id).select("-password");

    return res.status(200).json({
      user,
    });
  } catch (error) {
    return res.status(500).json({ 
      message: "Profile fetch failed",
    });
  }
});

app.get("/allholdings", authMiddleware, async (req, res) => {
  try {
    const allHoldings = await HoldingsModel.find({
      user: req.user.id,
    });

    return res.json(allHoldings);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch holdings",
    });
  }
});

app.get("/allPositions", authMiddleware, async (req, res) => {
  try {
    const allPositions = await PositionsModel.find({
      user: req.user.id,
    });

    return res.json(allPositions);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch positions",
    });
  }
});

app.get("/allOrders", authMiddleware, async (req, res) => {
  try {
    const allOrders = await OrdersModel.find({
      user: req.user.id,
    });

    return res.json(allOrders);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch orders",
    });
  }
});

app.post("/newOrder", authMiddleware, async (req, res) => {
  try {
    const { name, qty, price, mode } = req.body;

    if (!name || !qty || !price || !mode) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const orderQty = Number(qty);
    const orderPrice = Number(price);

    if (orderQty <= 0 || orderPrice <= 0) {
      return res.status(400).json({
        message: "Quantity and price must be greater than 0",
      });
    }

    if (mode === "BUY") {
      let existingHolding = await HoldingsModel.findOne({
        user: req.user.id,
        name,
      });

      if (existingHolding) {
        const oldQty = existingHolding.qty;
        const oldAvg = existingHolding.avg;

        existingHolding.qty = oldQty + orderQty;
        existingHolding.avg =
          (oldQty * oldAvg + orderQty * orderPrice) / existingHolding.qty;

        existingHolding.price = orderPrice;

        const percentage = (
          ((existingHolding.price - existingHolding.avg) / existingHolding.avg) *
          100
        ).toFixed(2);

        existingHolding.net = `${percentage}%`;
        existingHolding.day = `${percentage}%`;
        existingHolding.isLoss = Number(percentage) < 0;

        await existingHolding.save();
      } else {
        await HoldingsModel.create({
          user: req.user.id,
          name,
          qty: orderQty,
          avg: orderPrice,
          price: orderPrice,
          net: "0.00%",
          day: "0.00%",
          isLoss: false,
        });
      }
    } else if (mode === "SELL") {
      let existingHolding = await HoldingsModel.findOne({
        user: req.user.id,
        name,
      });

      if (!existingHolding) {
        return res.status(400).json({
          message: "You do not have this stock in holdings",
        });
      }

      if (existingHolding.qty < orderQty) {
        return res.status(400).json({
          message: "Not enough quantity to sell",
        });
      }

      existingHolding.qty -= orderQty;
      existingHolding.price = orderPrice;

      const percentage = (
        ((existingHolding.price - existingHolding.avg) / existingHolding.avg) *
        100
      ).toFixed(2);

      existingHolding.net = `${percentage}%`;
      existingHolding.day = `${percentage}%`;
      existingHolding.isLoss = Number(percentage) < 0;

      if (existingHolding.qty <= 0) {
        await HoldingsModel.deleteOne({
          user: req.user.id,
          name,
        });
      } else {
        await existingHolding.save();
      }
    } else {
      return res.status(400).json({
        message: "Mode must be BUY or SELL",
      });
    }

    const newOrder = new OrdersModel({
      user: req.user.id,
      name,
      qty: orderQty,
      price: orderPrice,
      mode,
    });

    await newOrder.save();

    return res.status(201).json({
      message: "Order saved successfully",
    });
  } catch (err) {
    console.log(err);

    return res.status(500).json({
      message: "Error saving order",
      error: err.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`App is listening on port ${PORT}`);
});
