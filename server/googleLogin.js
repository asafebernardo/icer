import { readCookieSecureFlag } from "./envFlags.js";
import { nowIso, randomToken } from "./security.js";

export const GOOGLE_LOGIN_OAUTH_STATES = "auth_google_login_oauth_states_v1";
export const GOOGLE_LOGIN_CONFIG_KEY = "auth_google_login_config_v1";
/** Cookie não-httpOnly: o servidor lê no `/start`; o cliente pode espelhar em localStorage. */
export const GOOGLE_LOGIN_HINT_COOKIE = "icer_google_login_hint";
const BACKUP_DAYS = new Set(["sun", "mon", "tue", "wed", "thu", "fri", "sat"]);

function cleanPublicBase(value) {
  return String(value || "")
    .trim()
    .replace(/\/+$/, "");
}

function isLocalDevHostname(hostname) {
  const h = String(hostname || "").toLowerCase();
  return h === "localhost" || h === "127.0.0.1" || h === "[::1]";
}

function cleanOriginUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    const u = new URL(raw);
    if (!/^https?:$/i.test(u.protocol)) return "";
    if (!isLocalDevHostname(u.hostname)) return "";
    return cleanPublicBase(u.origin);
  } catch {
    return "";
  }
}

/** Base pública (ex.: https://site.com) sem barra final. */
export function googleLoginPublicBase(config) {
  if (config && typeof config === "object" && "public_base_url" in config) {
    return cleanPublicBase(config.public_base_url);
  }
  return cleanPublicBase(process.env.ICER_PUBLIC_BASE_URL);
}

/**
 * Em desenvolvimento, usa o origin do browser (localhost) em vez da URL de produção
 * guardada no MongoDB — evita redirecionar para o site hospedado após login Google.
 */
