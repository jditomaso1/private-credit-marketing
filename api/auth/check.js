// /api/auth/check.js
import { getUserFromCookie } from "../../lib/auth.js";

export default function handler(req, res) {
  const user = getUserFromCookie(req);
  if (!user) return res.status(401).json({ error: "not authorized" });
  res.status(200).json({ ok: true, user });
}
