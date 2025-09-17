// /api/auth/login.js
import { google } from "googleapis";
import jwt from "jsonwebtoken";
import cookie from "cookie";
import bcrypt from "bcryptjs";

// --- HARDCODED CONFIG ---
const SERVICE_ACCOUNT = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON_LOGIN);
const SHEET_ID = "1HAV20XTUhhgHEHhhcNBs5UBApWOXSSPqMu3a7Y3iSSg";
const SHEET_RANGE = "Allowlist!A2:G";
const JWT_SECRET = "super-long-random-secret-string-change-me";
const COOKIE_NAME = "pcai_session";
const SESSION_MAX_AGE = 86400;

// Lazy-load and validate service account JSON at runtime
function getServiceAccount() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_LOGIN;
  if (!raw) {
    throw new Error("Missing env var GOOGLE_SERVICE_ACCOUNT_JSON_LOGIN");
  }
  try {
    return JSON.parse(raw);
  } catch (e) {
    throw new Error("Invalid JSON in GOOGLE_SERVICE_ACCOUNT_JSON_LOGIN");
  }
}

async function readSheetRows() {
  const SERVICE_ACCOUNT = getServiceAccount();
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
    email: (r[0] || "").toLowerCase().trim(),
    pw: (r[1] || "").trim(),
    enabled: String(r[2] || "").toLowerCase().trim() === "true",
    role: (r[3] || "viewer").trim(),
  }));
}

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
    email: (r[0] || "").toLowerCase().trim(),
    pw: (r[1] || "").trim(),
    enabled: String(r[2] || "").toLowerCase().trim() === "true",
    role: (r[3] || "viewer").trim(),
  }));
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "method_not_allowed" });
  }

  // --- Parse body robustly (fallback if req.body is empty) ---
  let body = req.body;
  if (!body || typeof body !== "object") {
    try {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const text = Buffer.concat(chunks).toString();
      body = text ? JSON.parse(text) : {};
    } catch (e) {
      console.error("Body parse error:", e);
      return res.status(400).json({ error: "bad_json_body" });
    }
  }

  const rawEmail = (body.email || "").toLowerCase().trim();
  const password = (body.password || "").trim();
  if (!rawEmail || !password) {
    return res.status(400).json({ error: "missing" });
  }

  try {
    const rows = await readSheetRows();
    const row = rows.find(r => r.email === rawEmail);

    if (!row) {
      console.warn("Login email not found in sheet:", rawEmail);
      return res.status(401).json({ error: "invalid" });
    }
    if (!row.enabled) {
      console.warn("Login email disabled:", rawEmail);
      return res.status(401).json({ error: "invalid" });
    }

    const stored = row.pw;
    let ok = false;

    if (stored === password) ok = true; // plain text
    if (!ok && stored && stored.startsWith("$2")) {
      ok = await bcrypt.compare(password, stored); // bcrypt
    }

    if (!ok) {
      console.warn("Password mismatch for:", rawEmail);
      return res.status(401).json({ error: "invalid" });
    }

    const payload = { email: row.email, role: row.role };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: SESSION_MAX_AGE });

    res.setHeader(
      "Set-Cookie",
      cookie.serialize(COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: SESSION_MAX_AGE,
      })
    );

    return res.status(200).json({ ok: true, email: row.email, role: row.role });
  } catch (err) {
    console.error("auth error", err);
    // Add a hint for the most common root causes:
    // - Service account JSON missing/var name mismatch
    // - Sheets API not enabled
    // - Sheet not shared to service account
    // - Wrong SHEET_ID or SHEET_RANGE
    return res.status(500).json({ error: "server" });
  }
}
