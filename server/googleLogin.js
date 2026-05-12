import { nowIso, randomToken } from "./security.js";

export const GOOGLE_LOGIN_OAUTH_STATES = "auth_google_login_oauth_states_v1";
export const GOOGLE_LOGIN_CONFIG_KEY = "auth_google_login_config_v1";
const BACKUP_DAYS = new Set(["sun", "mon", "tue", "wed", "thu", "fri", "sat"]);

function cleanPublicBase(value) {
  return String(value || "")
    .trim()
    .replace(/\/+$/, "");
}

/** Base pública (ex.: https://site.com) sem barra final. */
export function googleLoginPublicBase(config) {
  if (config && typeof config === "object" && "public_base_url" in config) {
    return cleanPublicBase(config.public_base_url);
  }
  return cleanPublicBase(process.env.ICER_PUBLIC_BASE_URL);
}

export function parseGoogleLoginAllowedEmails(value = process.env.ICER_GOOGLE_LOGIN_ALLOWED_EMAILS) {
  const raw = Array.isArray(value) ? value.join(",") : String(value || "").trim();
  if (!raw) return [];
  return [...new Set(raw
    .split(/[\s,;]+/)
    .map((e) => e.toLowerCase().trim())
    .filter(Boolean))];
}

function normalizeBackupTime(value, fallback = "02:00") {
  const raw = String(value || "").trim();
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(raw) ? raw : fallback;
}

function normalizeBackupDays(value, fallback = ["mon", "tue", "wed", "thu", "fri"]) {
  if (!Array.isArray(value)) return Array.isArray(fallback) ? fallback : [];
  return [...new Set(value.map((day) => String(day || "").trim().toLowerCase()))].filter(
    (day) => BACKUP_DAYS.has(day),
  );
}

function envGoogleLoginConfig() {
  return {
    enabled: true,
    public_base_url: googleLoginPublicBase(),
    client_id: String(process.env.ICER_GOOGLE_LOGIN_CLIENT_ID || "").trim(),
    client_secret: String(process.env.ICER_GOOGLE_LOGIN_CLIENT_SECRET || "").trim(),
    allowed_emails: parseGoogleLoginAllowedEmails(),
    backup: {
      enabled: false,
      drive_folder_id: "",
      account_email: "",
      schedule_enabled: false,
      time: "02:00",
      days: ["mon", "tue", "wed", "thu", "fri"],
      timezone: "America/Sao_Paulo",
    },
  };
}

function normalizeGoogleLoginConfig(value, fallback = envGoogleLoginConfig()) {
  const v = value && typeof value === "object" ? value : {};
  const backup = v.backup && typeof v.backup === "object" ? v.backup : {};
  const fallbackBackup =
    fallback.backup && typeof fallback.backup === "object"
      ? fallback.backup
      : {};
  return {
    enabled:
      typeof v.enabled === "boolean"
        ? v.enabled
        : fallback.enabled !== false,
    public_base_url:
      "public_base_url" in v
        ? cleanPublicBase(v.public_base_url)
        : cleanPublicBase(fallback.public_base_url),
    client_id:
      "client_id" in v
        ? String(v.client_id || "").trim()
        : String(fallback.client_id || "").trim(),
    client_secret:
      "client_secret" in v
        ? String(v.client_secret || "").trim()
        : String(fallback.client_secret || "").trim(),
    allowed_emails:
      "allowed_emails" in v
        ? parseGoogleLoginAllowedEmails(v.allowed_emails)
        : parseGoogleLoginAllowedEmails(fallback.allowed_emails),
    backup: {
      enabled:
        typeof backup.enabled === "boolean"
          ? backup.enabled
          : fallbackBackup.enabled === true,
      drive_folder_id:
        "drive_folder_id" in backup
          ? String(backup.drive_folder_id || "").trim()
          : String(fallbackBackup.drive_folder_id || "").trim(),
      account_email:
        "account_email" in backup
          ? String(backup.account_email || "").toLowerCase().trim()
          : String(fallbackBackup.account_email || "").toLowerCase().trim(),
      schedule_enabled:
        typeof backup.schedule_enabled === "boolean"
          ? backup.schedule_enabled
          : fallbackBackup.schedule_enabled === true,
      time:
        "time" in backup
          ? normalizeBackupTime(backup.time, fallbackBackup.time || "02:00")
          : normalizeBackupTime(fallbackBackup.time || "02:00"),
      days:
        "days" in backup
          ? normalizeBackupDays(backup.days, fallbackBackup.days)
          : normalizeBackupDays(fallbackBackup.days),
      timezone:
        "timezone" in backup
          ? String(backup.timezone || "America/Sao_Paulo").trim().slice(0, 80)
          : String(fallbackBackup.timezone || "America/Sao_Paulo").trim().slice(0, 80),
    },
  };
}

/**
 * @param {import("mongodb").Db | null | undefined} db
 */
export async function getGoogleLoginConfig(db) {
  const fallback = envGoogleLoginConfig();
  if (!db) return normalizeGoogleLoginConfig(null, fallback);
  const row = await db.collection("app_kv").findOne({ key: GOOGLE_LOGIN_CONFIG_KEY });
  return normalizeGoogleLoginConfig(row?.value, fallback);
}

export function isGoogleLoginConfiguredValue(config) {
  const cfg = normalizeGoogleLoginConfig(config);
  return Boolean(
    cfg.enabled !== false &&
      cfg.public_base_url &&
      cfg.client_id &&
      cfg.client_secret &&
      cfg.allowed_emails.length > 0,
  );
}

/**
 * Compatibilidade com o fluxo antigo baseado apenas em `.env`.
 */
