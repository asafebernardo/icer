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

/**
 * @param {import("mongodb").Db} db
 */
export async function createSession(db, userId, { days = 14 } = {}) {
  const token = randomToken();
  const token_hash = sha256Hex(token);
  const created_at = nowIso();
  const expires_at = addDaysIso(days);
  await db.collection("sessions").insertOne({
    user_id: userId,
    token_hash,
    created_at,
    expires_at,
  });
  return { token, expires_at };
}

/**
 * @param {import("mongodb").Db} db
 */
export async function deleteSessionByToken(db, token) {
  const token_hash = sha256Hex(token);
  await db.collection("sessions").deleteOne({ token_hash });
}

/**
 * @param {import("mongodb").Db} db
 */
export async function getSessionUser(db, token) {
  if (!token) return null;
  const token_hash = sha256Hex(token);
  const now = nowIso();
  const s = await db.collection("sessions").findOne({
    token_hash,
    expires_at: { $gt: now },
  });
  if (!s) return null;
  const u = await db.collection("users").findOne(
    { id: s.user_id },
    { projection: { _id: 0, id: 1, email: 1, full_name: 1, role: 1, funcao: 1 } },
  );
  return u || null;
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
