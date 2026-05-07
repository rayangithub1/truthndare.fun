// ==========================
// AUTH UI SWITCH
// ==========================
function showSignup() {
  document.getElementById("signupBox").style.display = "block";
  document.getElementById("loginBox").style.display = "none";
}

function showLogin() {
  document.getElementById("signupBox").style.display = "none";
  document.getElementById("loginBox").style.display = "block";
}

// ==========================
// SIGNUP
// ==========================
async function signup() {
  const username = document.getElementById("signupUsername").value;
  const password = document.getElementById("signupPassword").value;

  const res = await fetch("/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });

  const data = await res.json();

  document.getElementById("result").innerText =
    data.error ? data.error : "Account created! Now login.";
}

// ==========================
// LOGIN
// ==========================
async function login() {
  const username = document.getElementById("loginUsername").value;
  const password = document.getElementById("loginPassword").value;

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
  return window.location.pathname.replace("/@", "");
}

// ==========================
// SEND MESSAGE
// ==========================
async function sendMessage() {
  const user = getUserFromURL();
  const type = document.getElementById("type").value;
  const message = document.getElementById("message").value;
  const hint = document.getElementById("hint")?.value || "";

  if (!message) {
    document.getElementById("status").innerText = "Write something first!";
    return;
  }

  await fetch(`/send/${user}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, message, hint })
  });

  document.getElementById("status").innerText = "Sent!";
  document.getElementById("message").value = "";
}

// ==========================
// TIME AGO FORMAT
// ==========================
function timeAgo(date) {
  if (!date) return "just now";

  const now = new Date();
  const past = new Date(date);
  const diff = Math.floor((now - past) / 1000);

  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;

  return `${Math.floor(diff / 86400)} days ago`;
}

// ==========================
// RENDER MESSAGE (NEW ON TOP)
// ==========================
function renderMessage(msg) {
  const container = document.getElementById("messages");
  if (!container) return;

  const card = document.createElement("div");
  card.className = `message-card ${msg.type}`;

  const time = timeAgo(msg.createdAt);

  const safeText = (msg.message || "").replace(/</g, "&lt;");

  card.innerHTML = `
    <div class="card-title">${msg.type.toUpperCase()}</div>

    <div class="card-body">${safeText}</div>

    <div class="card-meta">
      FROM: ${msg.hint || "unknown"} <br>
      🕒 ${time}
    </div>

    <div class="card-actions">
      <button onclick="downloadImage('${msg._id}', '${msg.type}', \`${msg.message}\`)">⬇ Download</button>
      <button onclick="shareImage('${msg._id}')">📤 Share</button>
    </div>

    <canvas id="canvas-${msg._id}" style="display:none;"></canvas>
  `;

  // IMPORTANT → NEW ON TOP
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

  const res = await fetch("/messages", {
    headers: { Authorization: token }
  });

  const data = await res.json();

  const username = data.username;
  const messages = data.messages || [];

  const link = document.getElementById("userLink");
  if (link) {
    link.value = `${window.location.origin}/${username}`;
  }

  const container = document.getElementById("messages");
  if (!container) return;

  container.innerHTML = "";

  // reverse ensures newest first if backend is old-first
  messages.reverse().forEach(renderMessage);
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
// CANVAS WRAP TEXT FIXED
// ==========================
function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = String(text).split(" ");
  let line = "";

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + " ";
    const width = ctx.measureText(testLine).width;

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
// DOWNLOAD IMAGE FIXED
// ==========================
function downloadImage(id, type, message) {
  const canvas = document.getElementById(`canvas-${id}`);
  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  canvas.width = 1080;
  canvas.height = 1080;

  ctx.fillStyle = "#0a0a0a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.textAlign = "center";

  ctx.fillStyle = "#ff3c5f";
  ctx.font = "bold 70px Arial";
  ctx.fillText(type.toUpperCase(), canvas.width / 2, 160);

  ctx.fillStyle = "#fff";
  ctx.font = "45px Arial";

  wrapText(ctx, message, canvas.width / 2, 350, 900, 60);

  ctx.fillStyle = "#888";
  ctx.font = "30px Arial";
  ctx.fillText("Truth or Chaos 😈", canvas.width / 2, 1000);

  const link = document.createElement("a");
  link.download = `${type}-message.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

// ==========================
// SHARE IMAGE FIXED
// ==========================
function shareImage(id) {
  const canvas = document.getElementById(`canvas-${id}`);
  if (!canvas) return;

  canvas.toBlob(blob => {
    const file = new File([blob], "message.png", { type: "image/png" });

    if (navigator.share) {
      navigator.share({
        files: [file],
        title: "Truth or Chaos",
        text: "Anonymous message 😈"
      });
    } else {
      alert("Download and share manually");
    }
  });
}

// ==========================
// MODE COLORS SAFE
// ==========================
function updateMode() {
  const type = document.getElementById("type");
  const box = document.getElementById("mainBox");
  if (!type || !box) return;

  box.classList.remove("truth-mode", "chaos-mode", "dare-mode");
  box.classList.add(type.value + "-mode");
}

// ==========================
// LIVE USERS SAFE
// ==========================
let baseUsers = 120;

function updateLiveUsers() {
  const el = document.getElementById("liveUsers");
  if (!el) return;

  baseUsers += Math.floor(Math.random() * 5) - 2;
  if (baseUsers < 80) baseUsers = 80;

  el.innerText = baseUsers;
}

setInterval(updateLiveUsers, 3000);

// ==========================
// AUTO LOAD INBOX
// ==========================
if (window.location.pathname.includes("inbox")) {
  loadInbox();
}