// api/auth/login.js
import { google } from "googleapis";
import jwt from "jsonwebtoken";
import cookie from "cookie";
import bcrypt from "bcryptjs"; // optional, used in hashed flavor

const SERVICE_ACCOUNT = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
const SHEET_ID = process.env.SHEET_ID;
const SHEET_RANGE = process.env.SHEET_RANGE || "Allowlist!A2:G";
const JWT_SECRET = process.env.JWT_SECRET;
const COOKIE_NAME = process.env.COOKIE_NAME || "pcai_session";
const SESSION_MAX_AGE = Number(process.env.SESSION_MAX_AGE || 86400); // seconds

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
  // returns array of objects by header mapping - assume fixed columns
  return rows.map(r => ({
    email: (r[0]||"").toLowerCase(),
    pw: r[1] || "",
    enabled: (r[2]||"").toLowerCase() === "true",
    role: r[3] || "viewer",
  }));
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "missing" });

  // Basic rate limiting (very lightweight) — you should replace with real rate limiting
  // e.g., store attempts in Redis or rely on platform WAF
  try {
    const rows = await readSheetRows();
    const row = rows.find(r => r.email === email.toLowerCase());
    if (!row || !row.enabled) return res.status(401).json({ error: "invalid" });

    const stored = row.pw;
    let ok = false;

    // --- Flavor A: plain text comparison (fastest)
    if (stored === password) ok = true;

    // --- Flavor B: hashed stored value (bcrypt)
    // If stored looks like a bcrypt hash start with $2, verify:
    if (!ok && stored && stored.startsWith("$2")) {
      ok = await bcrypt.compare(password, stored);
    }

    if (!ok) return res.status(401).json({ error: "invalid" });

    // Create session JWT payload
    const payload = { email: row.email, role: row.role };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: SESSION_MAX_AGE });

    // Set secure cookie
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
