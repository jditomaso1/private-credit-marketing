// /api/auth/check.js
import { google } from "googleapis";
import { getUserFromCookie } from "../../lib/auth.js";

// Keep these consistent with login.js
const SHEET_ID = "1HAV20XTUhhgHEHhhcNBs5UBApWOXSSPqMu3a7Y3iSSg";
const SHEET_RANGE = "Allowlist!A2:E"; // A=email, B=pw, C=enabled, D=role, E=version

// Use the same service account env var you used in login.js
const SERVICE_ACCOUNT = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON_LOGIN);

async function readUsers() {
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
    enabled: (r[2] || "").toLowerCase() === "true",
    role: r[3] || "viewer",
    version: Number(r[4] || 1),
  }));
}

export default async function handler(req, res) {
  try {
    // 1) verify cookie/JWT
    const user = getUserFromCookie(req); // { email, role, ver, iat, exp } or null
    if (!user?.email) return res.status(401).json({ error: "not authorized" });

    // 2) re-check against the Sheet
    const list = await readUsers();
    const row = list.find(u => u.email === String(user.email).toLowerCase());
    if (!row) return res.status(401).json({ error: "not_found" });
    if (!row.enabled) return res.status(401).json({ error: "disabled" });

    // 3) version match → if bumped in Sheet, this invalidates current session
    const tokenVer = Number(user.ver || 1);
    if (row.version !== tokenVer) {
      return res.status(401).json({ error: "revoked" });
    }

    // OK
    return res.status(200).json({ ok: true, email: row.email, role: row.role });
  } catch (e) {
    console.error("auth/check error", e);
    return res.status(401).json({ error: "bad_token" });
  }
}
