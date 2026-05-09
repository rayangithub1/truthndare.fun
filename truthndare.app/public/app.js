// ==========================
// SOCKET.IO INIT (IMPORTANT)
// ==========================
const socket = io();

// join after login (optional safe check)
const token = localStorage.getItem("token");
if (token) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (payload?.username) {
      socket.emit("join", payload.username);
    }
  } catch (e) {
    // ignore
  }
}

// ==========================
// LIVE USERS (REAL)
// ==========================
socket.on("online-count", (count) => {
  const el = document.getElementById("liveUsers");
  if (el) el.innerText = count;
});

// ==========================
// AUTH UI SWITCH
// ==========================
function showSignup() {
  document.getElementById("signupBox")?.style.setProperty("display", "block");
  document.getElementById("loginBox")?.style.setProperty("display", "none");
}

function showLogin() {
  document.getElementById("signupBox")?.style.setProperty("display", "none");
  document.getElementById("loginBox")?.style.setProperty("display", "block");
}

// ==========================
// PASSWORD TOGGLE
// ==========================
function togglePassword(id, el) {
  const input = document.getElementById(id);
  if (!input) return;

  if (input.type === "password") {
    input.type = "text";
    el.innerText = "Hide";
  } else {
    input.type = "password";
    el.innerText = "Show";
  }
}

// ==========================
// SIGNUP
// ==========================
async function signup() {
  const username = document.getElementById("signupUsername")?.value.trim();
  const password = document.getElementById("signupPassword")?.value;

  const res = await fetch("/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });

  const data = await res.json();

  document.getElementById("result").innerText =
    data.error || "Account created!";
}

// ==========================
// LOGIN
// ==========================
async function login() {
  const username = document.getElementById("loginUsername")?.value.trim();
  const password = document.getElementById("loginPassword")?.value;

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
  window.location.href = "/inbox";
}

// ==========================
// GET USER FROM URL
// ==========================
function getUserFromURL() {
  return window.location.pathname.replace("/@", "").replace("/", "");
}

// ==========================
// SEND MESSAGE
// ==========================
async function sendMessage() {
  const user = getUserFromURL();

  const type = document.getElementById("type")?.value;
  const message = document.getElementById("message")?.value.trim();
  const hint = document.getElementById("senderHint")?.value || "";

  if (!message) return;

  const res = await fetch(`/send/${user}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, message, hint })
  });

  const data = await res.json();

  const status = document.getElementById("status");
  if (status) status.innerText = data.error || "Sent ✔";
}

// ==========================
// SAFE TEXT ESCAPE
// ==========================
function escapeHTML(str) {
  return (str || "")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// ==========================
// RENDER MESSAGE
// ==========================
function renderMessage(msg) {
  const container = document.getElementById("messages");
  if (!container) return;

  const card = document.createElement("div");
  card.className = `message-card ${msg.type}`;

  card.innerHTML = `
    <div class="card-title">${msg.type.toUpperCase()}</div>

    <div class="card-body">
      ${escapeHTML(msg.message)}
    </div>

    <div class="card-meta">
      FROM: ${msg.hint || "unknown"}
    </div>

    <div class="card-actions">
      <button onclick="downloadImage('${msg._id}', '${msg.type}', \`${escapeHTML(msg.message)}\`)">
        Download
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
    window.location.href = "/";
    return;
  }

  const res = await fetch("/messages", {
    headers: { Authorization: token }
  });

  const data = await res.json();

  const link = document.getElementById("userLink");

  if (link && data.username) {
    link.value = `${window.location.origin}/${data.username}`;
  }

  const container = document.getElementById("messages");
  if (!container) return;

  container.innerHTML = "";
  (data.messages || []).reverse().forEach(renderMessage);
}

// ==========================
// COPY LINK
// ==========================
function copyLink() {
  const link = document.getElementById("userLink");
  if (!link) return;

  navigator.clipboard.writeText(link.value);
  alert("Copied!");
}

// ==========================
// AUTO LOAD INBOX
// ==========================
if (window.location.pathname.includes("inbox")) {
  loadInbox();
}
