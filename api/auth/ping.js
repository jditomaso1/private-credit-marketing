import { google } from "googleapis";

// Same hardcoded values you used in login.js
const SHEET_ID = "1HAV20XTUhhgHEHhhcNBs5UBApWOXSSPqMu3a7Y3iSSg";
const SHEET_RANGE = "Allowlist!A2:G";

function getServiceAccount() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_LOGIN;
  if (!raw) throw new Error("Missing env var GOOGLE_SERVICE_ACCOUNT_JSON_LOGIN");
  try { return JSON.parse(raw); } catch { throw new Error("Invalid JSON in GOOGLE_SERVICE_ACCOUNT_JSON_LOGIN"); }
}

export default async function handler(req, res) {
  try {
    const svc = getServiceAccount();
    const jwtClient = new google.auth.JWT(
      svc.client_email,
      null,
      svc.private_key,
      ["https://www.googleapis.com/auth/spreadsheets.readonly"]
    );
    await jwtClient.authorize();

    const sheets = google.sheets({ version: "v4", auth: jwtClient });
    const r = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: SHEET_RANGE,
    });

    const rows = r.data.values || [];
    // Return the first 2 rows (masked) so we know it worked
    const preview = rows.slice(0, 2).map(a => [
      (a[0]||"").toLowerCase(), a[1] ? "***" : "", a[2], a[3]
    ]);
    res.status(200).json({ ok: true, rows: preview, total: rows.length });
  } catch (e) {
    console.error("PING ERROR:", e?.message || e);
    res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
}
