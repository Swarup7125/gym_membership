/**
 * Prime Fitness — Backend (Express)
 * - Serves the static frontend
 * - Provides simple admin session auth
 * - Stores members in a local JSON file (no database required)
 *
 * Run:
 *   npm install
 *   npm start
 *
 * Env (optional):
 *   ADMIN_USER=admin
 *   ADMIN_PASS=admin123
 *   SESSION_SECRET=change-me
 *   PORT=3000
 */

const path = require("path");
const fs = require("fs/promises");
const express = require("express");
const session = require("express-session");

const app = express();

const PORT = Number(process.env.PORT || 3000);
const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASS = process.env.ADMIN_PASS || "admin123";
const SESSION_SECRET = process.env.SESSION_SECRET || "prime-fitness-dev-secret";

const DATA_DIR = path.join(__dirname, "data");
const MEMBERS_FILE = path.join(DATA_DIR, "members.json");

app.disable("x-powered-by");
app.use(express.json({ limit: "50kb" }));

app.use(
  session({
    name: "primefitness.sid",
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: false, // set true behind https
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  })
);

function todayISODate() {
  return new Date().toISOString().slice(0, 10);
}

function parseISODate(iso) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  if (Number.isNaN(dt.getTime())) return null;
  return dt;
}

function isoFromDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addMonthsClamped(date, months) {
  const d = new Date(date.getTime());
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, lastDay));
  return d;
}

function calculateExpiryISO(joinISO, plan) {
  const join = parseISODate(joinISO);
  if (!join) return "";
  let expiry;
  if (plan === "Monthly") expiry = addMonthsClamped(join, 1);
  else if (plan === "Quarterly") expiry = addMonthsClamped(join, 3);
  else if (plan === "Yearly") expiry = addMonthsClamped(join, 12);
  else return "";
  return isoFromDate(expiry);
}

function sanitizePhone(phone) {
  return String(phone || "").replace(/[^\d+]/g, "").trim();
}

function uid() {
  return `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

async function ensureDataFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(MEMBERS_FILE);
  } catch {
    // Seed sample data the first time.
    const now = parseISODate(todayISODate());
    const d = (daysAgo) => isoFromDate(new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000));

    const samples = [
      {
        id: uid(),
        name: "Sai Kumar",
        phone: "+91 9876543210",
        email: "sai@example.com",
        plan: "Monthly",
        joinDate: d(10),
      },
      {
        id: uid(),
        name: "Ananya Sharma",
        phone: "+91 9123456780",
        email: "ananya@example.com",
        plan: "Quarterly",
        joinDate: d(40),
      },
      {
        id: uid(),
        name: "Rahul Verma",
        phone: "9988776655",
        email: "rahul@example.com",
        plan: "Yearly",
        joinDate: d(400),
      },
    ].map((m) => ({
      ...m,
      phone: sanitizePhone(m.phone),
      expiryDate: calculateExpiryISO(m.joinDate, m.plan),
    }));

    await fs.writeFile(MEMBERS_FILE, JSON.stringify(samples, null, 2), "utf8");
  }
}

async function readMembers() {
  await ensureDataFile();
  const raw = await fs.readFile(MEMBERS_FILE, "utf8");
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : [];
}

async function writeMembers(members) {
  await ensureDataFile();
  await fs.writeFile(MEMBERS_FILE, JSON.stringify(members, null, 2), "utf8");
}

function requireAuth(req, res, next) {
  if (req.session?.isAdmin === true) return next();
  return res.status(401).json({ error: "Unauthorized" });
}

// ------------------------
// Auth routes
// ------------------------

app.get("/api/me", (req, res) => {
  res.json({ loggedIn: req.session?.isAdmin === true });
});

app.post("/api/login", (req, res) => {
  const username = String(req.body?.username || "").trim();
  const password = String(req.body?.password || "");

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password required." });
  }

  if (username === ADMIN_USER && password === ADMIN_PASS) {
    req.session.isAdmin = true;
    return res.json({ ok: true });
  }

  return res.status(401).json({ error: "Invalid credentials." });
});

app.post("/api/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("primefitness.sid");
    res.json({ ok: true });
  });
});

// ------------------------
// Member routes
// ------------------------

app.get("/api/members", requireAuth, async (req, res) => {
  const members = await readMembers();
  res.json({ members });
});

app.post("/api/members", requireAuth, async (req, res) => {
  const name = String(req.body?.name || "").trim();
  const phone = sanitizePhone(req.body?.phone || "");
  const email = String(req.body?.email || "").trim();
  const plan = String(req.body?.plan || "");
  const joinDate = String(req.body?.joinDate || "");

  if (!name || !phone || !plan || !joinDate) {
    return res.status(400).json({ error: "Missing required fields." });
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Invalid email." });
  }

  const expiryDate = calculateExpiryISO(joinDate, plan);
  if (!expiryDate) return res.status(400).json({ error: "Invalid joinDate or plan." });

  const members = await readMembers();
  const member = { id: uid(), name, phone, email, plan, joinDate, expiryDate };
  members.push(member);
  await writeMembers(members);

  res.status(201).json({ member });
});

app.put("/api/members/:id", requireAuth, async (req, res) => {
  const id = String(req.params.id || "");
  const name = String(req.body?.name || "").trim();
  const phone = sanitizePhone(req.body?.phone || "");
  const email = String(req.body?.email || "").trim();
  const plan = String(req.body?.plan || "");
  const joinDate = String(req.body?.joinDate || "");

  if (!id || !name || !phone || !plan || !joinDate) {
    return res.status(400).json({ error: "Missing required fields." });
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Invalid email." });
  }

  const expiryDate = calculateExpiryISO(joinDate, plan);
  if (!expiryDate) return res.status(400).json({ error: "Invalid joinDate or plan." });

  const members = await readMembers();
  const idx = members.findIndex((m) => m.id === id);
  if (idx < 0) return res.status(404).json({ error: "Member not found." });

  const updated = { id, name, phone, email, plan, joinDate, expiryDate };
  members[idx] = updated;
  await writeMembers(members);

  res.json({ member: updated });
});

app.delete("/api/members/:id", requireAuth, async (req, res) => {
  const id = String(req.params.id || "");
  const members = await readMembers();
  const next = members.filter((m) => m.id !== id);
  if (next.length === members.length) return res.status(404).json({ error: "Member not found." });
  await writeMembers(next);
  res.json({ ok: true });
});

// ------------------------
// Frontend (explicit routes)
// ------------------------
// Security: don't serve the whole folder. Only serve the UI files.
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "index.html")));
app.get("/styles.css", (req, res) => res.sendFile(path.join(__dirname, "styles.css")));
app.get("/app.js", (req, res) => res.sendFile(path.join(__dirname, "app.js")));

app.listen(PORT, () => {
  console.log(`Prime Fitness running on http://localhost:${PORT}`);
});

