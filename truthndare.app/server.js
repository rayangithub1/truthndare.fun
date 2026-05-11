require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const socketIo = require("socket.io");
const http = require("http");
const onlineUsers = new Map(); // socket.id → username
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*"
  }
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
// ENV VARIABLES
// ==========================
const JWT_SECRET = process.env.JWT_SECRET;
const MONGO_URI = process.env.MONGO_URI;

// ==========================
// DATABASE
// ==========================
mongoose.set("bufferCommands", false);

mongoose.connect(MONGO_URI, {
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 60000,
  connectTimeoutMS: 30000,
  maxPoolSize: 10,
  minPoolSize: 2
})
.then(() => {
  console.log("MongoDB Connected ✔");
})
.catch((err) => {
  console.log("MongoDB Error:", err);
});

mongoose.connection.on("disconnected", () => {
  console.log("MongoDB disconnected — retrying...");
});

mongoose.connection.on("error", (err) => {
  console.log("MongoDB runtime error:", err);
});

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

// Send limiter
const sendLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: {
    error: "Too many messages. Slow down."
  }
});

// ==========================
// MODELS
// ==========================
const User = mongoose.model("User", {
  username: {
    type: String,
    unique: true,
    required: true
  },

  password: {
    type: String,
    required: true
  }
});

const Message = mongoose.model("Message", {
  to: String,
  type: String,
  message: String,
  hint: String,
  response: String,

  createdAt: {
    type: Date,
    default: Date.now
  }
});

// ==========================
// AUTH MIDDLEWARE
// ==========================
function auth(req, res, next) {

  const token = req.headers.authorization;

  if (!token) {
    return res.status(403).json({
      error: "No token"
    });
  }

  try {

    const decoded = jwt.verify(token, JWT_SECRET);

    req.userId = decoded.id;

    next();

  } catch {

    return res.status(403).json({
      error: "Invalid token"
    });

  }
}

// ==========================
// SIGNUP
// ==========================
app.post("/signup", authLimiter, async (req, res) => {

  try {

    const { username, password } = req.body;

    if (!username || !password) {
      return res.json({
        error: "All fields required"
      });
    }

    if (username.length < 3) {
      return res.json({
        error: "Username too short"
      });
    }

    const exists = await User.findOne({ username });

    if (exists) {
      return res.json({
        error: "Username taken"
      });
    }

    const hashed = await bcrypt.hash(password, 10);

    await User.create({
      username,
      password: hashed
    });

    res.json({
      success: true
    });

  } catch (err) {

    console.log(err);

    res.status(500).json({
      error: "Server error"
    });

  }

});

// ==========================
// LOGIN
// ==========================
app.post("/login", authLimiter, async (req, res) => {

  try {

    const { username, password } = req.body;

    const user = await User.findOne({ username });

    if (!user) {
      return res.json({
        error: "User not found"
      });
    }

    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      return res.json({
        error: "Wrong password"
      });
    }

    const token = jwt.sign(
      { id: user._id },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    console.log(`🟢 LOGIN: ${username} at ${new Date().toLocaleString()}`);

res.json({
  token,
  username
});

  } catch (err) {

    console.log(err);

    res.status(500).json({
      error: "Server error"
    });

  }

});

// ==========================
// SEND MESSAGE
// ==========================
app.post("/send/:username", sendLimiter, async (req, res) => {

  try {

    const { type, message, hint } = req.body;

    if (!message) {
      return res.json({
        error: "Message required"
      });
    }

    if (message.length > 300) {
      return res.json({
        error: "Message too long"
      });
    }

    if (!["truth", "chaos", "dare"].includes(type)) {
      return res.json({
        error: "Invalid type"
      });
    }

    const targetUser = await User.findOne({
      username: req.params.username
    });

    if (!targetUser) {
      return res.json({
        error: "User does not exist"
      });
    }

    await Message.create({
      to: req.params.username,
      type,
      message,
      hint
    });

    res.json({
      success: true
    });

  } catch (err) {

    console.log(err);

    res.status(500).json({
      error: "Failed to send message"
    });

  }

});

// ==========================
// GET INBOX
// ==========================
app.get("/messages", auth, async (req, res) => {

  try {

    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({
        error: "User not found"
      });
    }

    const messages = await Message.find({
      to: user.username
    }).sort({
      createdAt: -1
    });

    res.json({
      username: user.username,
      messages
    });

  } catch (err) {

    console.log(err);

    res.status(500).json({
      error: "Failed to load messages"
    });

  }

});

// ==========================
// RESPOND
// ==========================
app.post("/respond/:id", auth, async (req, res) => {

  try {

    const { response } = req.body;

    await Message.findByIdAndUpdate(
      req.params.id,
      { response }
    );

    res.json({
      success: true
    });

  } catch (err) {

    console.log(err);

    res.status(500).json({
      error: "Failed to respond"
    });

  }

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
const reservedRoutes = [
  "signup",
  "login",
  "send",
  "messages",
  "respond",
  "inbox"
];

app.get("/@:username", (req, res, next) => {

  if (reservedRoutes.includes(req.params.username)) {
    return next();
  }

  res.sendFile(path.join(__dirname, "public/send.html"));

});

app.get("/:username", (req, res, next) => {

  if (reservedRoutes.includes(req.params.username)) {
    return next();
  }

  res.sendFile(path.join(__dirname, "public/send.html"));

});

// ==========================
// START SERVER
// ==========================
server.listen(3000, "0.0.0.0", () => {
  console.log("Server running on http://0.0.0.0:3000");
});
