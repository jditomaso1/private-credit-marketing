// /api/auth/login.js
import { google } from "googleapis";
import jwt from "jsonwebtoken";
import cookie from "cookie";
import bcrypt from "bcryptjs"; // optional, used in hashed flavor

// --- HARDCODED CONFIG ---
// Replace these with your actual sheet info and secrets
const SERVICE_ACCOUNT = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON_LOGIN);

// The Sheet ID from your Google Sheet URL
const SHEET_ID = "1HAV20XTUhhgHEHhhcNBs5UBApWOXSSPqMu3a7Y3iSSg"; 
// Example: "1AbCDeFgHIJKlmNoPqrStuVwxYz12345"

// The tab and range where your allowlist lives
const SHEET_RANGE = "Allowlist!A2:G";

// JWT secret (make it long + random; can just be a string for now)
const JWT_SECRET = "super-long-random-secret-string-change-me";

// Cookie name
const COOKIE_NAME = "pcai_session";

// Session max age (in seconds) — here: 1 day
const SESSION_MAX_AGE = 86400;

// --- HELPERS ---
async function readSheetRows() {
  const jwtClient = new google.auth.JWT(
    SERVICE_ACCOUNT.client_email,
    null,
    SERVICE_ACCOUNT.private_key,
    ["https://www.googleapis.com/auth/spreadsheets.readonly"]
  );
  await jwtClient.authorize();
  const sheets = google.sheets({ version: "v4", auth: jwtClient });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: SHEET_RANGE,
  });
  const rows = res.data.values || [];
  return rows.map(r => ({
    email: (r[0] || "").toLowerCase(),
    pw: r[1] || "",
    enabled: (r[2] || "").toLowerCase() === "true",
    role: r[3] || "viewer",
  }));
}

// --- HANDLER ---
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "missing" });

  try {
    const rows = await readSheetRows();
    const row = rows.find(r => r.email === email.toLowerCase());
    if (!row || !row.enabled) return res.status(401).json({ error: "invalid" });

    const stored = row.pw;
    let ok = false;

    // Flavor A: plain text match
    if (stored === password) ok = true;

    // Flavor B: bcrypt hash check
    if (!ok && stored && stored.startsWith("$2")) {
      ok = await bcrypt.compare(password, stored);
    }

    if (!ok) return res.status(401).json({ error: "invalid" });

    // Create JWT
    const payload = { email: row.email, role: row.role };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: SESSION_MAX_AGE });

    // Set cookie
    res.setHeader("Set-Cookie", cookie.serialize(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    }));

    return res.status(200).json({ ok: true, email: row.email, role: row.role });
  } catch (err) {
    console.error("auth error", err);
    return res.status(500).json({ error: "server" });
  }
}
