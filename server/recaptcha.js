import crypto from "node:crypto";
import { envBoolTrue } from "./envFlags.js";

const SITEVERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";
export const SITE_ACCESS_COOKIE = "icer_recaptcha_site";
const SITE_ACCESS_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export const RECAPTCHA_ACTIONS = {
  SITE_ACCESS: "site_access",
  LOGIN: "login",
  GOOGLE_LOGIN: "google_login",
};

export function isRecaptchaDisabled() {
  return envBoolTrue("ICER_RECAPTCHA_DISABLED");
}

export function getRecaptchaSecretKey() {
  return String(process.env.ICER_RECAPTCHA_SECRET_KEY || "").trim();
}

export function getRecaptchaSiteKey() {
  return String(
    process.env.ICER_RECAPTCHA_SITE_KEY ||
      process.env.VITE_RECAPTCHA_SITE_KEY ||
      "",
  ).trim();
}

export function getRecaptchaVersion() {
  const v = String(process.env.ICER_RECAPTCHA_VERSION || "v3")
    .trim()
    .toLowerCase();
  return v === "v2" ? "v2" : "v3";
}

export function isRecaptchaEnforced() {
  if (isRecaptchaDisabled()) return false;
  if (getRecaptchaSecretKey()) return true;
  return process.env.NODE_ENV === "production" && Boolean(getRecaptchaSiteKey());
}

/** @returns {{ enabled: boolean; site_key: string | null; version: "v3" | "v2" | null; enforced: boolean }} */
export function publicRecaptchaConfig() {
  const siteKey = getRecaptchaSiteKey();
  const enforced = isRecaptchaEnforced();
  if (!siteKey || isRecaptchaDisabled()) {
    return { enabled: false, site_key: null, version: null, enforced: false };
  }
  return {
    enabled: true,
    site_key: siteKey,
    version: getRecaptchaVersion(),
    enforced,
  };
}

function siteAccessSecret() {
  return String(
    process.env.ICER_RECAPTCHA_SITE_COOKIE_SECRET ||
      process.env.ICER_SESSION_SECRET ||
      getRecaptchaSecretKey() ||
      "icer-recaptcha-dev",
  ).trim();
}

function readMinScore() {
  const n = Number(process.env.ICER_RECAPTCHA_MIN_SCORE);
  return Number.isFinite(n) ? n : 0.5;
}

/**
 * @param {unknown} token
 * @param {{ remoteIp?: string; expectedAction?: string; minScore?: number }} [options]
 */
export async function verifyRecaptchaToken(token, options = {}) {
  const { remoteIp, expectedAction, minScore = readMinScore() } = options;

  if (isRecaptchaDisabled()) {
    return { ok: true, skipped: true };
  }

  const secret = getRecaptchaSecretKey();
  if (!secret) {
    if (process.env.NODE_ENV !== "production") {
      return { ok: true, skipped: true };
    }
    return { ok: false, code: "recaptcha_not_configured" };
  }

  const response = String(token || "").trim();
  if (!response) {
    return { ok: false, code: "recaptcha_required" };
  }

  const body = new URLSearchParams({ secret, response });
  if (remoteIp) body.set("remoteip", String(remoteIp).slice(0, 128));

  /** @type {{ success?: boolean; score?: number; action?: string; "error-codes"?: string[] }} */
  let json;
  try {
    const res = await fetch(SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    json = await res.json();
  } catch {
    return { ok: false, code: "recaptcha_unreachable" };
  }

  if (!json?.success) {
    return {
      ok: false,
      code: "recaptcha_invalid",
      errors: json?.["error-codes"],
    };
  }

  if (getRecaptchaVersion() !== "v2") {
    const score = typeof json.score === "number" ? json.score : 0;
    if (score < minScore) {
      return { ok: false, code: "recaptcha_low_score", score };
    }
    if (expectedAction) {
      const action = String(json.action || "");
      if (action !== expectedAction) {
        return { ok: false, code: "recaptcha_action_mismatch" };
      }
    }
  }

  return { ok: true, score: json.score, action: json.action };
}

export function createSiteAccessCookieValue() {
  const exp = Date.now() + SITE_ACCESS_MAX_AGE_MS;
  const payload = Buffer.from(JSON.stringify({ exp }), "utf8").toString("base64url");
  const sig = crypto
    .createHmac("sha256", siteAccessSecret())
    .update(payload)
    .digest("base64url");
  return { value: `${payload}.${sig}`, maxAgeMs: SITE_ACCESS_MAX_AGE_MS };
}

/** @param {unknown} raw */
export function verifySiteAccessCookie(raw) {
  if (!isRecaptchaEnforced()) return true;
  const value = String(raw || "").trim();
  if (!value) return false;
  const dot = value.lastIndexOf(".");
  if (dot <= 0) return false;
  const payload = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  const expected = crypto
    .createHmac("sha256", siteAccessSecret())
    .update(payload)
    .digest("base64url");
  if (sig.length !== expected.length) return false;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    return false;
  }
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    const exp = Number(data?.exp);
    return Number.isFinite(exp) && exp > Date.now();
  } catch {
    return false;
  }
}

/**
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {{ expectedAction: string }} options
 * @returns {Promise<boolean>}
 */
export async function requireRecaptchaToken(req, res, options) {
  if (!isRecaptchaEnforced()) return true;
  const token =
    req.body?.recaptcha_token ??
    req.query?.recaptcha_token ??
    req.headers["x-recaptcha-token"];
  const result = await verifyRecaptchaToken(token, {
    remoteIp: String(req.ip || req.socket?.remoteAddress || ""),
    expectedAction: options.expectedAction,
  });
  if (!result.ok) {
    res.status(403).json({ message: result.code });
    return false;
  }
  return true;
}
