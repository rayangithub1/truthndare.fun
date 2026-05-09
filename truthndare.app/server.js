require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const onlineUsers = new Map(); // socket.id → username

// ==========================
// SOCKET.IO
// ==========================
io.on("connection", (socket) => {
  console.log(`[SOCKET CONNECT] ${socket.id}`);

  socket.on("join", (username) => {
    socket.username = username;

    onlineUsers.set(socket.id, username);

    console.log(`[ONLINE] ${username} | total=${onlineUsers.size}`);

    io.emit("online-count", onlineUsers.size);
  });

  socket.on("disconnect", () => {
    const user = onlineUsers.get(socket.id);

    console.log(`[DISCONNECT] ${user || "unknown"}`);

    onlineUsers.delete(socket.id);

    io.emit("online-count", onlineUsers.size);
  });
});

// ==========================
// MIDDLEWARE
// ==========================
app.set("trust proxy", 1);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// ==========================
// ENV
// ==========================
const JWT_SECRET = process.env.JWT_SECRET;
const MONGO_URI = process.env.MONGO_URI;

// ==========================
// DB
// ==========================
mongoose.connect(MONGO_URI)
  .then(() => console.log("MongoDB Connected ✔"))
  .catch(err => console.log(err));

// ==========================
// RATE LIMIT
// ==========================
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300
}));

const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20
});

// ==========================
// MODELS
// ==========================
const User = mongoose.model("User", {
  username: { type: String, unique: true },
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
// AUTH
// ==========================
function auth(req, res, next) {
  const token = req.headers.authorization;
  if (!token) return res.status(403).json({ error: "No token" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch {
    return res.status(403).json({ error: "Invalid token" });
  }
}

// ==========================
// SIGNUP
// ==========================
app.post("/signup", authLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;

    const exists = await User.findOne({ username });
    if (exists) return res.json({ error: "Username taken" });

    const hashed = await bcrypt.hash(password, 10);

    await User.create({ username, password: hashed });

    res.json({ success: true });

  } catch (e) {
    res.status(500).json({ error: "Server error" });
  }
});

// ==========================
// LOGIN
// ==========================
app.post("/login", authLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user) return res.json({ error: "User not found" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.json({ error: "Wrong password" });

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "7d" });

    res.json({ token });

  } catch (e) {
    res.status(500).json({ error: "Server error" });
  }
});

// ==========================
// MESSAGES
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
// SEND MESSAGE
// ==========================
app.post("/send/:username", async (req, res) => {
  const { type, message, hint } = req.body;

  await Message.create({
    to: req.params.username,
    type,
    message,
    hint
  });

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
// PROFILE ROUTE
// ==========================
app.get("/:username", (req, res) => {
  res.sendFile(path.join(__dirname, "public/send.html"));
});

// ==========================
// START SERVER
// ==========================
server.listen(3000, "0.0.0.0", () => {
  console.log("Server running on http://0.0.0.0:3000");
});