export function isGoogleLoginConfigured(config) {
  return isGoogleLoginConfiguredValue(config ?? envGoogleLoginConfig());
}

export function isEmailAllowedForGoogleLogin(email, config) {
  const e = String(email || "").toLowerCase().trim();
  if (!e) return false;
  const cfg = normalizeGoogleLoginConfig(config);
  return new Set(cfg.allowed_emails).has(e);
}

export function googleLoginRedirectUri(config) {
  const base = googleLoginPublicBase(config);
  if (!base) return "";
  return `${base}/api/auth/google-login/callback`;
}

export function publicGoogleLoginConfig(config) {
  const cfg = normalizeGoogleLoginConfig(config);
  return {
    enabled: cfg.enabled !== false,
    configured: isGoogleLoginConfiguredValue(cfg),
    public_base_url: cfg.public_base_url,
    client_id: cfg.client_id,
    has_client_secret: Boolean(cfg.client_secret),
    allowed_emails: cfg.allowed_emails,
    allowed_emails_text: cfg.allowed_emails.join(","),
    redirect_uri: googleLoginRedirectUri(cfg),
    backup: {
      enabled: cfg.backup.enabled === true,
      drive_folder_id: cfg.backup.drive_folder_id,
      account_email: cfg.backup.account_email,
      schedule_enabled: cfg.backup.schedule_enabled === true,
      time: cfg.backup.time,
      days: cfg.backup.days,
      timezone: cfg.backup.timezone,
    },
  };
}

/**
 * @param {import("mongodb").Db} db
 * @param {{
 *   enabled?: boolean;
 *   public_base_url?: string;
 *   client_id?: string;
 *   client_secret?: string;
 *   clear_client_secret?: boolean;
 *   allowed_emails?: string | string[];
 *   backup?: {
 *     enabled?: boolean;
 *     drive_folder_id?: string;
 *     account_email?: string;
 *     schedule_enabled?: boolean;
 *     time?: string;
 *     days?: string[];
 *     timezone?: string;
 *   };
 * }} input
 */
export async function saveGoogleLoginConfig(db, input) {
  const current = await getGoogleLoginConfig(db);
  const raw = input && typeof input === "object" ? input : {};
  const next = {
    enabled:
      typeof raw.enabled === "boolean"
        ? raw.enabled
        : current.enabled !== false,
    public_base_url:
      "public_base_url" in raw
        ? cleanPublicBase(raw.public_base_url)
        : current.public_base_url,
    client_id:
      "client_id" in raw
        ? String(raw.client_id || "").trim()
        : current.client_id,
    client_secret: current.client_secret,
    allowed_emails:
      "allowed_emails" in raw
        ? parseGoogleLoginAllowedEmails(raw.allowed_emails)
        : current.allowed_emails,
    backup: {
      enabled:
        raw.backup && typeof raw.backup.enabled === "boolean"
          ? raw.backup.enabled
          : current.backup.enabled === true,
      drive_folder_id:
        raw.backup && "drive_folder_id" in raw.backup
          ? String(raw.backup.drive_folder_id || "").trim()
          : current.backup.drive_folder_id,
      account_email:
        raw.backup && "account_email" in raw.backup
          ? String(raw.backup.account_email || "").toLowerCase().trim()
          : current.backup.account_email,
      schedule_enabled:
        raw.backup && typeof raw.backup.schedule_enabled === "boolean"
          ? raw.backup.schedule_enabled
          : current.backup.schedule_enabled === true,
      time:
        raw.backup && "time" in raw.backup
          ? normalizeBackupTime(raw.backup.time, current.backup.time)
          : current.backup.time,
      days:
        raw.backup && "days" in raw.backup
          ? normalizeBackupDays(raw.backup.days, current.backup.days)
          : current.backup.days,
      timezone:
        raw.backup && "timezone" in raw.backup
          ? String(raw.backup.timezone || "America/Sao_Paulo").trim().slice(0, 80)
          : current.backup.timezone,
    },
  };
  if (raw.clear_client_secret === true) {
    next.client_secret = "";
  } else if ("client_secret" in raw && String(raw.client_secret || "").trim()) {
    next.client_secret = String(raw.client_secret).trim();
  }

  const normalized = normalizeGoogleLoginConfig(next);
  await db.collection("app_kv").updateOne(
    { key: GOOGLE_LOGIN_CONFIG_KEY },
    {
      $set: {
        key: GOOGLE_LOGIN_CONFIG_KEY,
        value: normalized,
        updated_at: nowIso(),
      },
    },
    { upsert: true },
  );
  return normalized;
}

/**
 * @param {{ redirectUri: string; state: string; config?: unknown }} p
 */
export function buildGoogleLoginAuthorizeUrl(p) {
  const cfg = normalizeGoogleLoginConfig(p.config);
  const clientId = String(cfg.client_id || "").trim();
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
 * @returns {Promise<string>} state opaco para OAuth
 */
export async function createGoogleLoginOauthState(db) {
  const state = randomToken();
  const now = nowIso();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  await db.collection(GOOGLE_LOGIN_OAUTH_STATES).insertOne({
    state,
    created_at: now,
    expires_at: expiresAt,
  });
  return state;
}

/**
 * @param {import("mongodb").Db} db
 * @param {string} stateRaw
 * @returns {Promise<{} | null>}
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
  return {};
}

/**
 * @param {{ code: string; redirectUri: string; config?: unknown }} p
 * @returns {Promise<{ email: string }>}
 */
export async function exchangeGoogleLoginCodeForEmail(p) {
  const cfg = normalizeGoogleLoginConfig(p.config);
  const client_id = String(cfg.client_id || "").trim();
  const client_secret = String(cfg.client_secret || "").trim();
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
