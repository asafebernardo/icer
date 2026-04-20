import crypto from "node:crypto";

export function nowIso() {
  return new Date().toISOString();
}

export function addDaysIso(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export function randomToken() {
  return crypto.randomBytes(32).toString("base64url");
}

export function sha256Hex(s) {
  return crypto.createHash("sha256").update(String(s)).digest("hex");
}

