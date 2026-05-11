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
// ==========================
// DOWNLOAD IMAGE
// ==========================
function downloadImage(id, type, message) {

  const canvas = document.getElementById(`canvas-${id}`);
  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  // =========================
  // SIZE
  // =========================
  canvas.width = 1080;
  canvas.height = 1350;

  // =========================
  // THEME COLORS
  // =========================
  let accent = "#8b5cf6";

  if (type === "truth") accent = "#22c55e";
  if (type === "chaos") accent = "#facc15";
  if (type === "dare") accent = "#ef4444";

  // =========================
  // BACKGROUND GRADIENT
  // =========================
  const bg = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  bg.addColorStop(0, "#020617");
  bg.addColorStop(0.5, "#0b1020");
  bg.addColorStop(1, "#030712");

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // =========================
  // CYBER GLOW ORBS
  // =========================
  function glow(x, y, color, size) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, size);
    g.addColorStop(0, color);
    g.addColorStop(1, "transparent");

    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }

  glow(200, 250, accent + "55", 350);
  glow(900, 300, "#8b5cf655", 300);
  glow(700, 1100, "#ffffff10", 400);

  // =========================
  // NOISE DOTS (enhanced)
  // =========================
  for (let i = 0; i < 180; i++) {
    ctx.fillStyle = "rgba(255,255,255,0.04)";
    ctx.beginPath();
    ctx.arc(
      Math.random() * canvas.width,
      Math.random() * canvas.height,
      Math.random() * 2.2,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }

  // =========================
  // MAIN CARD (glass effect)
  // =========================
  const cardX = 80;
  const cardY = 160;
  const cardW = 920;
  const cardH = 1000;

  // shadow layer (depth)
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.fillRect(cardX + 10, cardY + 10, cardW, cardH);

  // glass layer
  ctx.fillStyle = "rgba(255,255,255,0.05)";
  ctx.fillRect(cardX, cardY, cardW, cardH);

  // border glow
  ctx.strokeStyle = accent;
  ctx.lineWidth = 3;
  ctx.shadowColor = accent;
  ctx.shadowBlur = 25;
  ctx.strokeRect(cardX, cardY, cardW, cardH);
  ctx.shadowBlur = 0;

  // =========================
  // HEADER
  // =========================
  ctx.textAlign = "center";
  ctx.fillStyle = "#94a3b8";
  ctx.font = "600 24px Arial";
  ctx.fillText("TRUTH N DARE SYSTEM", canvas.width / 2, 110);

  // =========================
  // TYPE BADGE
  // =========================
  ctx.fillStyle = accent;
  roundRect(ctx, 130, 220, 240, 70, 18, true);

  ctx.fillStyle = "#000";
  ctx.font = "bold 34px Arial";
  ctx.fillText(type.toUpperCase(), 250, 268);

  // =========================
  // MESSAGE TEXT (BIG IMPACT)
  // =========================
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 58px Arial";
  ctx.textAlign = "left";

  wrapText(
    ctx,
    `"${message}"`,
    140,
    420,
    800,
    80
  );

  // =========================
  // DIVIDER LINE
  // =========================
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(140, 980);
  ctx.lineTo(940, 980);
  ctx.stroke();

  // =========================
  // FOOTER BRAND
  // =========================
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 36px Arial";
  ctx.fillText("truthndare.fun", canvas.width / 2, 1060);

  ctx.fillStyle = "#94a3b8";
  ctx.font = "24px Arial";
  ctx.fillText("anonymous truth • chaos • dare system", canvas.width / 2, 1110);

  // =========================
  // CTA BOX
  // =========================
  roundRect(ctx, 300, 1180, 480, 80, 20, true);

  ctx.fillStyle = "#fff";
  ctx.font = "bold 28px Arial";
  ctx.fillText("tap to reply anonymously", canvas.width / 2, 1230);

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
