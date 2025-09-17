// /api/auth/logout.js
import cookie from "cookie";
const COOKIE_NAME = process.env.COOKIE_NAME || "pcai_session";

export default function handler(req, res) {
  res.setHeader(
    "Set-Cookie",
    cookie.serialize(COOKIE_NAME, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0, // expire immediately
    })
  );
  res.status(200).json({ ok: true });
}
