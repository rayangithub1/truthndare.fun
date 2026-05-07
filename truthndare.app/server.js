require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");

const app = express();

// ==========================
// TRUST PROXY (IMPORTANT FOR VPS)
// ==========================
app.set("trust proxy", 1);

app.use(express.json());
app.use(express.static("public"));

// ==========================
// ENV VARIABLES
// ==========================
const JWT_SECRET = process.env.JWT_SECRET;
const MONGO_URI = process.env.MONGO_URI;

// ==========================
// DATABASE
// ==========================
mongoose.connect(MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log(err));

// ==========================
// RATE LIMITERS
// ==========================

// Global limiter
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300
}));

// Auth limiter
const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20
});

// Send limiter (IMPORTANT)
const sendLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: "Too many messages. Slow down." }
});

// ==========================
// MODELS
// ==========================
const User = mongoose.model("User", {
  username: String,
  password: String
});

const Message = mongoose.model("Message", {
  to: String,
  type: String,
  message: String,
  hint: String,
  response: String,
  createdAt: { type: Date, default: Date.now }
});

// ==========================
// AUTH MIDDLEWARE
// ==========================
function auth(req, res, next) {
  const token = req.headers.authorization;

  if (!token) return res.status(403).json({ error: "No token" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch {
    res.status(403).json({ error: "Invalid token" });
  }
}

// ==========================
// SIGNUP
// ==========================
app.post("/signup", authLimiter, async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password)
    return res.json({ error: "All fields required" });

  if (username.length < 3)
    return res.json({ error: "Username too short" });

  const exists = await User.findOne({ username });
  if (exists) return res.json({ error: "Username taken" });

  const hashed = await bcrypt.hash(password, 10);

  await User.create({ username, password: hashed });

  res.json({ success: true });
});

// ==========================
// LOGIN
// ==========================
app.post("/login", authLimiter, async (req, res) => {
  const { username, password } = req.body;

  const user = await User.findOne({ username });
  if (!user) return res.json({ error: "User not found" });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.json({ error: "Wrong password" });

  const token = jwt.sign({ id: user._id }, JWT_SECRET);

  res.json({ token });
});

// ==========================
// SEND MESSAGE
// ==========================
app.post("/send/:username", sendLimiter, async (req, res) => {
  const { type, message, hint } = req.body;

  if (!message)
    return res.json({ error: "Message required" });

  if (message.length > 300)
    return res.json({ error: "Message too long" });

  if (!["truth", "chaos", "dare"].includes(type))
    return res.json({ error: "Invalid type" });

  await Message.create({
    to: req.params.username,
    type,
    message,
    hint
  });

  res.json({ success: true });
});

// ==========================
// GET INBOX
// ==========================
app.get("/messages", auth, async (req, res) => {
  const user = await User.findById(req.userId);

  const messages = await Message.find({ to: user.username })
    .sort({ createdAt: -1 });

  res.json({
    username: user.username,
    messages
  });
});

// ==========================
// RESPOND
// ==========================
app.post("/respond/:id", auth, async (req, res) => {
  const { response } = req.body;

  await Message.findByIdAndUpdate(req.params.id, { response });

  res.json({ success: true });
});

// ==========================
// ROUTES
// ==========================
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

app.get("/inbox", (req, res) => {
  res.sendFile(path.join(__dirname, "public/inbox.html"));
});

// ==========================
// CLEAN USER PROFILE LINK
// ==========================
app.get("/@:username", (req, res, next) => {
  const reserved = ["signup", "login", "send", "messages", "respond", "inbox"];

  if (reserved.includes(req.params.username)) return next();

  res.sendFile(path.join(__dirname, "public/send.html"));
});

app.get("/:username", (req, res, next) => {
  const reserved = ["signup", "login", "send", "messages", "respond", "inbox"];

  if (reserved.includes(req.params.username)) return next();

  res.sendFile(path.join(__dirname, "public/send.html"));
});

// ==========================
// START SERVER
// ==========================
app.listen(3000, () =>
  console.log("Server running on http://localhost:3000")
);