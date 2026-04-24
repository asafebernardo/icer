import crypto from "node:crypto";
import { authenticator } from "otplib";
import { randomToken, sha256Hex } from "./security.js";

function getEncKey() {
  const raw = String(process.env.ICER_TOTP_ENC_KEY || "").trim();
  if (!raw) return null;
  return crypto.createHash("sha256").update(raw).digest(); // 32 bytes
}

export function isTotpEnforcementEnabled() {
  const v = String(process.env.ICER_TOTP_ENFORCE || "").trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes" || v === "on";
}

export function totpGraceDays() {
  const n = Number(process.env.ICER_TOTP_GRACE_DAYS || 3);
  if (!Number.isFinite(n) || n <= 0) return 3;
  return Math.min(30, Math.max(1, Math.floor(n)));
}

export function generateTotpSecret() {
  return authenticator.generateSecret(); // base32
}

export function totpVerify(secret, token) {
  try {
    return authenticator.check(String(token || "").trim(), String(secret || "").trim());
  } catch {
    return false;
  }
}

export function encryptTotpSecret(plain) {
  const key = getEncKey();
  if (!key) {
    // Dev fallback: não criptografa sem chave (para não quebrar dev). Em produção, defina ICER_TOTP_ENC_KEY.
    return `plain:${String(plain || "")}`;
  }
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(String(plain || ""), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `gcm:${iv.toString("base64url")}.${tag.toString("base64url")}.${enc.toString("base64url")}`;
}

export function decryptTotpSecret(enc) {
  const s = String(enc || "");
  if (!s) return "";
  if (s.startsWith("plain:")) return s.slice("plain:".length);
  if (!s.startsWith("gcm:")) return "";
  const key = getEncKey();
  if (!key) return "";
  const body = s.slice("gcm:".length);
  const [ivB64, tagB64, dataB64] = body.split(".");
  if (!ivB64 || !tagB64 || !dataB64) return "";
  const iv = Buffer.from(ivB64, "base64url");
  const tag = Buffer.from(tagB64, "base64url");
  const data = Buffer.from(dataB64, "base64url");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const out = Buffer.concat([decipher.update(data), decipher.final()]);
  return out.toString("utf8");
}

export function generateRecoveryCodes(count = 10) {
  const n = Math.min(30, Math.max(5, Number(count) || 10));
  const codes = [];
  for (let i = 0; i < n; i += 1) {
    // 10-12 chars, URL-safe
    codes.push(randomToken().slice(0, 10));
  }
  return codes;
}

export function hashRecoveryCode(code) {
  return sha256Hex(String(code || "").trim().toLowerCase());
}

