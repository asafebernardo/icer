import argon2 from "argon2";
import { randomToken, sha256Hex, nowIso, addDaysIso } from "./security.js";

const COOKIE_NAME = process.env.ICER_SESSION_COOKIE_NAME || "icer_session";

function cookieOptions() {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    path: "/",
    // Em produção, prefira HTTPS + secure=true
  };
}

export function getCookieName() {
  return COOKIE_NAME;
}

export async function hashPassword(plain) {
  return argon2.hash(String(plain), { type: argon2.argon2id });
}

export async function verifyPassword(hash, plain) {
  try {
    return await argon2.verify(String(hash), String(plain));
  } catch {
    return false;
  }
}

export function setSessionCookie(res, token) {
  res.cookie(COOKIE_NAME, token, cookieOptions());
}

export function clearSessionCookie(res) {
  res.clearCookie(COOKIE_NAME, cookieOptions());
}

export function createSession(db, userId, { days = 14 } = {}) {
  const token = randomToken();
  const token_hash = sha256Hex(token);
  const created_at = nowIso();
  const expires_at = addDaysIso(days);
  db.prepare(
    `INSERT INTO sessions (user_id, token_hash, created_at, expires_at)
     VALUES (?, ?, ?, ?)`,
  ).run(userId, token_hash, created_at, expires_at);
  return { token, expires_at };
}

export function deleteSessionByToken(db, token) {
  const token_hash = sha256Hex(token);
  db.prepare(`DELETE FROM sessions WHERE token_hash = ?`).run(token_hash);
}

export function getSessionUser(db, token) {
  if (!token) return null;
  const token_hash = sha256Hex(token);
  const row = db
    .prepare(
      `SELECT u.id, u.email, u.full_name, u.role, u.funcao
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ?
         AND s.expires_at > ?`,
    )
    .get(token_hash, nowIso());
  return row || null;
}

export function requireAuth(req, res, next) {
  if (!req.user) {
    res.status(401).json({ message: "auth_required" });
    return;
  }
  next();
}

export function requireAdmin(req, res, next) {
  if (!req.user) {
    res.status(401).json({ message: "auth_required" });
    return;
  }
  if (req.user.role !== "admin") {
    res.status(403).json({ message: "admin_required" });
    return;
  }
  next();
}

