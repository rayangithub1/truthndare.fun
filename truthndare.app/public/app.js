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
  if (!canvas) {
    console.error("Canvas not found");
    return;
  }

  const ctx = canvas.getContext("2d");

  // Instagram-safe portrait size
  canvas.width = 1080;
  canvas.height = 1350;

  // =========================
  // BACKGROUND (CYBER DARK GRADIENT)
  // =========================
  const bg = ctx.createLinearGradient(0, 0, 1080, 1350);
  bg.addColorStop(0, "#050816");
  bg.addColorStop(0.5, "#0b1026");
  bg.addColorStop(1, "#05060f");

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // =========================
  // GLOW ORBS (CYBER STYLE)
  // =========================
  drawGlow(ctx, 200, 250, "rgba(139,92,246,0.25)");
  drawGlow(ctx, 900, 300, "rgba(34,197,94,0.18)");
  drawGlow(ctx, 600, 1100, "rgba(239,68,68,0.15)");

  // =========================
  // MAIN GLASS CARD
  // =========================
  const stroke =
    type === "truth"
      ? "#22c55e"
      : type === "chaos"
      ? "#eab308"
      : "#ef4444";

  roundRect(ctx, 90, 180, 900, 900, 30);

  ctx.fillStyle = "rgba(255,255,255,0.05)";
  ctx.fill();

  ctx.strokeStyle = stroke;
  ctx.lineWidth = 3;
  ctx.stroke();

  // =========================
  // HEADER TYPE
  // =========================
  ctx.textAlign = "left";

  ctx.font = "bold 60px Arial";
  ctx.fillStyle = stroke;
  ctx.fillText(type.toUpperCase(), 130, 300);

  // subtitle
  ctx.font = "22px Arial";
  ctx.fillStyle = "#94a3b8";
  ctx.fillText("ANONYMOUS SIGNAL TRANSMISSION", 130, 340);

  // =========================
  // MESSAGE TEXT
  // =========================
  ctx.fillStyle = "#ffffff";
  ctx.font = "48px Arial";

  wrapText(ctx, message, 130, 450, 820, 70);

  // =========================
  // FOOTER BRAND (UPDATED DOMAIN)
  // =========================
  ctx.textAlign = "center";
  ctx.fillStyle = "#64748b";
  ctx.font = "26px Arial";

  ctx.fillText(
    "truthndare.app • anonymous social chaos",
    540,
    1220
  );

  // =========================
  // DOWNLOAD (FIXED RELIABLE METHOD)
  // =========================
  setTimeout(() => {
    const dataURL = canvas.toDataURL("image/png");

    const link = document.createElement("a");
    link.href = dataURL;
    link.download = `${type}-post.png`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, 120);
}

/* =========================
   GLOW ORB EFFECT
========================= */
function drawGlow(ctx, x, y, color) {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, 300);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, "transparent");

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, 300, 0, Math.PI * 2);
  ctx.fill();
}

/* =========================
   ROUNDED RECTANGLE
========================= */
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/* =========================
   TEXT WRAPPING
========================= */
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
