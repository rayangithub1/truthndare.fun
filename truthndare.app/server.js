require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const http = require("http");
const { Server } = require("socket.io");

// ==========================
// APP + SERVER + SOCKET
// ==========================
const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" }
});

// ==========================
// ONLINE USERS STORE
// ==========================
const onlineUsers = new Map(); // socket.id → username

function logOnlineUsers() {
  console.log("================================");
  console.log("ONLINE USERS:", onlineUsers.size);

  for (const [id, username] of onlineUsers.entries()) {
    console.log(`- ${username} (${id})`);
  }

  console.log("================================");
}

// ==========================
// SOCKET CONNECTION
// ==========================
io.on("connection", (socket) => {
  console.log(`[SOCKET CONNECT] ${socket.id}`);

  // user joins after login (frontend must emit this)
  socket.on("join", (username) => {
    socket.username = username;
    onlineUsers.set(socket.id, username);

    console.log(`[ONLINE] ${username}`);

    logOnlineUsers();

    io.emit("online-count", onlineUsers.size);
  });

  // optional activity tracking
  socket.on("activity", (data) => {
    console.log(`[ACTIVITY] ${socket.username}:`, data);
  });

  socket.on("send-message", (data) => {
    console.log(`[MESSAGE] ${socket.username}: ${data.message}`);
  });

  socket.on("disconnect", () => {
    const user = onlineUsers.get(socket.id);

    console.log(`[DISCONNECT] ${user || "unknown"}`);

    onlineUsers.delete(socket.id);

    logOnlineUsers();

    io.emit("online-count", onlineUsers.size);
  });
});

// ==========================
// TRUST PROXY
// ==========================
app.set("trust proxy", 1);

// ==========================
// MIDDLEWARE
// ==========================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// ==========================
// ENV
// ==========================
const JWT_SECRET = process.env.JWT_SECRET;
const MONGO_URI = process.env.MONGO_URI;

// ==========================
// DATABASE
// ==========================
mongoose.connect(MONGO_URI)
  .then(() => console.log("MongoDB Connected ✔"))
  .catch(err => console.log("Mongo Error:", err));

// ==========================
// RATE LIMITERS
// ==========================
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300
}));

const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20
});

const sendLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5
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
    return res.status(403).json({ error: "Invalid token" });
  }
}

// ==========================
// SIGNUP
// ==========================
app.post("/signup", authLimiter, async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password)
    return res.json({ error: "All fields required" });

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

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.json({ error: "Wrong password" });

  const token = jwt.sign({ id: user._id }, JWT_SECRET, {
    expiresIn: "7d"
  });

  res.json({ token });
});

// ==========================
// SEND MESSAGE
// ==========================
app.post("/send/:username", sendLimiter, async (req, res) => {
  const { type, message, hint } = req.body;

  if (!message) return res.json({ error: "Message required" });

  await Message.create({
    to: req.params.username,
    type,
    message,
    hint
  });

  res.json({ success: true });
});

// ==========================
// GET MESSAGES
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
// PAGES
// ==========================
app.get("/", (req, res) =>
  res.sendFile(path.join(__dirname, "public/index.html"))
);

app.get("/inbox", (req, res) =>
  res.sendFile(path.join(__dirname, "public/inbox.html"))
);

// ==========================
// PROFILE ROUTES
// ==========================
const reserved = ["signup", "login", "send", "messages", "inbox"];

app.get("/@:username", (req, res, next) => {
  if (reserved.includes(req.params.username)) return next();
  res.sendFile(path.join(__dirname, "public/send.html"));
});

app.get("/:username", (req, res, next) => {
  if (reserved.includes(req.params.username)) return next();
  res.sendFile(path.join(__dirname, "public/send.html"));
});

// ==========================
// START SERVER
// ==========================
server.listen(3000, "0.0.0.0", () => {
  console.log("Server running on http://0.0.0.0:3000");
});
