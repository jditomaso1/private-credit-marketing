// /lib/auth.js
import jwt from "jsonwebtoken";

// Hardcode for now to match login.js
const JWT_SECRET = "super-long-random-secret-string-change-me";
const COOKIE_NAME = "pcai_session";

export function getUserFromCookie(req) {
  const raw = req.headers.cookie || "";
  const map = Object.fromEntries(
    raw
      .split(";")
      .map(x => x.split("=").map(s => s.trim()))
      .filter(a => a[0] && a[1])
  );
  const token = map[COOKIE_NAME];
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET); // { email, role, iat, exp }
  } catch {
    return null;
  }
}
