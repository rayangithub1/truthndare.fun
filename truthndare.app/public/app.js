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
    el.innerText = "👁";

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
      <button onclick="downloadImage('${msg._id}', '${msg.type}', \`${msg.message}\`)">
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
  // SIZE
  // =========================
  canvas.width = 1080;
  canvas.height = 1350;

  // =========================
  // DYNAMIC COLORS
  // =========================
  let accent = "#8b5cf6";

  if (type === "truth") accent = "#22c55e";
  if (type === "chaos") accent = "#facc15";
  if (type === "dare") accent = "#ef4444";

  // =========================
  // BACKGROUND
  // =========================
  const bg = ctx.createLinearGradient(0, 0, 0, canvas.height);

  bg.addColorStop(0, "#050816");
  bg.addColorStop(1, "#090b14");

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // =========================
  // GLOW BACKLIGHTS
  // =========================
  drawGlow(ctx, 180, 250, accent, 300);
  drawGlow(ctx, 950, 180, "#8b5cf6", 220);
  drawGlow(ctx, 850, 1150, "#ffffff15", 260);

  // =========================
  // TOP SMALL BRAND
  // =========================
  ctx.textAlign = "center";

  ctx.font = "24px Arial";
  ctx.fillStyle = "#94a3b8";

  ctx.fillText(
    "ANONYMOUS SOCIAL CHAOS",
    canvas.width / 2,
    90
  );

  // =========================
  // MAIN CARD
  // =========================
  roundRect(ctx, 70, 140, 940, 980, 36);

  ctx.fillStyle = "rgba(255,255,255,0.04)";
  ctx.fill();

  // border glow
  ctx.strokeStyle = accent;
  ctx.lineWidth = 4;

  ctx.shadowColor = accent;
  ctx.shadowBlur = 25;

  ctx.stroke();

  ctx.shadowBlur = 0;

  // =========================
  // TYPE LABEL
  // =========================
  roundRect(ctx, 120, 200, 260, 75, 18);

  ctx.fillStyle = accent;
  ctx.fill();

  ctx.fillStyle = "#fff";
  ctx.font = "bold 34px Arial";

  ctx.textAlign = "center";
  ctx.fillText(type.toUpperCase(), 250, 248);

  // =========================
  // MESSAGE TEXT
  // =========================
  ctx.fillStyle = "#ffffff";

  ctx.textAlign = "left";

  ctx.font = "bold 52px Arial";

  wrapText(
    ctx,
    `"${message}"`,
    130,
    380,
    820,
    78
  );

  // =========================
  // DECORATIVE LINE
  // =========================
  ctx.beginPath();
  ctx.moveTo(130, 920);
  ctx.lineTo(950, 920);

  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 2;
  ctx.stroke();

  // =========================
  // FOOTER
  // =========================
  ctx.textAlign = "center";

  ctx.fillStyle = "#cbd5e1";
  ctx.font = "bold 32px Arial";

  ctx.fillText(
    "truthndare.fun",
    canvas.width / 2,
    1040
  );

  ctx.fillStyle = "#64748b";
  ctx.font = "24px Arial";

  ctx.fillText(
    "send anonymous truths, dares & chaos",
    canvas.width / 2,
    1085
  );

  // =========================
  // EXPORT
  // =========================
  const link = document.createElement("a");

  link.download = `${type}-truthndare.png`;
  link.href = canvas.toDataURL("image/png");

  link.click();
}

// =========================
// GLOW ORB
// =========================
function drawGlow(ctx, x, y, color, size) {
  const gradient = ctx.createRadialGradient(
    x,
    y,
    0,
    x,
    y,
    size
  );

  gradient.addColorStop(0, color);
  gradient.addColorStop(1, "transparent");

  ctx.fillStyle = gradient;

  ctx.beginPath();
  ctx.arc(x, y, size, 0, Math.PI * 2);
  ctx.fill();
}

// =========================
// ROUNDED RECTANGLE
// =========================
function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();

  ctx.moveTo(x + radius, y);

  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);

  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(
    x + width,
    y + height,
    x + width - radius,
    y + height
  );

  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);

  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);

  ctx.closePath();
}

// ==========================
// SHARE IMAGE
// ==========================
function shareImage(id) {

  const canvas =
    document.getElementById(`canvas-${id}`);

  if (!canvas) return;

  canvas.toBlob(async (blob) => {

    try {

      const file = new File(
        [blob],
        "message.png",
        {
          type: "image/png"
        }
      );

      if (navigator.share) {

        await navigator.share({
          files: [file],
          title: "Truth or Chaos",
          text: "Anonymous message 😈"
        });

      } else {

        alert("Download and share manually");

      }

    } catch (err) {

      console.log(err);

    }

  });

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