export function resolveGoogleLoginPublicBase(config, req) {
  const isDev = process.env.NODE_ENV !== "production";

  if (isDev) {
    const devBase = cleanOriginUrl(process.env.ICER_DEV_PUBLIC_BASE_URL);
    if (devBase) return devBase;
  }

  if (req && isDev) {
    const fromQuery = cleanOriginUrl(req.query?.public_origin);
    if (fromQuery) return fromQuery;

    const fromOrigin = cleanOriginUrl(req.get("origin"));
    if (fromOrigin) return fromOrigin;

    const host = String(req.get("x-forwarded-host") || req.get("host") || "").trim();
    const hostname = host.split(":")[0] || "";
    if (host && isLocalDevHostname(hostname)) {
      const proto = String(req.get("x-forwarded-proto") || req.protocol || "http")
        .split(",")[0]
        .trim();
      return cleanPublicBase(`${proto}://${host}`);
    }
  }

  return googleLoginPublicBase(config);
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

/** Direções suportadas para a sincronização com o Google Agenda. */
const CALENDAR_SYNC_DIRECTIONS = new Set(["push", "pull", "two_way"]);

function normalizeCalendarSyncDirection(value, fallback = "push") {
  const s = String(value || "").trim().toLowerCase();
  return CALENDAR_SYNC_DIRECTIONS.has(s) ? s : fallback;
}

/** ID da agenda (calendar_id) — aceita "primary" ou um e-mail de calendário. */
function normalizeCalendarId(value, fallback = "primary") {
  const s = String(value || "").trim();
  if (!s) return fallback || "primary";
  /* Limita o tamanho (defensivo). Google Calendar IDs reais ≤ ~255 chars. */
  return s.slice(0, 255);
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
    calendar: {
      enabled: false,
      calendar_id: "primary",
      account_email: "",
      sync_direction: "push",
      auto_sync_on_save: true,
      default_timezone: "America/Sao_Paulo",
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
  const calendar = v.calendar && typeof v.calendar === "object" ? v.calendar : {};
  const fallbackCalendar =
    fallback.calendar && typeof fallback.calendar === "object"
      ? fallback.calendar
      : { enabled: false, calendar_id: "primary", account_email: "", sync_direction: "push", auto_sync_on_save: true, default_timezone: "America/Sao_Paulo" };
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
    calendar: {
      enabled:
        typeof calendar.enabled === "boolean"
          ? calendar.enabled
          : fallbackCalendar.enabled === true,
      calendar_id:
        "calendar_id" in calendar
          ? normalizeCalendarId(calendar.calendar_id, fallbackCalendar.calendar_id)
          : normalizeCalendarId(fallbackCalendar.calendar_id),
      account_email:
        "account_email" in calendar
          ? String(calendar.account_email || "").toLowerCase().trim()
          : String(fallbackCalendar.account_email || "").toLowerCase().trim(),
      sync_direction:
        "sync_direction" in calendar
          ? normalizeCalendarSyncDirection(
              calendar.sync_direction,
              fallbackCalendar.sync_direction,
            )
          : normalizeCalendarSyncDirection(fallbackCalendar.sync_direction),
      auto_sync_on_save:
        typeof calendar.auto_sync_on_save === "boolean"
          ? calendar.auto_sync_on_save
          : fallbackCalendar.auto_sync_on_save !== false,
      default_timezone:
        "default_timezone" in calendar
          ? String(calendar.default_timezone || "America/Sao_Paulo").trim().slice(0, 80)
          : String(fallbackCalendar.default_timezone || "America/Sao_Paulo").trim().slice(0, 80),
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

/** Como `googleLoginRedirectUri`, mas respeita localhost em desenvolvimento. */
export function googleLoginRedirectUriForRequest(config, req) {
  const base = resolveGoogleLoginPublicBase(config, req);
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
    calendar: {
      enabled: cfg.calendar.enabled === true,
      calendar_id: cfg.calendar.calendar_id,
      account_email: cfg.calendar.account_email,
      sync_direction: cfg.calendar.sync_direction,
      auto_sync_on_save: cfg.calendar.auto_sync_on_save !== false,
      default_timezone: cfg.calendar.default_timezone,
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
 *   calendar?: {
 *     enabled?: boolean;
 *     calendar_id?: string;
 *     account_email?: string;
 *     sync_direction?: "push" | "pull" | "two_way";
 *     auto_sync_on_save?: boolean;
 *     default_timezone?: string;
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
    calendar: {
      enabled:
        raw.calendar && typeof raw.calendar.enabled === "boolean"
          ? raw.calendar.enabled
          : current.calendar.enabled === true,
      calendar_id:
        raw.calendar && "calendar_id" in raw.calendar
          ? normalizeCalendarId(
              raw.calendar.calendar_id,
              current.calendar.calendar_id,
            )
          : current.calendar.calendar_id,
      account_email:
        raw.calendar && "account_email" in raw.calendar
          ? String(raw.calendar.account_email || "").toLowerCase().trim()
          : current.calendar.account_email,
      sync_direction:
        raw.calendar && "sync_direction" in raw.calendar
          ? normalizeCalendarSyncDirection(
              raw.calendar.sync_direction,
              current.calendar.sync_direction,
            )
          : current.calendar.sync_direction,
      auto_sync_on_save:
        raw.calendar && typeof raw.calendar.auto_sync_on_save === "boolean"
          ? raw.calendar.auto_sync_on_save
          : current.calendar.auto_sync_on_save !== false,
      default_timezone:
        raw.calendar && "default_timezone" in raw.calendar
          ? String(raw.calendar.default_timezone || "America/Sao_Paulo")
              .trim()
              .slice(0, 80)
          : current.calendar.default_timezone,
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
 * @param {import("mongodb").Db} db
 * @param {string} emailRaw
 */
export async function addGoogleAllowedEmail(db, emailRaw) {
  const parsed = parseGoogleLoginAllowedEmails(emailRaw);
  const email = parsed[0];
  if (!email) {
    const err = new Error("invalid_allowed_email");
    throw err;
  }
  const cfg = await getGoogleLoginConfig(db);
  const set = new Set(cfg.allowed_emails);
  if (set.has(email)) {
    return { cfg, added: false, email };
  }
  set.add(email);
  const next = await saveGoogleLoginConfig(db, { allowed_emails: [...set] });
  return { cfg: next, added: true, email };
}

/**
 * @param {import("mongodb").Db} db
 * @param {string} emailRaw
 */
export async function removeGoogleAllowedEmail(db, emailRaw) {
  const email = String(emailRaw || "").toLowerCase().trim();
  if (!email) {
    const err = new Error("invalid_allowed_email");
    throw err;
  }
  const cfg = await getGoogleLoginConfig(db);
  const nextList = cfg.allowed_emails.filter((e) => e !== email);
  if (nextList.length === cfg.allowed_emails.length) {
    return { cfg, removed: false, email };
  }
  const next = await saveGoogleLoginConfig(db, { allowed_emails: nextList });
  return { cfg: next, removed: true, email };
}

/** E-mail guardado para reutilizar sessão Google (login_hint) sem pedir consentimento de novo. */
export function sanitizeGoogleLoginHint(raw) {
  const email = String(raw || "").toLowerCase().trim();
  if (!email || email.length > 254) return "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "";
  return email;
}

export function googleLoginHintCookieOptions() {
  return {
    httpOnly: false,
    sameSite: "lax",
    secure: readCookieSecureFlag(),
    path: "/",
    maxAge: 365 * 24 * 60 * 60,
  };
}

export function setGoogleLoginHintCookie(res, email) {
  const hint = sanitizeGoogleLoginHint(email);
  if (!hint) return;
  res.cookie(GOOGLE_LOGIN_HINT_COOKIE, hint, googleLoginHintCookieOptions());
}

export function clearGoogleLoginHintCookie(res) {
  res.clearCookie(GOOGLE_LOGIN_HINT_COOKIE, googleLoginHintCookieOptions());
}

/**
 * @param {{
 *   redirectUri: string;
 *   state: string;
 *   config?: unknown;
 *   loginHint?: string;
 *   forceAccountPicker?: boolean;
 *   preferSilent?: boolean;
 * }} p
 */
export function buildGoogleLoginAuthorizeUrl(p) {
  const cfg = normalizeGoogleLoginConfig(p.config);
  const clientId = String(cfg.client_id || "").trim();
  const loginHint = sanitizeGoogleLoginHint(p.loginHint);
  const forceAccountPicker = p.forceAccountPicker === true;
  const preferSilent = p.preferSilent === true;
  const u = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  u.searchParams.set("client_id", clientId);
  u.searchParams.set("redirect_uri", p.redirectUri);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("scope", "openid email profile");
  u.searchParams.set("state", p.state);
  u.searchParams.set("access_type", "online");
  u.searchParams.set("include_granted_scopes", "true");
  if (loginHint) {
    u.searchParams.set("login_hint", loginHint);
  }
  if (forceAccountPicker) {
    u.searchParams.set("prompt", "select_account");
  } else if (preferSilent && loginHint) {
    u.searchParams.set("prompt", "none");
  } else if (!loginHint) {
    u.searchParams.set("prompt", "select_account");
  }
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
 * Troca o código OAuth pelo perfil do utilizador (e-mail, nome e foto).
 *
 * Inclui retrocompatibilidade com chamadas antigas que só usavam `email`,
 * via `exchangeGoogleLoginCodeForEmail` (alias).
 *
 * @param {{ code: string; redirectUri: string; config?: unknown }} p
 * @returns {Promise<{ email: string; name: string; picture: string }>}
 */
export async function exchangeGoogleLoginCodeForProfile(p) {
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
  const name = String(info.name || "").trim();
  /**
   * `picture` é uma URL HTTPS do Google (lh3.googleusercontent.com); só aceitamos
   * essa origem para reduzir risco caso o IdP devolvesse algo inesperado.
   */
  const pictureRaw = String(info.picture || "").trim();
  let picture = "";
  if (/^https:\/\/[^\s]+$/i.test(pictureRaw)) {
    try {
      const u = new URL(pictureRaw);
      if (
        u.hostname.endsWith(".googleusercontent.com") ||
        u.hostname === "googleusercontent.com"
      ) {
        picture = pictureRaw;
      }
    } catch {
      picture = "";
    }
  }
  return { email, name, picture };
}

/** Alias retrocompatível — devolve apenas `{ email }`. */
export async function exchangeGoogleLoginCodeForEmail(p) {
  const { email } = await exchangeGoogleLoginCodeForProfile(p);
  return { email };
}
