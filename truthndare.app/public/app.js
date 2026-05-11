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

// ==========================
// RENDER MESSAGE
// ==========================
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
    <div class="card-title">
      ${msg.type.toUpperCase()}
    </div>

    <div class="card-body">
      ${safeText}
    </div>

    <div class="card-meta">
      FROM: ${msg.hint || "unknown"} <br>
      🕒 ${time}
    </div>

    <div class="card-actions">
      <button onclick='downloadImage(
  "${msg._id}",
  "${msg.type}",
  ${JSON.stringify(msg.message)}
)'>
        Download
      </button>

      <button onclick="shareImage('${msg._id}')">
        Share
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

  // =========================
  // SIZE (kept clean portrait)
  // =========================
  canvas.width = 1080;
  canvas.height = 1350;

  // =========================
  // PALETTE (OLD WEB)
  // =========================
  const bg = "#f4f1e8";        // beige paper
  const border = "#000000";    // harsh black
  const accent = "#333333";    // dark gray text

  // type stamp colors (muted)
  let tagColor = "#444";

  if (type === "truth") tagColor = "#2f6f3e";
  if (type === "chaos") tagColor = "#7a5a00";
  if (type === "dare") tagColor = "#7a1f1f";

  // =========================
  // BACKGROUND
  // =========================
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // =========================
  // OUTER BORDER (old web box)
  // =========================
  ctx.strokeStyle = border;
  ctx.lineWidth = 6;
  ctx.strokeRect(30, 30, canvas.width - 60, canvas.height - 60);

  // inner thin border
  ctx.lineWidth = 2;
  ctx.strokeRect(50, 50, canvas.width - 100, canvas.height - 100);

  // =========================
  // HEADER (VERY 90s WEB)
  // =========================
  ctx.fillStyle = "#000";
  ctx.textAlign = "center";
  ctx.font = "bold 42px Times New Roman";
  ctx.fillText("TRUTH N DARE SYSTEM", canvas.width / 2, 140);

  ctx.font = "20px Courier New";
  ctx.fillText("anonymous message archive", canvas.width / 2, 180);

  // dotted separator
  ctx.fillText("----------------------------------------", canvas.width / 2, 220);

  // =========================
  // TYPE LABEL (ugly stamp style)
  // =========================
  ctx.fillStyle = tagColor;
  ctx.fillRect(80, 260, 200, 50);

  ctx.fillStyle = "#fff";
  ctx.font = "bold 24px Courier New";
  ctx.textAlign = "center";
  ctx.fillText(type.toUpperCase(), 180, 295);

  // =========================
  // MESSAGE BOX (plain text block)
  // =========================
  ctx.fillStyle = "#000";
  ctx.textAlign = "left";
  ctx.font = "26px Courier New";

  wrapText(
    ctx,
    message,
    80,
    380,
    920,
    40
  );

  // =========================
  // META INFO (old internet vibe)
  // =========================
  ctx.font = "20px Courier New";
  ctx.fillStyle = "#333";

  ctx.fillText("FROM: anonymous user", 80, 980);
  ctx.fillText("TIME: just now", 80, 1010);
  ctx.fillText("STATUS: unread", 80, 1040);

  // divider
  ctx.fillText("----------------------------------------", 80, 1080);

  // =========================
  // FOOTER (VERY OLD WEB)
  // =========================
  ctx.textAlign = "center";
  ctx.fillStyle = "#000";

  ctx.font = "bold 28px Times New Roman";
  ctx.fillText("truthndare.fun", canvas.width / 2, 1150);

  ctx.font = "18px Courier New";
  ctx.fillText("best viewed on Netscape Navigator", canvas.width / 2, 1190);

  ctx.fillText("© anonymous system 2001-style UI", canvas.width / 2, 1230);

  // =========================
  // DOWNLOAD
  // =========================
  const link = document.createElement("a");
  link.download = `${type}-truthndare.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
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
