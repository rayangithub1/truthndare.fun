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

function togglePassword(id, el) {

  const input = document.getElementById(id);

  if (input.type === "password") {

    input.type = "text";
    el.innerText = "🙈";

  } else {

    input.type = "password";
    el.innerText = "🙉";

  }

}

// ==========================
// SIGNUP
// ==========================
async function signup() {

  const username =
    document.getElementById("signupUsername").value.trim();

  const password =
    document.getElementById("signupPassword").value;

  try {

    const res = await fetch("/signup", {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        username,
        password
      })
    });

    const data = await res.json();

    document.getElementById("result").innerText =
      data.error
        ? data.error
        : "Account created! Now login.";

  } catch (err) {

    console.log(err);

    document.getElementById("result").innerText =
      "Signup failed";

  }

}

// ==========================
// LOGIN
// ==========================
async function login() {

  const username =
    document.getElementById("loginUsername").value.trim();

  const password =
    document.getElementById("loginPassword").value;

  try {

    const res = await fetch("/login", {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        username,
        password
      })
    });

    const data = await res.json();

    if (data.error) {
      document.getElementById("result").innerText =
        data.error;

      return;
    }

localStorage.setItem("token", data.token);

// ✅ SOCKET CONNECTION (FRONTEND)
const socket = io(); // connects to server

socket.emit("user-online", username);
    window.location.href = "/inbox";

  } catch (err) {

    console.log(err);

    document.getElementById("result").innerText =
      "Login failed";

  }

}

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

  const type =
    document.getElementById("type").value;

  const message =
    document.getElementById("message").value.trim();

  const hint =
    document.getElementById("senderHint")?.value.trim() || "";

  const status =
    document.getElementById("status");

  if (!message) {

    status.innerText = "Write something first!";

    return;

  }

  try {

    const res = await fetch(`/send/${user}`, {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        type,
        message,
        hint
      })
    });

    const data = await res.json();

    if (data.error) {

      status.innerText = data.error;

      return;

    }

    status.innerText = "Message Sent ✔";

    document.getElementById("message").value = "";

    const hintBox =
      document.getElementById("senderHint");

    if (hintBox) {
      hintBox.value = "";
    }

  } catch (err) {

    console.log(err);

    status.innerText = "Failed to send";

  }

}

// ==========================
// TIME AGO FORMAT
// ==========================
function timeAgo(date) {

  if (!date) return "just now";

  const now = new Date();

  const past = new Date(date);

  const diff =
    Math.floor((now - past) / 1000);

  if (diff < 60)
    return "just now";

  if (diff < 3600)
    return `${Math.floor(diff / 60)} min ago`;

  if (diff < 86400)
    return `${Math.floor(diff / 3600)} hours ago`;

  return `${Math.floor(diff / 86400)} days ago`;

}

function renderMessage(msg) {

  const container =
    document.getElementById("messages");

  if (!container) return;

  const card =
    document.createElement("div");

  card.className =
    `message-card ${msg.type}`;

  const time =
    timeAgo(msg.createdAt);

  const safeText =
    (msg.message || "")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  card.innerHTML = `
    <div class="message-top">
      
      <div class="message-type">
        ${msg.type}
      </div>

      <div class="message-time">
        ${time}
      </div>

    </div>

    <div class="message-text">
      ${safeText}
    </div>

    <div class="message-meta">
      FROM: ${msg.hint || "unknown"}
    </div>

    <div class="message-actions">

      <button onclick='downloadImage(
        "${msg._id}",
        "${msg.type}",
        ${JSON.stringify(msg.message)}
      )'>
        Download
      </button>

      <button onclick="
        navigator.clipboard.writeText(
          ${JSON.stringify(msg.message)}
        )
      ">
        Copy
      </button>

    </div>

    <canvas
      id="canvas-${msg._id}"
      style="display:none;">
    </canvas>
  `;

  container.prepend(card);
}

