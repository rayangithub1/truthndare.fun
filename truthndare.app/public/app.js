// ==========================
// SOCKET CONNECTION
// ==========================
const socket = io();

// store username after login
let currentUser = null;

// ==========================
// AUTH UI SWITCH
// ==========================
function showSignup() {
  const signupBox = document.getElementById("signupBox");
  const loginBox = document.getElementById("loginBox");

  if (signupBox) signupBox.style.display = "block";
  if (loginBox) loginBox.style.display = "none";
}

function showLogin() {
  const signupBox = document.getElementById("signupBox");
  const loginBox = document.getElementById("loginBox");

  if (signupBox) signupBox.style.display = "none";
  if (loginBox) loginBox.style.display = "block";
}

// ==========================
// PASSWORD TOGGLE
// ==========================
function togglePassword(id, el) {
  const input = document.getElementById(id);
  if (!input) return;

  input.type = input.type === "password" ? "text" : "password";
  el.innerText = input.type === "password" ? "👁" : "🙈";
}

// ==========================
// SIGNUP
// ==========================
async function signup() {
  const username = document.getElementById("signupUsername").value.trim();
  const password = document.getElementById("signupPassword").value;

  try {
    const res = await fetch("/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    document.getElementById("result").innerText =
      data.error ? data.error : "Account created! Now login.";

  } catch (err) {
    console.log(err);
    document.getElementById("result").innerText = "Signup failed";
  }
}

// ==========================
// LOGIN + SOCKET JOIN
// ==========================
async function login() {
  const username = document.getElementById("loginUsername").value.trim();
  const password = document.getElementById("loginPassword").value;

  try {
    const res = await fetch("/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (data.error) {
      document.getElementById("result").innerText = data.error;
      return;
    }

    localStorage.setItem("token", data.token);
    localStorage.setItem("username", username);

    currentUser = username;

    // ✅ CONNECT TO SOCKET SERVER
    socket.emit("join", username);

    window.location.href = "/inbox";

  } catch (err) {
    console.log(err);
    document.getElementById("result").innerText = "Login failed";
  }
}

// ==========================
// SOCKET LIVE USERS (REAL)
// ==========================
socket.on("online-count", (count) => {
  const el = document.getElementById("liveUsers");
  if (el) el.innerText = count;
});

// optional activity logs
socket.on("connect", () => {
  console.log("[SOCKET CONNECTED]", socket.id);
});

// ==========================
// GET USER FROM URL
// ==========================
function getUserFromURL() {
  return window.location.pathname
    .replace("/@", "")
    .replace("/", "")
    .trim();
}

// ==========================
// SEND MESSAGE
// ==========================
async function sendMessage() {
  const user = getUserFromURL();
  const type = document.getElementById("type").value;
  const message = document.getElementById("message").value.trim();
  const hint = document.getElementById("senderHint")?.value.trim() || "";
  const status = document.getElementById("status");

  if (!message) {
    status.innerText = "Write something first!";
    return;
  }

  try {
    const res = await fetch(`/send/${user}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, message, hint })
    });

    const data = await res.json();

    if (data.error) {
      status.innerText = data.error;
      return;
    }

    status.innerText = "Message Sent ✔";

    document.getElementById("message").value = "";
    if (document.getElementById("senderHint")) {
      document.getElementById("senderHint").value = "";
    }

    // optional live tracking
    socket.emit("activity", {
      type: "message_sent",
      message
    });

  } catch (err) {
    console.log(err);
    status.innerText = "Failed to send";
  }
}

// ==========================
// TIME AGO
// ==========================
function timeAgo(date) {
  if (!date) return "just now";

  const diff = Math.floor((Date.now() - new Date(date)) / 1000);

  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;

  return `${Math.floor(diff / 86400)} days ago`;
}

// ==========================
// RENDER MESSAGE
// ==========================
function renderMessage(msg) {
  const container = document.getElementById("messages");
  if (!container) return;

  const card = document.createElement("div");
  card.className = `message-card ${msg.type}`;

  const safeText = String(msg.message || "")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  card.innerHTML = `
    <div class="card-title">${msg.type.toUpperCase()}</div>

    <div class="card-body">${safeText}</div>

    <div class="card-meta">
      FROM: ${msg.hint || "unknown"} <br>
      🕒 ${timeAgo(msg.createdAt)}
    </div>

    <div class="card-actions">
      <button onclick="downloadImage('${msg._id}', '${msg.type}', \`${msg.message}\`)">
        Download
      </button>

      <button onclick="shareImage('${msg._id}')">
        Share
      </button>
    </div>

    <canvas id="canvas-${msg._id}" style="display:none;"></canvas>
  `;

  container.prepend(card);
}

// ==========================
// LOAD INBOX
// ==========================
async function loadInbox() {
  const token = localStorage.getItem("token");

  if (!token) {
    alert("Please login first");
    window.location.href = "/";
    return;
  }

  try {
    const res = await fetch("/messages", {
      headers: { Authorization: token }
    });

    const data = await res.json();

    if (data.error) {
      alert(data.error);
      localStorage.removeItem("token");
      window.location.href = "/";
      return;
    }

    const messages = data.messages || [];
    const container = document.getElementById("messages");

    if (!container) return;

    container.innerHTML = "";
    messages.reverse().forEach(renderMessage);

  } catch (err) {
    console.log(err);
    alert("Failed to load inbox");
  }
}

// ==========================
// COPY LINK
// ==========================
function copyLink() {
  const link = document.getElementById("userLink");
  if (!link) return;

  link.select();
  document.execCommand("copy");
  alert("Link copied!");
}

// ==========================
// AUTO LOAD INBOX
// ==========================
if (window.location.pathname.includes("inbox")) {
  loadInbox();
}
