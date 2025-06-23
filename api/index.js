const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const env = require("dotenv");
env.config();

const app = express();
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}));
app.use(express.json());

// ✅ MongoDB Connection
console.log("🔍 MONGO_URI =", process.env.MONGO_URI);

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch(err => console.error("MongoDB error:", err));

// ✅ User Schema
const userSchema = new mongoose.Schema({
  email: String,
  password: String
});
const User = mongoose.model("User", userSchema);

// ✅ OTP Schema
const otpSchema = new mongoose.Schema({
  email: String,
  otp: String,
  expiresAt: Date
});
const OTP = mongoose.model("OTP", otpSchema);

// ✅ Visit Schema
const visitSchema = new mongoose.Schema({
  user: String,
  shopId: String,
  enteredAt: Date,
  exitedAt: Date,
  items: Array,
  total: Number
});
const Visit = mongoose.model("Visit", visitSchema);

// ✅ Register Route
app.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).send("Email and password required");
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).send("User already exists");
    }

    await User.create({ email, password });
    res.status(201).send("User registered");
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).send("Server error");
  }
});

// ✅ Login Route
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email, password });

    if (!user) return res.status(401).send("Invalid credentials");
    res.status(200).send("Login successful");
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).send("Server error");
  }
});

// ✅ Store OTP
app.post("/send-otp", async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).send("Email and OTP required");

  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
  await OTP.deleteMany({ email });
  await OTP.create({ email, otp, expiresAt });

  res.status(200).send("OTP stored");
});

// ✅ Verify OTP
app.post("/verify-otp", async (req, res) => {
  const { email, otp } = req.body;
  const record = await OTP.findOne({ email, otp });

  if (!record) return res.status(401).send("Invalid OTP");
  if (record.expiresAt < new Date()) {
    await OTP.deleteMany({ email });
    return res.status(410).send("OTP expired");
  }

  await OTP.deleteMany({ email });
  res.status(200).send("OTP verified");
});

// ✅ Store a Visit
app.post("/visits", async (req, res) => {
  try {
    const newVisit = await Visit.create(req.body);
    res.status(201).json({ message: "Visit saved", visitId: newVisit._id });
  } catch (err) {
    console.error("Visit save error:", err);
    res.status(500).send("Server error");
  }
});

// ✅ Get Visit by ID
app.get("/visits/:id", async (req, res) => {
  try {
    const visit = await Visit.findById(req.params.id);
    if (!visit) return res.status(404).send("Visit not found");
    res.status(200).json(visit);
  } catch (err) {
    console.error("Visit fetch error:", err);
    res.status(500).send("Server error");
  }
});

// ✅ Add Product to Visit
app.post("/visits/:id/add-product", async (req, res) => {
  try {
    const visit = await Visit.findById(req.params.id);
    if (!visit) return res.status(404).send("Visit not found");

    const { name, price } = req.body;
    if (!name || typeof price !== "number") {
      return res.status(400).send("Invalid product format");
    }

    visit.items.push({ name, price });
    visit.total += price;
    await visit.save();

    res.status(200).json({ message: "Product added", updatedVisit: visit });
  } catch (err) {
    console.error("Add product error:", err);
    res.status(500).send("Server error");
  }
});

// ✅ Get All Visits
app.get("/visits", async (req, res) => {
  try {
    const visits = await Visit.find().sort({ enteredAt: -1 });
    res.status(200).json(visits);
  } catch (err) {
    console.error("Visit fetch error:", err);
    res.status(500).send("Server error");
  }
});

// ✅ Analytics Endpoint for Admin Dashboard Chart
app.get("/analytics", async (req, res) => {
  const range = req.query.range;
  try {
    const data = {
      minutes: { labels: ["Now", "-1m", "-2m"], values: [4, 2, 3] },
      hourly: { labels: ["12 AM", "1 AM", "2 AM"], values: [15, 12, 19] },
      daily: { labels: ["Mon", "Tue", "Wed"], values: [28, 35, 31] },
      monthly: { labels: ["Jan", "Feb", "Mar"], values: [120, 150, 180] },
      yearly: { labels: ["2022", "2023", "2024"], values: [650, 720, 810] }
    };
    res.json(data[range] || { labels: [], values: [] });
  } catch (err) {
    console.error("Analytics error:", err);
    res.status(500).json({ labels: [], values: [] });
  }
});
const PORT = process.env.PORT || 3000;
// ✅ Start Server
app.listen(PORT, () => console.log("🚀 Server running on port 3000"));