// ==========================
// LOAD INBOX
// ==========================
async function loadInbox() {

  const token =
    localStorage.getItem("token");

  if (!token) {

    alert("Please login first");

    window.location.href = "/";

    return;

  }

  try {

    const res = await fetch("/messages", {
      headers: {
        Authorization: token
      }
    });

    const data = await res.json();

    if (data.error) {

      alert(data.error);

      localStorage.removeItem("token");

      window.location.href = "/";

      return;

    }

    const username =
      data.username;

    const messages =
      data.messages || [];

    const link =
      document.getElementById("userLink");

    if (link) {

      link.value =
        `${window.location.origin}/${username}`;

    }

    const container =
      document.getElementById("messages");

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

  const link =
    document.getElementById("userLink");

  if (!link) return;

  link.select();

  document.execCommand("copy");

  alert("Link copied!");

}

// ==========================
// WRAP TEXT
// ==========================
function wrapText(
  ctx,
  text,
  x,
  y,
  maxWidth,
  lineHeight
) {

  const words =
    String(text).split(" ");

  let line = "";

  for (let n = 0; n < words.length; n++) {

    const testLine =
      line + words[n] + " ";

    const width =
      ctx.measureText(testLine).width;

    if (width > maxWidth && n > 0) {

      ctx.fillText(line, x, y);

      line = words[n] + " ";

      y += lineHeight;

    } else {

      line = testLine;

    }

  }

  ctx.fillText(line, x, y);

}

// ==========================
// DOWNLOAD IMAGE
// ==========================
function downloadImage(id, type, message) {

  const canvas = document.getElementById(`canvas-${id}`);
  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  canvas.width = 1200;
  canvas.height = 630;

  // =========================
  // BACKGROUND
  // =========================
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // subtle border
  ctx.strokeStyle = "#e5e7eb";
  ctx.lineWidth = 2;
  ctx.strokeRect(30, 30, canvas.width - 60, canvas.height - 60);

  // =========================
  // LOAD LOGO
  // =========================
  const logo = new Image();
  logo.src = "/logo.png";

  logo.onload = function () {

    // =========================
    // RIGHT SIDE WATERMARK LOGO
    // =========================
    ctx.save();

// soft glow effect behind logo
ctx.shadowColor = "rgba(0,0,0,0.15)";
ctx.shadowBlur = 25;

// slightly higher visibility
ctx.globalAlpha = 0.16;

const logoSize = 540;

const x = canvas.width - logoSize - 10;
const y = canvas.height / 2 - logoSize / 2;

ctx.drawImage(logo, x, y, logoSize, logoSize);

ctx.restore();

    // =========================
    // LEFT SIDE CONTENT
    // =========================

    ctx.globalAlpha = 1;
    ctx.textAlign = "left";

    // BRAND
    ctx.fillStyle = "#111827";
    ctx.font = "bold 38px Arial";
    ctx.fillText("truthndare.fun", 90, 110);

    ctx.fillStyle = "#6b7280";
    ctx.font = "18px Arial";
    ctx.fillText("anonymous truth • dare • chaos messages", 90, 145);

    // divider
    ctx.strokeStyle = "#e5e7eb";
    ctx.beginPath();
    ctx.moveTo(90, 180);
    ctx.lineTo(900, 180);
    ctx.stroke();

    // =========================
    // TYPE LABEL
    // =========================
    let color = "#111827";
    if (type === "truth") color = "#16a34a";
    if (type === "chaos") color = "#ca8a04";
    if (type === "dare") color = "#dc2626";

    ctx.fillStyle = color;
    ctx.font = "bold 22px Arial";
    ctx.fillText(type.toUpperCase(), 90, 250);

    // =========================
    // MESSAGE
    // =========================
    ctx.fillStyle = "#111827";
    ctx.font = "bold 46px Arial";

    wrapText(
      ctx,
      message,
      90,
      320,
      700, // reduced width so logo doesn't clash
      60
    );

    // =========================
    // FOOTER
    // =========================
    ctx.textAlign = "center";

    ctx.fillStyle = "#2563eb";
    ctx.font = "bold 20px Arial";
    ctx.fillText("truthndare.fun", canvas.width / 2, 520);

    ctx.fillStyle = "#9ca3af";
    ctx.font = "16px Arial";
    ctx.fillText("messages are anonymous • no identity stored", canvas.width / 2, 555);

    // =========================
    // EXPORT
    // =========================
    const link = document.createElement("a");
    link.download = `${type}-truthndare.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };
}
// ==========================
// MODE COLORS
// ==========================
function updateMode() {

  const type =
    document.getElementById("type");

  const box =
    document.getElementById("mainBox");

  if (!type || !box) return;

  box.classList.remove(
    "truth-mode",
    "chaos-mode",
    "dare-mode"
  );

  box.classList.add(
    type.value + "-mode"
  );

}

// ==========================
// LIVE USERS
// ==========================
let baseUsers = 120;

function updateLiveUsers() {

  const el =
    document.getElementById("liveUsers");

  if (!el) return;

  baseUsers +=
    Math.floor(Math.random() * 5) - 2;

  if (baseUsers < 80) {
    baseUsers = 80;
  }

  el.innerText = baseUsers;

}

setInterval(updateLiveUsers, 3000);

// ==========================
// AUTO LOAD INBOX
// ==========================
if (
  window.location.pathname.includes("inbox")
) {
  loadInbox();
}
