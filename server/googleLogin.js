import { nowIso, randomToken } from "./security.js";

export const GOOGLE_LOGIN_OAUTH_STATES = "auth_google_login_oauth_states_v1";

/** Base pública (ex.: https://site.com) sem barra final. */
export function googleLoginPublicBase() {
  return String(process.env.ICER_PUBLIC_BASE_URL || "")
    .trim()
    .replace(/\/+$/, "");
}

export function parseGoogleLoginAllowedEmails() {
  const raw = String(process.env.ICER_GOOGLE_LOGIN_ALLOWED_EMAILS || "").trim();
  if (!raw) return [];
  return raw
    .split(/[\s,;]+/)
    .map((e) => e.toLowerCase().trim())
    .filter(Boolean);
}

export function isGoogleLoginConfigured() {
  const base = googleLoginPublicBase();
  const clientId = String(process.env.ICER_GOOGLE_LOGIN_CLIENT_ID || "").trim();
  const clientSecret = String(process.env.ICER_GOOGLE_LOGIN_CLIENT_SECRET || "").trim();
  const allow = parseGoogleLoginAllowedEmails();
  return Boolean(base && clientId && clientSecret && allow.length > 0);
}

export function isEmailAllowedForGoogleLogin(email) {
  const e = String(email || "").toLowerCase().trim();
  if (!e) return false;
  return new Set(parseGoogleLoginAllowedEmails()).has(e);
}

export function googleLoginRedirectUri() {
  const base = googleLoginPublicBase();
  if (!base) return "";
  return `${base}/api/auth/google-login/callback`;
}

/**
 * @param {{ redirectUri: string; state: string }} p
 */
export function buildGoogleLoginAuthorizeUrl(p) {
  const clientId = String(process.env.ICER_GOOGLE_LOGIN_CLIENT_ID || "").trim();
  const u = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  u.searchParams.set("client_id", clientId);
  u.searchParams.set("redirect_uri", p.redirectUri);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("scope", "openid email profile");
  u.searchParams.set("state", p.state);
  u.searchParams.set("access_type", "online");
  u.searchParams.set("prompt", "select_account");
  return u.toString();
}

/**
 * @param {import("mongodb").Db} db
 * @param {{ force_new_session?: boolean }} opts
 * @returns {Promise<string>} state opaco para OAuth
 */
export async function createGoogleLoginOauthState(db, opts = {}) {
  const state = randomToken();
  const now = nowIso();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  await db.collection(GOOGLE_LOGIN_OAUTH_STATES).insertOne({
    state,
    force_new_session: opts.force_new_session === true,
    created_at: now,
    expires_at: expiresAt,
  });
  return state;
}

/**
 * @param {import("mongodb").Db} db
 * @param {string} stateRaw
 * @returns {Promise<{ force_new_session: boolean } | null>}
 */
export async function consumeGoogleLoginOauthState(db, stateRaw) {
  const state = String(stateRaw || "").trim();
  if (!state) return null;
  const now = nowIso();
  const row = await db.collection(GOOGLE_LOGIN_OAUTH_STATES).findOne({
    state,
    expires_at: { $gt: now },
  });
  if (!row) return null;
  await db.collection(GOOGLE_LOGIN_OAUTH_STATES).deleteOne({ state });
  return { force_new_session: row.force_new_session === true };
}

/**
 * @param {{ code: string; redirectUri: string }} p
 * @returns {Promise<{ email: string }>}
 */
export async function exchangeGoogleLoginCodeForEmail(p) {
  const client_id = String(process.env.ICER_GOOGLE_LOGIN_CLIENT_ID || "").trim();
  const client_secret = String(process.env.ICER_GOOGLE_LOGIN_CLIENT_SECRET || "").trim();
  const body = new URLSearchParams({
    code: String(p.code || "").trim(),
    client_id,
    client_secret,
    redirect_uri: p.redirectUri,
    grant_type: "authorization_code",
  });
  const tr = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!tr.ok) {
    throw new Error("google_token_exchange_failed");
  }
  const tok = await tr.json();
  const access = String(tok.access_token || "").trim();
  if (!access) throw new Error("google_no_access_token");
  const ur = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${access}` },
  });
  if (!ur.ok) throw new Error("google_userinfo_failed");
  const info = await ur.json();
  const email = String(info.email || "").toLowerCase().trim();
  const emailVerified = info.email_verified === true || info.email_verified === "true";
  if (!email) throw new Error("google_no_email");
  if (!emailVerified) throw new Error("google_email_unverified");
  return { email };
}
