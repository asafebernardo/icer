import crypto from "node:crypto";
import { google } from "googleapis";
import { nowIso, randomToken, sha256Hex } from "./security.js";

const TOKENS_KEY = "google_oauth_tokens_v1";
const STATE_COLLECTION = "auth_google_oauth_states_v1";

function getEncKey() {
  const raw = String(process.env.ICER_GOOGLE_OAUTH_ENC_KEY || "").trim();
  if (!raw) return null;
  return crypto.createHash("sha256").update(raw).digest();
}

function encryptJson(obj) {
  const key = getEncKey();
  const plain = JSON.stringify(obj || {});
  if (!key) return `plain:${plain}`;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `gcm:${iv.toString("base64url")}.${tag.toString("base64url")}.${enc.toString("base64url")}`;
}

function decryptJson(s) {
  const raw = String(s || "");
  if (!raw) return null;
  if (raw.startsWith("plain:")) {
    try {
      return JSON.parse(raw.slice("plain:".length));
    } catch {
      return null;
    }
  }
  if (!raw.startsWith("gcm:")) return null;
  const key = getEncKey();
  if (!key) return null;
  const body = raw.slice("gcm:".length);
  const [ivB64, tagB64, dataB64] = body.split(".");
  if (!ivB64 || !tagB64 || !dataB64) return null;
  try {
    const iv = Buffer.from(ivB64, "base64url");
    const tag = Buffer.from(tagB64, "base64url");
    const data = Buffer.from(dataB64, "base64url");
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    const out = Buffer.concat([decipher.update(data), decipher.final()]);
    return JSON.parse(out.toString("utf8"));
  } catch {
    return null;
  }
}

function baseUrlFromRequest(req) {
  const env = String(process.env.ICER_PUBLIC_BASE_URL || "").trim();
  if (env) return env.replace(/\/+$/, "");
  const proto = String(req.headers["x-forwarded-proto"] || req.protocol || "http").split(",")[0].trim();
  const host = String(req.headers["x-forwarded-host"] || req.headers.host || "").split(",")[0].trim();
  if (!host) return "";
  return `${proto}://${host}`;
}

export function buildOAuthClient(cfg, redirectUri) {
  return new google.auth.OAuth2(cfg.client_id, cfg.client_secret, redirectUri);
}

export async function getGoogleTokensSafe(db) {
  const row = await db.collection("app_kv").findOne({ key: TOKENS_KEY }, { projection: { _id: 0, value: 1 } });
  const v = row?.value && typeof row.value === "object" ? row.value : null;
  if (!v || !v.enc) return { connected: false };
  const decoded = decryptJson(v.enc);
  if (!decoded) return { connected: false };
  return {
    connected: true,
    connected_email: String(decoded.connected_email || "").trim(),
    scopes: decoded.scopes || [],
    updated_at: decoded.updated_at || null,
  };
}

export async function disconnectGoogle(db) {
  await db.collection("app_kv").deleteOne({ key: TOKENS_KEY });
}

export async function createGoogleOauthState(db, userId, { redirectTo } = {}) {
  const state = randomToken();
  const token_hash = sha256Hex(state);
  const now = nowIso();
  const expires_at = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  await db.collection(STATE_COLLECTION).insertOne({
    token_hash,
    user_id: userId,
    created_at: now,
    expires_at,
    redirect_to: redirectTo || "/Dashboard?tab=google",
  });
  return state;
}

export async function consumeGoogleOauthState(db, state) {
  const token_hash = sha256Hex(state);
  const now = nowIso();
  const row = await db.collection(STATE_COLLECTION).findOneAndDelete({
    token_hash,
    expires_at: { $gt: now },
  });
  return row?.value || null;
}

export function oauthScopes() {
  return [
    "https://www.googleapis.com/auth/drive.file",
    "openid",
    "email",
    "profile",
  ];
}

export async function exchangeCodeAndStoreTokens(db, oauth2, code) {
  const { tokens } = await oauth2.getToken(String(code || "").trim());
  oauth2.setCredentials(tokens);

  // obtém email do user
  let connected_email = "";
  try {
    const oauth2api = google.oauth2({ version: "v2", auth: oauth2 });
    const me = await oauth2api.userinfo.get();
    connected_email = String(me?.data?.email || "").trim();
  } catch {
    connected_email = "";
  }

  const payload = {
    refresh_token: tokens.refresh_token || "",
    access_token: tokens.access_token || "",
    expiry_date: tokens.expiry_date || null,
    scope: tokens.scope || "",
    token_type: tokens.token_type || "",
    connected_email,
    updated_at: nowIso(),
  };

  // Se não veio refresh_token (Google às vezes não devolve se já deu antes), mantém o anterior.
  const prevRow = await db.collection("app_kv").findOne({ key: TOKENS_KEY }, { projection: { _id: 0, value: 1 } });
  const prev = prevRow?.value?.enc ? decryptJson(prevRow.value.enc) : null;
  if (!payload.refresh_token && prev?.refresh_token) {
    payload.refresh_token = prev.refresh_token;
  }

  const enc = encryptJson(payload);
  await db.collection("app_kv").updateOne(
    { key: TOKENS_KEY },
    { $set: { key: TOKENS_KEY, value: { enc }, updated_at: payload.updated_at } },
    { upsert: true },
  );
  return { connected_email };
}

export async function getAuthorizedDriveClient(db, cfg, redirectUri) {
  const oauth2 = buildOAuthClient(cfg, redirectUri);
  const row = await db.collection("app_kv").findOne({ key: TOKENS_KEY }, { projection: { _id: 0, value: 1 } });
  const decoded = row?.value?.enc ? decryptJson(row.value.enc) : null;
  if (!decoded?.refresh_token) {
    return { ok: false, message: "google_not_connected" };
  }
  oauth2.setCredentials({ refresh_token: decoded.refresh_token });
  // garante access token atualizado
  await oauth2.getAccessToken();
  return { ok: true, oauth2, drive: google.drive({ version: "v3", auth: oauth2 }) };
}

export function buildGoogleAuthUrl(req, cfg, state) {
  const base = baseUrlFromRequest(req);
  const redirectUri = `${base}/api/auth/google/callback`;
  const oauth2 = buildOAuthClient(cfg, redirectUri);
  const url = oauth2.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: oauthScopes(),
    state,
    include_granted_scopes: true,
  });
  return { url, redirectUri };
}

export function callbackRedirectBase(req) {
  return baseUrlFromRequest(req) || "";
}

