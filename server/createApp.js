import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { directoryFileStats } from "./directoryBytes.js";
import express from "express";
import cookieParser from "cookie-parser";
import multer from "multer";
import { z } from "zod";
import { createProxyMiddleware } from "http-proxy-middleware";
import { httpAccessLogger, log, color } from "./log.js";
import { fetchGithubBranchReleases, DEFAULT_ICER_GITHUB_REPO_RAW, parseGithubRepo } from "./githubBranchReleases.js";
import {
  isConvertibleRasterMime,
  replaceFileWithWebp,
  replaceNameExtensionToWebp,
} from "./imageWebp.js";

let _sharp = null;
async function getSharp() {
  if (_sharp === false) return null;
  if (_sharp) return _sharp;
  try {
    const mod = await import("sharp");
    _sharp = mod.default || mod;
    return _sharp;
  } catch (err) {
    log.warn(
      `${color.brightYellow("[files]")} sharp não disponível — variantes responsivas desativadas. ${color.dim(
        String(err?.message || err),
      )}`,
    );
    return null;
  }
}

import {
  clearSessionCookie,
  createSession,
  deleteSessionByToken,
  getSessionUser,
  getCookieName,
  hashPassword,
  requireAdmin,
  requireAuth,
  setSessionCookie,
  verifyPassword,
} from "./auth.js";
import {
  bumpLoginFailure,
  clearLoginFailures,
  loginFailureKeys,
  LOGIN_FAIL_COLLECTION,
  readLoginBlocks,
} from "./loginAttemptLock.js";
import { envBoolTrue, isHomologEnvironment, readCookieSecureFlag } from "./envFlags.js";
import { getHomologSeedAccounts, isHomologSeedEmail } from "./homologSeed.js";
import { addDaysIso, nowIso, randomToken, sha256Hex } from "./security.js";
import { effectiveMenuPermissions, menuActionAllowed } from "./menuPermissions.js";
import {
  getPublicWorkspace,
  mergePublicWorkspaceAdmin,
  setAgendaSugestoesEditor,
  setAgendaSimpleGridEditor,
  appendDismissedDestaque,
} from "./publicWorkspace.js";
import { createDataRouter } from "./dataRoutes.js";
import { nextSeq } from "./sequences.js";
import {
  clientIp,
  recordAudit,
  listAuditLogsForUser,
  listAuditLogsGlobal,
  getAuditLogRetentionPolicy,
  setAuditLogRetentionPolicy,
  purgeAuditLogsByPolicy,
  setPrivateNoStore,
} from "./auditLog.js";
import { purgeSoftDeletedRecords } from "./purgeSoftDeleted.js";
import {
  SOFT_DELETE_COLLECTIONS,
  SOFT_DELETE_TYPE_LABELS,
  isDeletedRow,
  markRowSoftDeleted,
  notDeletedFilter,
  restoreSoftDeletedRow,
  softDeleteFields,
  softDeleteItemLabel,
} from "./softDelete.js";
import { findFileReferences } from "./fileReferences.js";
import { validateAccountPassword } from "./passwordPolicy.js";
import {
  BUILTIN_ADMIN_GROUP_SLUG,
  defaultGroupPermissionsMap,
} from "./permissionGroupDefaults.js";
import { createSecurityHeadersMiddleware } from "./securityHeaders.js";
import {
  RECAPTCHA_ACTIONS,
  SITE_ACCESS_COOKIE,
  createSiteAccessCookieValue,
  isRecaptchaEnforced,
  publicRecaptchaConfig,
  requireRecaptchaToken,
  verifySiteAccessCookie,
} from "./recaptcha.js";
import {
  buildGoogleLoginAuthorizeUrl,
  clearGoogleLoginHintCookie,
  consumeGoogleLoginOauthState,
  createGoogleLoginOauthState,
  exchangeGoogleLoginCodeForProfile,
  getGoogleLoginConfig,
  GOOGLE_LOGIN_HINT_COOKIE,
  googleLoginPublicBase,
  googleLoginRedirectUri,
  googleLoginRedirectUriForRequest,
  resolveGoogleLoginPublicBase,
  isEmailAllowedForGoogleLogin,
  isGoogleLoginConfiguredValue,
  parseGoogleLoginAllowedEmails,
  publicGoogleLoginConfig,
  sanitizeGoogleLoginHint,
  addGoogleAllowedEmail,
  removeGoogleAllowedEmail,
  saveGoogleLoginConfig,
  setGoogleLoginHintCookie,
} from "./googleLogin.js";

/**
 * @param {import("express").Response} res
 * @param {{ ok: true } | { ok: false; code: string }} result
 * @returns {boolean} true se já respondeu com erro
 */
function respondIfPasswordPolicyFails(res, result) {
  if (result.ok) return false;
  res.status(400).json({ message: result.code });
  return true;
}

function classifyFileMime(mime, name = "") {
  const m = String(mime || "").toLowerCase();
  const n = String(name || "").toLowerCase();
  if (m.startsWith("image/")) return "image";
  if (m.startsWith("video/")) return "video";
  if (m.startsWith("audio/")) return "audio";
  if (m === "application/pdf" || n.endsWith(".pdf")) return "pdf";
  if (
    m.startsWith("text/") ||
    m.includes("word") ||
    m.includes("excel") ||
    m.includes("powerpoint") ||
    m.includes("spreadsheet") ||
    m.includes("presentation") ||
    /\.(docx?|xlsx?|pptx?|txt|csv)$/i.test(n)
  ) {
    return "document";
  }
  return "other";
}

function diskSpaceStats(dirPath) {
  try {
    if (typeof fs.statfsSync !== "function") return null;
    const st = fs.statfsSync(dirPath, { bigint: false });
    const blockSize = Number(st.bsize || 0);
    const total = Number(st.blocks || 0) * blockSize;
    const free = Number(st.bavail || st.bfree || 0) * blockSize;
    const used = Math.max(0, total - free);
    if (!Number.isFinite(total) || total <= 0) return null;
    return {
      total_bytes: total,
      free_bytes: Math.max(0, free),
      used_bytes: used,
      used_pct: Math.round((used / total) * 1000) / 10,
      free_pct: Math.round((Math.max(0, free) / total) * 1000) / 10,
    };
  } catch {
    return null;
  }
}

/**
 * @param {import("mongodb").Db} db
 * @param {{
 *   uploadDir?: string;
 *   enableUpstreamProxy?: boolean;
 *   loginRateLimit?: boolean;
 *   enforceSingleSession?: boolean;
 * }} [options]
 */
export function createApplication(db, options = {}) {
  const uploadDir =
    options.uploadDir ?? path.resolve("server", "uploads");
  const uploadMaxMb = Number(process.env.ICER_UPLOAD_MAX_MB);
  const uploadMaxBytes =
    Number.isFinite(uploadMaxMb) && uploadMaxMb > 0
      ? uploadMaxMb * 1024 * 1024
      : 80 * 1024 * 1024;
  const enableUpstreamProxy = options.enableUpstreamProxy === true;
  const loginRateLimit = options.loginRateLimit !== false;
  const enforceSingleSession = options.enforceSingleSession !== false;

  /** Homologação / staging: sem limite de pedidos de login nem bloqueio por falhas (IP/utilizador). */
  const skipLoginAttemptLock =
    envBoolTrue("ICER_DISABLE_LOGIN_ATTEMPT_LOCK") || isHomologEnvironment();

  fs.mkdirSync(uploadDir, { recursive: true });

  /**
   * Multer grava `storage_path` absoluto; se o projeto mudou de pasta ou `ICER_UPLOAD_DIR`,
   * o caminho antigo deixa de existir mas o ficheiro pode estar em `uploadDir` com o mesmo nome.
   */
  function resolveUploadedDiskPath(row) {
    const legacy = row?.storage_path != null ? String(row.storage_path).trim() : "";
    if (legacy && fs.existsSync(legacy)) return legacy;
    const base =
      legacy && path.basename(legacy) !== "." && path.basename(legacy) !== ".."
        ? path.basename(legacy)
        : "";
    if (!base) return null;
    const candidate = path.join(uploadDir, base);
    return fs.existsSync(candidate) ? candidate : null;
  }

  const loginRateState = new Map();
  const LOGIN_WINDOW_MS = 15 * 60 * 1000;
  const LOGIN_MAX = 40;

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function isEnvAdminEmail(email) {
    return isHomologSeedEmail(email);
  }

  function isPasswordLoginApiAllowed() {
    if (isHomologEnvironment()) return true;
    return envBoolTrue("ICER_ALLOW_PASSWORD_LOGIN");
  }

  const dismissDestaqueRate = new Map();
  const DISMISS_WINDOW_MS = 15 * 60 * 1000;
  const DISMISS_MAX = 120;

  function rateLimitDismissDestaque(req, res, next) {
    const ip = String(req.ip || req.socket?.remoteAddress || "unknown");
    const now = Date.now();
    let e = dismissDestaqueRate.get(ip);
    if (!e || now > e.resetAt) {
      e = { count: 0, resetAt: now + DISMISS_WINDOW_MS };
      dismissDestaqueRate.set(ip, e);
    }
    e.count += 1;
    if (e.count > DISMISS_MAX) {
      res.status(429).json({ message: "too_many_requests" });
      return;
    }
    next();
  }

  const SESSION_TTL_KEY = "session_ttl_minutes";
  const SESSION_TTL_ALLOWED = new Set([10, 30, 60, 120, 300]);
  const SESSION_TTL_DEFAULT = 120;
  const SITE_CONFIG_KEY = "site_config_public_v1";
  const HOME_VIEWS_KEY = "metric_home_views_v1";
  const HOME_VIEWS_BY_IP_COLLECTION = "metric_home_views_by_ip_v1";

  async function getPublicSiteConfig() {
    const row = await db.collection("app_kv").findOne({ key: SITE_CONFIG_KEY });
    const v = row?.value;
    if (!v || typeof v !== "object") return {};
    return v;
  }

  async function getSessionTtlMinutes() {
    const row = await db.collection("app_kv").findOne({ key: SESSION_TTL_KEY });
    const v = row?.value != null ? Number(row.value) : NaN;
    if (Number.isFinite(v) && SESSION_TTL_ALLOWED.has(v)) return v;
    return SESSION_TTL_DEFAULT;
  }

  function auditCtx(req) {
    const originUrlRaw = req.headers["x-origin-url"];
    const originUrl =
      typeof originUrlRaw === "string" ? originUrlRaw.slice(0, 2048) : null;
    const route = String(req.originalUrl || req.url || "").slice(0, 512) || null;
    const userAgent = String(req.headers["user-agent"] || "").slice(0, 256) || null;
    return { originUrl, route, userAgent };
  }

  function rateLimitLogin(req, res, next) {
    const ip = String(req.ip || req.socket?.remoteAddress || "unknown");
    const now = Date.now();
    let entry = loginRateState.get(ip);
    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + LOGIN_WINDOW_MS };
      loginRateState.set(ip, entry);
    }
    entry.count += 1;
    if (entry.count > LOGIN_MAX) {
      res.status(429).json({ message: "too_many_requests" });
      return;
    }
    next();
  }

  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(createSecurityHeadersMiddleware());

  /**
   * Log colorido por pedido — útil em desenvolvimento. Em produção pode ser
   * desligado com `ICER_HTTP_LOG=0`.
   */
  const httpLogEnabled = (() => {
    const v = String(process.env.ICER_HTTP_LOG ?? "").trim().toLowerCase();
    if (v === "0" || v === "false" || v === "off" || v === "no") return false;
    return true;
  })();
  if (httpLogEnabled) {
    app.use(httpAccessLogger());
  }

  app.use(cookieParser());
  const jsonParser = express.json({ limit: "2mb" });
  app.use((req, res, next) => {
    if (req.method === "GET" || req.method === "HEAD") return next();
    if (req.is("multipart/form-data")) return next();
    return jsonParser(req, res, next);
  });

  /** Antes do middleware de sessão (evita Mongo em cada probe do Docker/EasyPanel). */
  app.get("/health", (_req, res) => {
    res.status(200).type("text/plain").send("ok");
  });
  app.get("/api/health", (_req, res) => {
    res.json({
      ok: true,
      time: nowIso(),
      icer_env: String(process.env.ICER_ENV || "").trim() || null,
      is_homolog: isHomologEnvironment(),
    });
  });

  // Config pública do site (logo, fundos, paleta, etc.). Não depende de sessão.
  app.get("/api/site-config", async (_req, res) => {
    const cfg = await getPublicSiteConfig();
    res.setHeader("Cache-Control", "no-store");
    res.json(cfg);
  });

  app.get("/api/recaptcha/config", (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.json(publicRecaptchaConfig());
  });

  app.get("/api/recaptcha/site-access", (req, res) => {
    const required = isRecaptchaEnforced();
    const passed = !required || verifySiteAccessCookie(req.cookies?.[SITE_ACCESS_COOKIE]);
    res.setHeader("Cache-Control", "no-store");
    res.json({ passed, required });
  });

  app.post("/api/recaptcha/site-access", async (req, res) => {
    if (
      !(await requireRecaptchaToken(req, res, {
        expectedAction: RECAPTCHA_ACTIONS.SITE_ACCESS,
      }))
    ) {
      return;
    }
    const { value, maxAgeMs } = createSiteAccessCookieValue();
    res.cookie(SITE_ACCESS_COOKIE, value, {
      httpOnly: true,
      sameSite: "lax",
      secure: readCookieSecureFlag(),
      path: "/",
      maxAge: maxAgeMs,
    });
    res.setHeader("Cache-Control", "no-store");
    res.json({ ok: true });
  });

  // Métrica pública: registra visita na Home (por IP).
  // Mantém também um total global (HOME_VIEWS_KEY) para referência.
  app.post("/api/metrics/home-views", async (req, res) => {
    const now = nowIso();
    const ip = String(clientIp(req) || "unknown").slice(0, 128);
    await db.collection("app_kv").updateOne(
      { key: HOME_VIEWS_KEY },
      {
        $inc: { "value.count": 1 },
        $setOnInsert: { key: HOME_VIEWS_KEY },
        $set: { updated_at: now },
      },
      { upsert: true },
    );
    await db.collection(HOME_VIEWS_BY_IP_COLLECTION).updateOne(
      { ip },
      {
        $inc: { count: 1 },
        $set: { last_seen_at: now, updated_at: now },
        $setOnInsert: { ip, created_at: now },
      },
      { upsert: true },
    );
    res.setHeader("Cache-Control", "no-store");
    res.json({ ok: true });
  });

  // Resumo público de acessos na Home (total e IPs únicos) para exibir no rodapé.
  app.get("/api/metrics/home-views-summary", async (_req, res) => {
    const [totalViewsRow, uniqueIps] = await Promise.all([
      db.collection("app_kv").findOne({ key: HOME_VIEWS_KEY }),
      db.collection(HOME_VIEWS_BY_IP_COLLECTION).countDocuments({}),
    ]);

    const totalViews =
      typeof totalViewsRow?.value?.count === "number"
        ? totalViewsRow.value.count
        : Number(totalViewsRow?.value?.count || 0);

    res.setHeader("Cache-Control", "no-store");
    res.json({
      total_views: Number.isFinite(totalViews) ? totalViews : 0,
      unique_ips: uniqueIps || 0,
    });
  });

  /** Estado partilhado do site (sugestões da agenda, paletas, destaque visto, etc.) — não depende de sessão para leitura. */
  app.get("/api/public-workspace", async (_req, res) => {
    const ws = await getPublicWorkspace(db);
    res.setHeader("Cache-Control", "no-store");
    res.json(ws);
  });

  app.use(async (req, _res, next) => {
    try {
      const token = req.cookies?.[getCookieName()];
      req.user = await getSessionUser(db, token);
      req.sessionToken = token || null;
      next();
    } catch (e) {
      next(e);
    }
  });

  // ── CSRF (double-submit cookie) ─────────────────────────────────────────
  const CSRF_COOKIE = "icer_csrf";
  const csrfCookieOptions = {
    httpOnly: false,
    sameSite: "lax",
    secure: readCookieSecureFlag(),
    path: "/",
  };

  function ensureCsrfCookie(req, res) {
    const cur = req.cookies?.[CSRF_COOKIE];
    const token = typeof cur === "string" && cur.trim() ? cur.trim() : randomToken();
    if (token !== cur) {
      res.cookie(CSRF_COOKIE, token, csrfCookieOptions);
    }
    return token;
  }

  function requireCsrf(req, res, next) {
    const m = String(req.method || "").toUpperCase();
    if (m === "GET" || m === "HEAD" || m === "OPTIONS") return next();
    const path = String(req.path || req.originalUrl || "");
    // Não exigir CSRF em endpoints públicos/bootstraps.
    if (
      path === "/api/auth/login" ||
      path === "/api/auth/homolog-dev-login" ||
      path === "/api/auth/csrf" ||
      path.startsWith("/api/health") ||
      path === "/api/site-config" ||
      path === "/api/recaptcha/config" ||
      path === "/api/recaptcha/site-access" ||
      path === "/api/public-workspace/dismiss-destaque"
    ) {
      return next();
    }
    // Só faz sentido exigir quando há cookie de sessão presente.
    const hasSessionCookie = Boolean(req.cookies?.[getCookieName()]);
    if (!hasSessionCookie) return next();

    const cookieToken = String(req.cookies?.[CSRF_COOKIE] || "").trim();
    const headerToken = String(req.headers["x-csrf-token"] || "").trim();
    if (!cookieToken || !headerToken) {
      res.status(403).json({ message: "csrf_required" });
      return;
    }
    if (cookieToken !== headerToken) {
      res.status(403).json({ message: "csrf_invalid" });
      return;
    }
    next();
  }

  app.get("/api/auth/csrf", (req, res) => {
    const token = ensureCsrfCookie(req, res);
    res.setHeader("Cache-Control", "no-store");
    res.json({ csrf_token: token });
  });

  // Aplica CSRF em rotas mutáveis com cookie.
  app.use(requireCsrf);

  // Admin: grava config pública do site no servidor (Mongo).
  app.put("/api/admin/site-config", requireAuth, requireAdmin, async (req, res) => {
    const body = req.body && typeof req.body === "object" ? { ...req.body } : null;
    if (!body) {
      res.status(400).json({ message: "invalid_request" });
      return;
    }
    const current = await getPublicSiteConfig();
    const next = { ...(current || {}), ...body };
    const now = nowIso();
    await db.collection("app_kv").updateOne(
      { key: SITE_CONFIG_KEY },
      { $set: { key: SITE_CONFIG_KEY, value: next, updated_at: now } },
      { upsert: true },
    );
    await recordAudit(db, {
      userId: req.user.id,
      actorUserId: req.user.id,
      action: "site.config.update",
      details: { keys: Object.keys(body).slice(0, 50) },
      ip: clientIp(req),
      ...auditCtx(req),
    });
    res.setHeader("Cache-Control", "no-store");
    res.json({ ok: true, config: next });
  });

  app.put("/api/admin/public-workspace", requireAuth, requireAdmin, async (req, res) => {
    const body = req.body && typeof req.body === "object" ? { ...req.body } : null;
    if (!body) {
      res.status(400).json({ message: "invalid_request" });
      return;
    }
    const next = await mergePublicWorkspaceAdmin(db, body);
    await recordAudit(db, {
      userId: req.user.id,
      actorUserId: req.user.id,
      action: "public_workspace.admin_merge",
      details: { keys: Object.keys(body).slice(0, 30) },
      ip: clientIp(req),
      ...auditCtx(req),
    });
    res.setHeader("Cache-Control", "no-store");
    res.json(next);
  });

  app.post(
    "/api/public-workspace/dismiss-destaque",
    rateLimitDismissDestaque,
    async (req, res) => {
      const parsed = z
        .object({ id: z.string().regex(/^\d{1,18}$/) })
        .safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ message: "invalid_request" });
        return;
      }
      const next = await appendDismissedDestaque(db, parsed.data.id);
      res.setHeader("Cache-Control", "no-store");
      res.json(next);
    },
  );

  app.put(
    "/api/public-workspace/agenda-sugestoes",
    requireAuth,
    async (req, res, next) => {
      if (!(await menuActionAllowed(db, req.user, "eventos", "edit"))) {
        res.status(403).json({ message: "forbidden" });
        return;
      }
      next();
    },
    async (req, res) => {
      const body = req.body && typeof req.body === "object" ? req.body : null;
      const raw = body?.agenda_sugestoes;
      if (!raw || typeof raw !== "object") {
        res.status(400).json({ message: "invalid_request" });
        return;
      }
      const next = await setAgendaSugestoesEditor(db, raw);
      await recordAudit(db, {
        userId: req.user.id,
        actorUserId: req.user.id,
        action: "public_workspace.agenda_sugestoes",
        details: {},
        ip: clientIp(req),
        ...auditCtx(req),
      });
      res.setHeader("Cache-Control", "no-store");
      res.json(next);
    },
  );

  app.put(
    "/api/public-workspace/agenda-simple-grid",
    requireAuth,
    async (req, res, next) => {
      if (!(await menuActionAllowed(db, req.user, "eventos", "edit"))) {
        res.status(403).json({ message: "forbidden" });
        return;
      }
      next();
    },
    async (req, res) => {
      const body = req.body && typeof req.body === "object" ? req.body : null;
      const raw = body?.agenda_simple_grid;
      if (!raw || typeof raw !== "object") {
        res.status(400).json({ message: "invalid_request" });
        return;
      }
      const next = await setAgendaSimpleGridEditor(db, raw);
      await recordAudit(db, {
        userId: req.user.id,
        actorUserId: req.user.id,
        action: "public_workspace.agenda_simple_grid",
        details: {},
        ip: clientIp(req),
        ...auditCtx(req),
      });
      res.setHeader("Cache-Control", "no-store");
      res.json(next);
    },
  );

  const loginMw =
    loginRateLimit && !skipLoginAttemptLock ? rateLimitLogin : (_req, _res, next) => next();

  app.post("/api/auth/login", loginMw, async (req, res) => {
    if (!isPasswordLoginApiAllowed()) {
      res.status(403).json({ message: "google_login_required" });
      return;
    }
    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(1),
      recaptcha_token: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "invalid_request" });
      return;
    }
    if (
      !(await requireRecaptchaToken(req, res, {
        expectedAction: RECAPTCHA_ACTIONS.LOGIN,
      }))
    ) {
      return;
    }
    const email = parsed.data.email.toLowerCase().trim();
    const isEnvAdmin = isEnvAdminEmail(email);
    const ipKey = `ip:${clientIp(req)}`;
    const userKey = `user:${email}`;
    const failureKeys = loginFailureKeys({ ipKey, userKey, email });
    const blockRows = skipLoginAttemptLock
      ? []
      : await readLoginBlocks(db, failureKeys);
    if (blockRows && blockRows.length > 0) {
      const hard = blockRows.some((b) => b.hard === true);
      const until =
        blockRows
          .map((b) => b.locked_until)
          .filter(Boolean)
          .sort()
          .at(-1) || null;
      res
        .status(hard ? 503 : 423)
        .json({ message: hard ? "login_unavailable" : "login_temporarily_blocked", locked_until: until });
      return;
    }
    const row = await db.collection("users").findOne(
      { email },
      {
        projection: {
          _id: 0,
          id: 1,
          email: 1,
          full_name: 1,
          role: 1,
          password_hash: 1,
          disabled: 1,
        },
      },
    );
    if (!row) {
      // Evita enumeração: resposta igual a "senha errada".
      await recordAudit(db, {
        userId: null,
        actorUserId: null,
        action: "auth.login_failed",
        details: { email },
        ip: clientIp(req),
        ...auditCtx(req),
      });
      if (!skipLoginAttemptLock) {
        await bumpLoginFailure(db, failureKeys);
      }
      await sleep(350);
      res.status(401).json({ message: "invalid_credentials" });
      return;
    }
    if (!row.password_hash) {
      // Evita enumeração por estado de conta.
      if (!skipLoginAttemptLock) {
        await bumpLoginFailure(db, failureKeys);
      }
      await sleep(350);
      res.status(401).json({ message: "invalid_credentials" });
      return;
    }
    if (row.disabled === true) {
      // Conta seed do `.env`: nunca impedir login por flag disabled (serve como acesso de emergência).
      if (!isEnvAdmin) {
        if (!skipLoginAttemptLock) {
          await bumpLoginFailure(db, failureKeys);
        }
        await sleep(350);
        res.status(401).json({ message: "invalid_credentials" });
        return;
      }
    }
    const ok = await verifyPassword(row.password_hash, parsed.data.password);
    if (!ok) {
      await recordAudit(db, {
        userId: row.id,
        actorUserId: row.id,
        action: "auth.login_failed",
        details: { email },
        ip: clientIp(req),
        ...auditCtx(req),
      });
      if (!skipLoginAttemptLock) {
        await bumpLoginFailure(db, failureKeys);
      }
      await sleep(350);
      res.status(401).json({ message: "invalid_credentials" });
      return;
    }
    await clearLoginFailures(db, failureKeys);

    // Sessão única: com credenciais válidas, substitui sessões activas (outro dispositivo ou cookie antigo).
    if (enforceSingleSession && !isEnvAdmin) {
      const now = nowIso();
      const active = await db.collection("sessions").findOne({
        user_id: row.id,
        expires_at: { $gt: now },
      });
      if (active) {
        await db.collection("sessions").deleteMany({ user_id: row.id });
        await recordAudit(db, {
          userId: row.id,
          actorUserId: row.id,
          action: "auth.sessions_revoked_by_login",
          details: { reason: "replace_on_login" },
          ip: clientIp(req),
          ...auditCtx(req),
        });
      }
    }

    const loginStamp = nowIso();
    await db.collection("users").updateOne(
      { id: row.id },
      { $set: { last_login_at: loginStamp } },
    );

    const ttlMinutes = await getSessionTtlMinutes();
    const { token } = await createSession(db, row.id, { minutes: ttlMinutes });
    setSessionCookie(res, token, ttlMinutes * 60);
    ensureCsrfCookie(req, res);
    await recordAudit(db, {
      userId: row.id,
      actorUserId: row.id,
      action: "auth.login",
      details: { email: row.email },
      ip: clientIp(req),
      ...auditCtx(req),
    });
    res.json({ ok: true });
  });

  /** Homologação: sessão com conta seed admin (sem Google / sem senha no cliente). */
  app.post("/api/auth/homolog-dev-login", async (req, res) => {
    if (!isHomologEnvironment()) {
      res.status(404).json({ message: "not_found" });
      return;
    }
    if (req.user) {
      res.json({ ok: true, already: true });
      return;
    }
    const seed = getHomologSeedAccounts()[0];
    const email = String(seed?.email || "").toLowerCase().trim();
    if (!email) {
      res.status(503).json({ message: "homolog_seed_unavailable" });
      return;
    }
    const row = await db.collection("users").findOne(
      { email },
      {
        projection: {
          _id: 0,
          id: 1,
          email: 1,
          full_name: 1,
          role: 1,
          disabled: 1,
        },
      },
    );
    if (!row || row.disabled === true) {
      res.status(503).json({ message: "homolog_seed_unavailable" });
      return;
    }
    const loginStamp = nowIso();
    await db.collection("users").updateOne(
      { id: row.id },
      { $set: { last_login_at: loginStamp } },
    );
    const ttlMinutes = await getSessionTtlMinutes();
    const { token } = await createSession(db, row.id, { minutes: ttlMinutes });
    setSessionCookie(res, token, ttlMinutes * 60);
    ensureCsrfCookie(req, res);
    await recordAudit(db, {
      userId: row.id,
      actorUserId: row.id,
      action: "auth.homolog_dev_login",
      details: { email: row.email },
      ip: clientIp(req),
      ...auditCtx(req),
    });
    res.json({ ok: true, email: row.email });
  });

  app.get("/api/admin/google-login/config", requireAuth, requireAdmin, async (_req, res) => {
    const cfg = await getGoogleLoginConfig(db);
    res.setHeader("Cache-Control", "no-store");
    res.json(publicGoogleLoginConfig(cfg));
  });

  app.put("/api/admin/google-login/config", requireAuth, requireAdmin, async (req, res) => {
    const schema = z.object({
      enabled: z.boolean().optional(),
      public_base_url: z.string().max(2048).optional(),
      client_id: z.string().max(512).optional(),
      client_secret: z.string().max(4096).optional(),
      clear_client_secret: z.boolean().optional(),
      allowed_emails: z.union([z.string(), z.array(z.string())]).optional(),
      backup: z
        .object({
          enabled: z.boolean().optional(),
          drive_folder_id: z.string().max(512).optional(),
          account_email: z.string().email().or(z.literal("")).optional(),
          schedule_enabled: z.boolean().optional(),
          time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
          days: z
            .array(z.enum(["sun", "mon", "tue", "wed", "thu", "fri", "sat"]))
            .optional(),
          timezone: z.string().trim().min(1).max(80).optional(),
        })
        .optional(),
      calendar: z
        .object({
          enabled: z.boolean().optional(),
          calendar_id: z.string().max(255).optional(),
          account_email: z.string().email().or(z.literal("")).optional(),
          sync_direction: z.enum(["push", "pull", "two_way"]).optional(),
          auto_sync_on_save: z.boolean().optional(),
          default_timezone: z.string().trim().min(1).max(80).optional(),
        })
        .optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "invalid_request" });
      return;
    }

    const base = String(parsed.data.public_base_url || "").trim();
    if (base) {
      try {
        const u = new URL(base);
        if (!["http:", "https:"].includes(u.protocol)) {
          res.status(400).json({ message: "invalid_public_base_url" });
          return;
        }
      } catch {
        res.status(400).json({ message: "invalid_public_base_url" });
        return;
      }
    }
    const allowedEmails = parseGoogleLoginAllowedEmails(parsed.data.allowed_emails || "");
    for (const email of allowedEmails) {
      const check = z.string().email().safeParse(email);
      if (!check.success) {
        res.status(400).json({ message: "invalid_allowed_email" });
        return;
      }
    }
    if (
      parsed.data.backup?.schedule_enabled === true &&
      Array.isArray(parsed.data.backup.days) &&
      parsed.data.backup.days.length === 0
    ) {
      res.status(400).json({ message: "invalid_backup_schedule" });
      return;
    }

    const cfg = await saveGoogleLoginConfig(db, {
      ...parsed.data,
      allowed_emails: allowedEmails,
    });
    await recordAudit(db, {
      userId: null,
      actorUserId: req.user.id,
      action: "admin.google_login_config_update",
      details: {
        enabled: cfg.enabled !== false,
        configured: isGoogleLoginConfiguredValue(cfg),
        allowed_count: cfg.allowed_emails.length,
        public_base_url: cfg.public_base_url,
        client_id_set: Boolean(cfg.client_id),
        client_secret_set: Boolean(cfg.client_secret),
        google_backup_enabled: cfg.backup.enabled === true,
        google_backup_schedule_enabled: cfg.backup.schedule_enabled === true,
        google_backup_days: cfg.backup.days,
        google_backup_time: cfg.backup.time,
        google_calendar_enabled: cfg.calendar.enabled === true,
        google_calendar_id: cfg.calendar.calendar_id,
        google_calendar_sync_direction: cfg.calendar.sync_direction,
        google_calendar_auto_sync_on_save:
          cfg.calendar.auto_sync_on_save !== false,
      },
      ip: clientIp(req),
      ...auditCtx(req),
    });
    res.setHeader("Cache-Control", "no-store");
    res.json(publicGoogleLoginConfig(cfg));
  });

  app.get("/api/auth/google-login/config", async (req, res) => {
    const cfg = await getGoogleLoginConfig(db);
    const remembered_email = sanitizeGoogleLoginHint(req.cookies?.[GOOGLE_LOGIN_HINT_COOKIE]);
    res.setHeader("Cache-Control", "no-store");
    res.json({
      enabled: isGoogleLoginConfiguredValue(cfg),
      remembered_email: remembered_email || null,
    });
  });

  app.post("/api/auth/google-login/forget-hint", (_req, res) => {
    clearGoogleLoginHintCookie(res);
    res.setHeader("Cache-Control", "no-store");
    res.json({ ok: true });
  });

  async function handleGoogleLoginStart(req, res) {
    const googleConfig = await getGoogleLoginConfig(db);
    if (!isGoogleLoginConfiguredValue(googleConfig)) {
      res.status(503).json({ message: "google_login_unavailable" });
      return;
    }
    const body = req.body && typeof req.body === "object" ? req.body : {};
    if (body.public_origin) {
      req.query = {
        ...(req.query && typeof req.query === "object" ? req.query : {}),
        public_origin: String(body.public_origin),
      };
    }
    const pickAccount =
      body.pick_account === true ||
      String(body.pick_account || req.query.pick_account || "").trim() === "1" ||
      String(body.pick_account || req.query.pick_account || "").trim().toLowerCase() === "true";
    const noSilent =
      body.no_silent === true ||
      String(body.no_silent || req.query.no_silent || "").trim() === "1" ||
      String(body.no_silent || req.query.no_silent || "").trim().toLowerCase() === "true";
    const hintParam = sanitizeGoogleLoginHint(body.login_hint || req.query.login_hint);
    const hintCookie = sanitizeGoogleLoginHint(req.cookies?.[GOOGLE_LOGIN_HINT_COOKIE]);
    const loginHint = pickAccount ? "" : hintParam || hintCookie;
    const redirectUri = googleLoginRedirectUriForRequest(googleConfig, req);
    try {
      const state = await createGoogleLoginOauthState(db);
      const url = buildGoogleLoginAuthorizeUrl({
        state,
        redirectUri,
        config: googleConfig,
        loginHint,
        forceAccountPicker: pickAccount,
        preferSilent: !pickAccount && !noSilent && !!loginHint,
      });
      res.setHeader("Cache-Control", "no-store");
      res.json({ auth_url: url, remembered_email: loginHint || null });
    } catch {
      res.status(500).json({ message: "google_login_start_failed" });
    }
  }

  app.post("/api/auth/google-login/start", loginMw, async (req, res) => {
    if (
      !(await requireRecaptchaToken(req, res, {
        expectedAction: RECAPTCHA_ACTIONS.GOOGLE_LOGIN,
      }))
    ) {
      return;
    }
    await handleGoogleLoginStart(req, res);
  });

  app.get("/api/auth/google-login/start", loginMw, async (req, res) => {
    if (isRecaptchaEnforced()) {
      res.status(403).json({ message: "recaptcha_required" });
      return;
    }
    await handleGoogleLoginStart(req, res);
  });

  app.get("/api/auth/google-login/callback", async (req, res) => {
    const googleConfig = await getGoogleLoginConfig(db);
    const base = resolveGoogleLoginPublicBase(googleConfig, req);
    if (!base || !isGoogleLoginConfiguredValue(googleConfig)) {
      res.status(400).type("text/plain").send("Login Google não configurado.");
      return;
    }
    const redirectUri = googleLoginRedirectUriForRequest(googleConfig, req);
    const code = String(req.query.code || "").trim();
    const state = String(req.query.state || "").trim();
    const oauthErr = String(req.query.error || "").trim();

    const errRedirect = (reason) => {
      const u = new URL(`${base}/Home`);
      u.searchParams.set("google_login", "err");
      u.searchParams.set("reason", reason);
      res.redirect(302, u.toString());
    };

    if (oauthErr) {
      const retryable = new Set([
        "login_required",
        "interaction_required",
        "consent_required",
      ]);
      errRedirect(retryable.has(oauthErr) ? "google_reauth" : "oauth");
      return;
    }

    if (!code || !state) {
      errRedirect("oauth");
      return;
    }
    const st = await consumeGoogleLoginOauthState(db, state);
    if (!st) {
      errRedirect("oauth");
      return;
    }

    let googleProfile;
    try {
      googleProfile = await exchangeGoogleLoginCodeForProfile({
        code,
        redirectUri,
        config: googleConfig,
      });
    } catch {
      await recordAudit(db, {
        userId: null,
        actorUserId: null,
        action: "auth.login_google_failed",
        details: { step: "token" },
        ip: clientIp(req),
        ...auditCtx(req),
      });
      errRedirect("oauth");
      return;
    }

    const email = googleProfile.email;
    const ipKey = `ip:${clientIp(req)}`;
    const userKey = `user:${email}`;
    const googleFailureKeys = loginFailureKeys({ ipKey, userKey, email });
    const blockRows = skipLoginAttemptLock
      ? []
      : await readLoginBlocks(db, googleFailureKeys);
    if (blockRows && blockRows.length > 0) {
      await recordAudit(db, {
        userId: null,
        actorUserId: null,
        action: "auth.login_google_failed",
        details: { reason: "blocked" },
        ip: clientIp(req),
        ...auditCtx(req),
      });
      errRedirect("blocked");
      return;
    }

    if (!isEmailAllowedForGoogleLogin(email, googleConfig)) {
      await recordAudit(db, {
        userId: null,
        actorUserId: null,
        action: "auth.login_google_denied",
        details: { reason: "not_allowlisted" },
        ip: clientIp(req),
        ...auditCtx(req),
      });
      errRedirect("forbidden");
      return;
    }

    const row = await db.collection("users").findOne(
      { email },
      {
        projection: {
          _id: 0,
          id: 1,
          email: 1,
          full_name: 1,
          role: 1,
          disabled: 1,
          password_hash: 1,
          avatar_url: 1,
        },
      },
    );
    if (!row || row.disabled === true) {
      if (!skipLoginAttemptLock) {
        await bumpLoginFailure(db, googleFailureKeys);
      }
      await recordAudit(db, {
        userId: row?.id ?? null,
        actorUserId: null,
        action: "auth.login_google_failed",
        details: { reason: "no_account_or_disabled" },
        ip: clientIp(req),
        ...auditCtx(req),
      });
      errRedirect("no_account");
      return;
    }

    if (enforceSingleSession) {
      const nowIsoStr = nowIso();
      const active = await db.collection("sessions").findOne({
        user_id: row.id,
        expires_at: { $gt: nowIsoStr },
      });
      if (active) {
        await db.collection("sessions").deleteMany({ user_id: row.id });
        await recordAudit(db, {
          userId: row.id,
          actorUserId: row.id,
          action: "auth.sessions_revoked_by_login",
          details: { reason: "replace_on_google_login" },
          ip: clientIp(req),
          ...auditCtx(req),
        });
      }
    }

    await clearLoginFailures(db, googleFailureKeys);
    const loginStamp = nowIso();
    /**
     * Espelha o perfil Google na conta local em cada login: a foto da Google
     * substitui o avatar atual e o nome completo é preenchido se estiver vazio.
     * Assim, ao trocar a foto do Google, o próximo login reflete a alteração.
     */
    const set = { last_login_at: loginStamp };
    const unset = {};
    const googlePicture = String(googleProfile.picture || "").trim();
    if (googlePicture) {
      if (row.avatar_url !== googlePicture) {
        set.avatar_url = googlePicture;
      }
    } else if (row.avatar_url) {
      /* Sem foto vinda da Google: mantém a atual (se houver) — não apaga. */
    }
    const googleName = String(googleProfile.name || "").trim();
    if (googleName && !String(row.full_name || "").trim()) {
      set.full_name = googleName;
    }
    const update = { $set: set };
    if (Object.keys(unset).length > 0) update.$unset = unset;
    await db.collection("users").updateOne({ id: row.id }, update);

    const ttlMinutes = await getSessionTtlMinutes();
    const { token } = await createSession(db, row.id, { minutes: ttlMinutes });
    setSessionCookie(res, token, ttlMinutes * 60);
    setGoogleLoginHintCookie(res, email);
    ensureCsrfCookie(req, res);
    await recordAudit(db, {
      userId: row.id,
      actorUserId: row.id,
      action: "auth.login_google",
      details: {
        email: row.email,
        avatar_synced: Boolean(googlePicture && set.avatar_url),
        full_name_synced: Boolean(set.full_name),
      },
      ip: clientIp(req),
      ...auditCtx(req),
    });
    const okUrl = new URL(`${base}/Home`);
    okUrl.searchParams.set("google_login", "ok");
    res.redirect(302, okUrl.toString());
  });

  app.post("/api/auth/logout", async (req, res) => {
    if (req.user) {
      await recordAudit(db, {
        userId: req.user.id,
        actorUserId: req.user.id,
        action: "auth.logout",
        details: { email: req.user.email },
        ip: clientIp(req),
        ...auditCtx(req),
      });
    }
    if (req.sessionToken) {
      await deleteSessionByToken(db, req.sessionToken);
    }
    clearSessionCookie(res);
    res.clearCookie(CSRF_COOKIE, csrfCookieOptions);
    res.json({ ok: true });
  });

  app.get("/api/auth/me", (req, res) => {
    setPrivateNoStore(res);
    res.setHeader("Cache-Control", "no-store, private");
    res.setHeader("Vary", "Cookie");
    if (!req.user) {
      res.status(401).json({ message: "auth_required" });
      return;
    }
    res.json(req.user);
  });

  app.get("/api/auth/menu-effective", requireAuth, async (req, res) => {
    res.setHeader("Cache-Control", "no-store, private");
    res.setHeader("Vary", "Cookie");
    res.json(await effectiveMenuPermissions(db, req.user));
  });

  app.use("/api/data", createDataRouter(db));

  app.put("/api/users/me", requireAuth, async (req, res) => {
    const avatarUrlSchema = z
      .string()
      .max(2048)
      .optional()
      .refine((s) => {
        if (s === undefined) return true;
        const t = s.trim();
        return t === "" || t.startsWith("/") || /^https?:\/\//i.test(t);
      }, { message: "invalid_avatar_url" });
    const schema = z.object({
      full_name: z.string().min(1).optional(),
      email: z.string().email().optional(),
      current_password: z.string().min(1).optional(),
      new_password: z.string().optional(),
      avatar_url: avatarUrlSchema,
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "invalid_request" });
      return;
    }
    const row = await db.collection("users").findOne(
      { id: req.user.id },
      { projection: { _id: 0, id: 1, email: 1, full_name: 1, password_hash: 1, avatar_url: 1 } },
    );
    if (!row) {
      res.status(404).json({ message: "not_found" });
      return;
    }
    const nextEmail =
      parsed.data.email != null ? parsed.data.email.toLowerCase().trim() : undefined;
    if (nextEmail && nextEmail !== row.email) {
      const clash = await db.collection("users").findOne({ email: nextEmail });
      if (clash && clash.id !== row.id) {
        res.status(409).json({ message: "email_already_exists" });
        return;
      }
    }

    const newPass =
      parsed.data.new_password === undefined || parsed.data.new_password === null
        ? ""
        : String(parsed.data.new_password).trim();
    const wantsPasswordChange = newPass.length > 0;
    const wantsEmailChange = !!(nextEmail && nextEmail !== row.email);
    const requiresPassword =
      wantsPasswordChange || wantsEmailChange;

    if (requiresPassword) {
      if (!row.password_hash) {
        res.status(409).json({ message: "password_not_set" });
        return;
      }
      if (!parsed.data.current_password) {
        res.status(400).json({ message: "current_password_required" });
        return;
      }
      const pwOk = await verifyPassword(row.password_hash, parsed.data.current_password);
      if (!pwOk) {
        res.status(401).json({ message: "invalid_credentials" });
        return;
      }
    }

    if (wantsPasswordChange) {
      const pwPolicy = validateAccountPassword(newPass);
      if (respondIfPasswordPolicyFails(res, pwPolicy)) return;
    }

    let password_hash;
    if (wantsPasswordChange) {
      password_hash = await hashPassword(newPass);
    }
    const now = nowIso();
    const $set = { updated_at: now };
    const $unset = {};
    if (nextEmail != null) $set.email = nextEmail;
    if (parsed.data.full_name != null) $set.full_name = parsed.data.full_name.trim();
    if (password_hash) $set.password_hash = password_hash;
    if (parsed.data.avatar_url !== undefined) {
      const av = String(parsed.data.avatar_url).trim();
      if (av === "") {
        $unset.avatar_url = "";
      } else {
        $set.avatar_url = av;
      }
    }
    const updateDoc = { $set };
    if (Object.keys($unset).length > 0) updateDoc.$unset = $unset;
    await db.collection("users").updateOne({ id: row.id }, updateDoc);
    const fields = [];
    if (nextEmail != null) fields.push("email");
    if (parsed.data.full_name != null) fields.push("full_name");
    if (password_hash) fields.push("password");
    if (parsed.data.avatar_url !== undefined) fields.push("avatar_url");
    await recordAudit(db, {
      userId: row.id,
      actorUserId: row.id,
      action: "user.profile_update",
      details: { fields },
      ip: clientIp(req),
      ...auditCtx(req),
    });
    const u = await db.collection("users").findOne(
      { id: row.id },
      {
        projection: {
          _id: 0,
          id: 1,
          email: 1,
          full_name: 1,
          role: 1,
          funcao: 1,
          avatar_url: 1,
        },
      },
    );
    res.json(u);
  });

  app.get("/api/admin/users", requireAdmin, async (_req, res) => {
    setPrivateNoStore(res);
    const users = await db
      .collection("users")
      .find(
        notDeletedFilter(),
        {
          projection: {
            _id: 0,
            id: 1,
            email: 1,
            full_name: 1,
            role: 1,
            funcao: 1,
            disabled: 1,
            created_at: 1,
            updated_at: 1,
            invited_at: 1,
            last_login_at: 1,
            avatar_url: 1,
            permission_group_id: 1,
            password_hash: 1,
          },
        },
      )
      .sort({ role: -1, created_at: -1 })
      .toArray();
    res.json(
      users.map((u) => {
        const { password_hash, ...rest } = u;
        return {
          ...rest,
          login_via_google: !password_hash,
        };
      }),
    );
  });

  const permissionBlockSchema = z
    .object({
      create: z.boolean().optional(),
      edit: z.boolean().optional(),
      delete: z.boolean().optional(),
    })
    .strict()
    .partial();

  const permissionGroupPermissionsSchema = z.record(z.string(), permissionBlockSchema);

  app.get("/api/admin/permission-groups", requireAdmin, async (_req, res) => {
    const rows = await db
      .collection("permission_groups")
      .find(
        notDeletedFilter(),
        {
          projection: {
            _id: 0,
            id: 1,
            slug: 1,
            name: 1,
            description: 1,
            permissions: 1,
            created_at: 1,
            updated_at: 1,
          },
        },
      )
      .sort({ id: 1 })
      .toArray();
    res.json(rows);
  });

  app.post("/api/admin/permission-groups", requireAdmin, async (req, res) => {
    const schema = z.object({
      name: z.string().min(1).max(120),
      description: z.string().max(500).optional().default(""),
      permissions: permissionGroupPermissionsSchema.optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "invalid_request" });
      return;
    }
    const now = nowIso();
    const id = await nextSeq(db, "permission_groups");
    const permissions =
      parsed.data.permissions && typeof parsed.data.permissions === "object"
        ? parsed.data.permissions
        : defaultGroupPermissionsMap();
    await db.collection("permission_groups").insertOne({
      id,
      name: parsed.data.name.trim(),
      description: String(parsed.data.description || "").trim(),
      permissions,
      created_at: now,
      updated_at: now,
    });
    await recordAudit(db, {
      userId: null,
      actorUserId: req.user.id,
      action: "admin.permission_group.create",
      details: { id, name: parsed.data.name.trim() },
      ip: clientIp(req),
      ...auditCtx(req),
    });
    res.status(201).json({ id });
  });

  app.put("/api/admin/permission-groups/:id", requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      res.status(400).json({ message: "invalid_id" });
      return;
    }
    const schema = z.object({
      name: z.string().min(1).max(120).optional(),
      description: z.string().max(500).optional(),
      permissions: permissionGroupPermissionsSchema.optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "invalid_request" });
      return;
    }
    const cur = await db.collection("permission_groups").findOne({ id }, { projection: { id: 1 } });
    if (!cur) {
      res.status(404).json({ message: "not_found" });
      return;
    }
    const now = nowIso();
    const $set = { updated_at: now };
    if (parsed.data.name != null) $set.name = parsed.data.name.trim();
    if (parsed.data.description !== undefined) {
      $set.description = String(parsed.data.description ?? "").trim();
    }
    if (parsed.data.permissions != null) {
      $set.permissions = parsed.data.permissions;
    }
    await db.collection("permission_groups").updateOne({ id }, { $set });
    await recordAudit(db, {
      userId: null,
      actorUserId: req.user.id,
      action: "admin.permission_group.update",
      details: { id },
      ip: clientIp(req),
      ...auditCtx(req),
    });
    res.json({ ok: true });
  });

  app.delete("/api/admin/permission-groups/:id", requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      res.status(400).json({ message: "invalid_id" });
      return;
    }
    const row = await db
      .collection("permission_groups")
      .findOne({ id }, { projection: { id: 1, slug: 1 } });
    if (!row) {
      res.status(404).json({ message: "not_found" });
      return;
    }
    if (row.slug === BUILTIN_ADMIN_GROUP_SLUG) {
      res.status(400).json({ message: "builtin_permission_group" });
      return;
    }
    const inUse = await db
      .collection("users")
      .countDocuments({ permission_group_id: id, ...notDeletedFilter() });
    if (inUse > 0) {
      res.status(409).json({ message: "permission_group_in_use", count: inUse });
      return;
    }
    const marked = await markRowSoftDeleted(db, "permission_groups", { id }, req.user.id);
    if (!marked.ok) {
      res.status(404).json({ message: "not_found" });
      return;
    }
    await recordAudit(db, {
      userId: null,
      actorUserId: req.user.id,
      action: "admin.permission_group.delete_scheduled",
      details: { id, purge_after: marked.purge_after },
      ip: clientIp(req),
      ...auditCtx(req),
    });
    res.json({ ok: true, purge_after: marked.purge_after });
  });

  app.get("/api/admin/metrics/home-views", requireAdmin, async (req, res) => {
    const limit = Math.min(500, Math.max(1, Number(req.query.limit) || 200));
    const skip = Math.max(0, Math.min(100000, Number(req.query.skip) || 0));
    const q = req.query.q != null ? String(req.query.q).trim() : "";

    const match = {};
    if (q) {
      match.ip = { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
    }

    const [totalViewsRow, uniqueIps, rows] = await Promise.all([
      db.collection("app_kv").findOne({ key: HOME_VIEWS_KEY }),
      db.collection(HOME_VIEWS_BY_IP_COLLECTION).countDocuments(match),
      db
        .collection(HOME_VIEWS_BY_IP_COLLECTION)
        .find(match, { projection: { _id: 0, ip: 1, count: 1, last_seen_at: 1, created_at: 1 } })
        .sort({ last_seen_at: -1, count: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
    ]);

    const totalViews = Number(totalViewsRow?.value?.count ?? 0);
    res.json({
      total_views: Number.isFinite(totalViews) && totalViews >= 0 ? totalViews : 0,
      unique_ips: uniqueIps,
      rows,
      limit,
      skip,
    });
  });

  app.get("/api/admin/session-ttl", requireAdmin, async (_req, res) => {
    const ttl_minutes = await getSessionTtlMinutes();
    res.json({ ttl_minutes });
  });

  app.get("/api/admin/login-blocks", requireAdmin, async (_req, res) => {
    const now = nowIso();
    const rows = await db
      .collection(LOGIN_FAIL_COLLECTION)
      .find({ locked_until: { $gt: now } })
      .project({
        _id: 0,
        key: 1,
        count: 1,
        hard: 1,
        locked_until: 1,
        last_fail_at: 1,
        updated_at: 1,
      })
      .sort({ hard: -1, locked_until: -1 })
      .limit(500)
      .toArray();
    res.json({ rows });
  });

  app.put("/api/admin/session-ttl", requireAdmin, async (req, res) => {
    const schema = z.object({
      ttl_minutes: z.number().int(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "invalid_request" });
      return;
    }
    const v = parsed.data.ttl_minutes;
    if (!SESSION_TTL_ALLOWED.has(v)) {
      res.status(400).json({ message: "invalid_ttl_minutes" });
      return;
    }
    await db.collection("app_kv").updateOne(
      { key: SESSION_TTL_KEY },
      { $set: { key: SESSION_TTL_KEY, value: String(v) } },
      { upsert: true },
    );
    await recordAudit(db, {
      userId: null,
      actorUserId: req.user.id,
      action: "admin.session_ttl_update",
      details: { ttl_minutes: v },
      ip: clientIp(req),
      ...auditCtx(req),
    });
    res.json({ ok: true, ttl_minutes: v });
  });

  app.get("/api/admin/audit-log", requireAdmin, async (req, res) => {
    setPrivateNoStore(res);
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
    const skip = Math.max(0, Math.min(10000, Number(req.query.skip) || 0));
    const action = req.query.action != null ? String(req.query.action) : "";
    const ip = req.query.ip != null ? String(req.query.ip) : "";
    const userNullRaw = req.query.user_null;
    const userIdNull =
      userNullRaw === "1" ||
      userNullRaw === "true" ||
      String(userNullRaw || "").toLowerCase() === "yes";

    const uidRaw = req.query.user_id;
    const actorRaw = req.query.actor_user_id;
    let userId;
    if (uidRaw != null && String(uidRaw).trim() !== "") {
      userId = Number(uidRaw);
      if (!Number.isFinite(userId)) {
        res.status(400).json({ message: "invalid_user_id" });
        return;
      }
    }
    let actorUserId;
    if (actorRaw != null && String(actorRaw).trim() !== "") {
      actorUserId = Number(actorRaw);
      if (!Number.isFinite(actorUserId)) {
        res.status(400).json({ message: "invalid_actor_user_id" });
        return;
      }
    }

    if (userIdNull && userId !== undefined) {
      res.status(400).json({ message: "invalid_request" });
      return;
    }

    const result = await listAuditLogsGlobal(db, {
      limit,
      skip,
      action,
      userId,
      userIdNull,
      actorUserId,
      ip,
    });
    res.json(result);
  });

  app.get("/api/admin/audit-log-retention", requireAdmin, async (_req, res) => {
    const retention = await getAuditLogRetentionPolicy(db);
    res.setHeader("Cache-Control", "no-store");
    res.json({ retention });
  });

  app.put("/api/admin/audit-log-retention", requireAdmin, async (req, res) => {
    const schema = z.object({
      retention: z.enum(["never", "30", "60", "90"]),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "invalid_request" });
      return;
    }
    const retention = await setAuditLogRetentionPolicy(db, parsed.data.retention);
    const { deleted } = await purgeAuditLogsByPolicy(db);
    await recordAudit(db, {
      userId: null,
      actorUserId: req.user.id,
      action: "admin.audit_log_retention_update",
      details: { retention, deleted_count: deleted },
      ip: clientIp(req),
      ...auditCtx(req),
    });
    res.setHeader("Cache-Control", "no-store");
    res.json({ ok: true, retention, deleted });
  });

  app.get("/api/admin/server-info", requireAdmin, async (_req, res) => {
    let pkg = { name: "icer", version: "0.0.0" };
    try {
      const raw = fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8");
      const j = JSON.parse(raw);
      if (typeof j.name === "string") pkg.name = j.name;
      if (typeof j.version === "string") pkg.version = j.version;
    } catch {
      /* defaults */
    }
    const mem = process.memoryUsage();
    const toMb = (n) => Math.round((n / 1024 / 1024) * 100) / 100;
    const bytesToGb = (b) =>
      Math.round((Number(b) / (1024 ** 3)) * 100000) / 100000;
    const bytesToMb = (b) =>
      Math.round((Number(b) / (1024 ** 2)) * 100) / 100;

    let mongodb = {
      ok: false,
      ping_ms: null,
      error: null,
      stats: null,
      collections: [],
    };
    try {
      const t0 = Date.now();
      await db.command({ ping: 1 });
      const pingMs = Date.now() - t0;
      let dbStats = null;
      try {
        const s = await db.command({ dbStats: 1, scale: 1 });
        dbStats = {
          collections: Number(s.collections || 0),
          objects: Number(s.objects || 0),
          data_bytes: Number(s.dataSize || 0),
          storage_bytes: Number(s.storageSize || 0),
          index_bytes: Number(s.indexSize || 0),
          total_bytes:
            Number(s.storageSize || 0) + Number(s.indexSize || 0),
          data_mb: bytesToMb(s.dataSize || 0),
          storage_mb: bytesToMb(s.storageSize || 0),
          index_mb: bytesToMb(s.indexSize || 0),
        };
      } catch {
        dbStats = null;
      }

      const collectionNames = [
        "posts",
        "eventos",
        "materiais",
        "fotos_galeria",
        "files",
        "users",
        "sessions",
        "audit_logs",
        "app_kv",
      ];
      const collectionRows = await Promise.all(
        collectionNames.map(async (name) => {
          try {
            const [count, stats] = await Promise.all([
              db.collection(name).estimatedDocumentCount(),
              db.command({ collStats: name, scale: 1 }).catch(() => null),
            ]);
            return {
              name,
              count,
              storage_bytes: Number(stats?.storageSize || 0),
              index_bytes: Number(stats?.totalIndexSize || 0),
              total_bytes:
                Number(stats?.storageSize || 0) +
                Number(stats?.totalIndexSize || 0),
            };
          } catch {
            return { name, count: 0, storage_bytes: 0, index_bytes: 0, total_bytes: 0 };
          }
        }),
      );
      mongodb = {
        ok: true,
        ping_ms: pingMs,
        error: null,
        stats: dbStats,
        collections: collectionRows.sort((a, b) => b.total_bytes - a.total_bytes),
      };
    } catch (e) {
      mongodb = {
        ok: false,
        ping_ms: null,
        error: e?.message || "ping_failed",
        stats: null,
        collections: [],
      };
    }

    const logDir = process.env.ICER_LOG_DIR
      ? path.resolve(process.env.ICER_LOG_DIR)
      : path.join(process.cwd(), "logs");
    const uploadsDisk = directoryFileStats(uploadDir);
    const logsDisk = directoryFileStats(logDir);
    const totalBytes = uploadsDisk.bytes + logsDisk.bytes;
    const disk = diskSpaceStats(uploadDir);
    const fileRows = await db
      .collection("files")
      .find(
        notDeletedFilter(),
        {
          projection: {
            _id: 0,
            id: 1,
            original_name: 1,
            mime: 1,
            size: 1,
            created_at: 1,
            public: 1,
          },
        },
      )
      .sort({ size: -1 })
      .limit(12)
      .toArray();
    const filesByMime = await db
      .collection("files")
      .aggregate([
        {
          $group: {
            _id: { mime: "$mime", original_name: "$original_name" },
            bytes: { $sum: { $ifNull: ["$size", 0] } },
            files: { $sum: 1 },
          },
        },
      ])
      .toArray();
    const byTypeMap = new Map();
    for (const row of filesByMime) {
      const type = classifyFileMime(row?._id?.mime, row?._id?.original_name);
      const cur = byTypeMap.get(type) || { type, bytes: 0, files: 0 };
      cur.bytes += Number(row.bytes || 0);
      cur.files += Number(row.files || 0);
      byTypeMap.set(type, cur);
    }
    const fileRegisteredBytes = [...byTypeMap.values()].reduce(
      (sum, row) => sum + row.bytes,
      0,
    );
    const byType = [...byTypeMap.values()]
      .map((row) => ({
        ...row,
        pct_of_uploads:
          fileRegisteredBytes > 0
            ? Math.round((row.bytes / fileRegisteredBytes) * 1000) / 10
            : 0,
        pct_of_disk:
          disk?.total_bytes > 0
            ? Math.round((row.bytes / disk.total_bytes) * 1000) / 10
            : null,
      }))
      .sort((a, b) => b.bytes - a.bytes);
    const fileRegisteredCount = byType.reduce((sum, row) => sum + row.files, 0);

    res.setHeader("Cache-Control", "no-store");
    res.json({
      app: { name: pkg.name, version: pkg.version },
      environment: process.env.NODE_ENV || "development",
      node: { version: process.version },
      process: {
        platform: process.platform,
        arch: process.arch,
        pid: process.pid,
        uptime_seconds: Math.floor(process.uptime()),
        cwd: process.cwd(),
      },
      memory_mb: {
        rss: toMb(mem.rss),
        heap_total: toMb(mem.heapTotal),
        heap_used: toMb(mem.heapUsed),
        external: toMb(mem.external),
        array_buffers: toMb(mem.arrayBuffers ?? 0),
      },
      os: {
        hostname: os.hostname(),
        type: os.type(),
        release: os.release(),
        cpu_count: os.cpus()?.length ?? 0,
        loadavg: process.platform === "win32" ? null : os.loadavg(),
        total_mem_mb: Math.round(os.totalmem() / 1024 / 1024),
        free_mem_mb: Math.round(os.freemem() / 1024 / 1024),
      },
      mongodb,
      storage: {
        uploads: {
          path: uploadDir,
          bytes: uploadsDisk.bytes,
          files: uploadsDisk.files,
          size_gb: bytesToGb(uploadsDisk.bytes),
        },
        logs: {
          path: logDir,
          bytes: logsDisk.bytes,
          files: logsDisk.files,
          size_gb: bytesToGb(logsDisk.bytes),
        },
        total_bytes: totalBytes,
        total_gb: bytesToGb(totalBytes),
        disk,
        site_files: {
          total_bytes: fileRegisteredBytes,
          total_files: fileRegisteredCount,
          by_type: byType,
          largest: fileRows.map((f) => ({
            id: f.id,
            name: f.original_name || `Arquivo #${f.id}`,
            mime: f.mime || "application/octet-stream",
            type: classifyFileMime(f.mime, f.original_name),
            bytes: Number(f.size || 0),
            public: f.public !== false,
            created_at: f.created_at || null,
          })),
        },
      },
      time_iso: new Date().toISOString(),
    });
  });

  /** Histórico Git (tags = versões), CHANGELOG e opcionalmente branches no GitHub. */
  app.get("/api/admin/site-releases", requireAdmin, async (_req, res) => {
    const root = process.cwd();
    let packageJson = { name: "icer", version: "0.0.0" };
    try {
      const raw = fs.readFileSync(path.join(root, "package.json"), "utf8");
      const j = JSON.parse(raw);
      if (typeof j.name === "string") packageJson.name = j.name;
      if (typeof j.version === "string") packageJson.version = j.version;
    } catch {
      /* defaults */
    }

    let changelogMarkdown = null;
    try {
      const cp = path.join(root, "CHANGELOG.md");
      if (fs.existsSync(cp)) {
        changelogMarkdown = fs.readFileSync(cp, "utf8").slice(0, 48_000);
      }
    } catch {
      /* ignore */
    }

    let gitInside = false;
    try {
      execSync("git rev-parse --is-inside-work-tree", {
        cwd: root,
        stdio: ["ignore", "pipe", "ignore"],
      });
      gitInside = true;
    } catch {
      gitInside = false;
    }

    /** @type {Array<{ tag: string; tag_date: string; commits: Array<{ hash: string; subject: string; date: string }> }>} */
    const releases = [];
    /** @type {Array<{ hash: string; subject: string; date: string }>} */
    const recentCommits = [];

    if (gitInside) {
      try {
        const tagsOut = execSync("git tag --sort=-creatordate", {
          cwd: root,
          encoding: "utf8",
          maxBuffer: 2_000_000,
        })
          .trim()
          .split("\n")
          .filter(Boolean)
          .slice(0, 30);

        for (let i = 0; i < tagsOut.length; i++) {
          const tag = tagsOut[i];
          const older = tagsOut[i + 1];
          let logOut = "";
          try {
            if (older) {
              logOut = execSync(`git log ${older}..${tag} --pretty=format:%h%x09%s%x09%ci`, {
                cwd: root,
                encoding: "utf8",
                maxBuffer: 4_000_000,
              });
            } else {
              logOut = execSync(`git log -n 120 --pretty=format:%h%x09%s%x09%ci ${tag}`, {
                cwd: root,
                encoding: "utf8",
                maxBuffer: 4_000_000,
              });
            }
          } catch {
            logOut = "";
          }
          const commits = [];
          for (const line of logOut.trim().split("\n")) {
            if (!line) continue;
            const parts = line.split("\t");
            if (parts.length >= 3) {
              commits.push({
                hash: parts[0],
                subject: parts[1] || "",
                date: parts[2] || "",
              });
            }
          }
          let tagDate = "";
          try {
            tagDate = execSync(`git log -1 --format=%ci ${tag}`, {
              cwd: root,
              encoding: "utf8",
            }).trim();
          } catch {
            /* ignore */
          }
          releases.push({ tag, tag_date: tagDate, commits });
        }

        const headLog = execSync("git log -n 80 --pretty=format:%h%x09%s%x09%ci HEAD", {
          cwd: root,
          encoding: "utf8",
          maxBuffer: 2_000_000,
        });
        for (const line of headLog.trim().split("\n")) {
          if (!line) continue;
          const parts = line.split("\t");
          if (parts.length >= 3) {
            recentCommits.push({
              hash: parts[0],
              subject: parts[1] || "",
              date: parts[2] || "",
            });
          }
        }
      } catch {
        /* ignore */
      }
    }

    const gitData =
      gitInside && (releases.length > 0 || recentCommits.length > 0);

    let github = {
      configured: true,
      using_default_repo: true,
      repo: "asafebernardo/icer",
      html_url: "https://github.com/asafebernardo/icer",
      error: null,
      default_branch: null,
      commits_branch: null,
      commit_versions: [],
    };
    try {
      github = await fetchGithubBranchReleases();
    } catch (e) {
      const raw =
        String(process.env.ICER_GITHUB_REPO || "").trim() || DEFAULT_ICER_GITHUB_REPO_RAW;
      const parsed = parseGithubRepo(raw);
      const full = parsed?.full || null;
      github = {
        configured: true,
        using_default_repo: !String(process.env.ICER_GITHUB_REPO || "").trim(),
        repo: full || raw,
        html_url: full ? `https://github.com/${full}` : null,
        error: String(e?.message || e),
        default_branch: null,
        commits_branch: null,
        commit_versions: [],
      };
    }

    res.setHeader("Cache-Control", "no-store");
    res.json({
      app: { name: packageJson.name, version: packageJson.version },
      git_available: gitData,
      releases,
      recent_commits: recentCommits,
      changelog_markdown: changelogMarkdown,
      github,
    });
  });

  // ── Admin: Rotinas de agendamento em massa (Eventos) ─────────────────────
  const BULK_RUNS_COLLECTION = "event_bulk_runs_v1";

  function labelBulkRunUser(u, fallbackId) {
    if (u && typeof u === "object") {
      const name = String(u.full_name || "").trim();
      const email = String(u.email || "").trim();
      if (name) return name;
      if (email) return email;
    }
    if (fallbackId != null && Number.isFinite(Number(fallbackId))) {
      return `Utilizador #${fallbackId}`;
    }
    return null;
  }

  app.get("/api/admin/eventos/bulk-runs", requireAuth, requireAdmin, async (req, res) => {
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
    const skip = Math.max(0, Math.min(10000, Number(req.query.skip) || 0));
    const rows = await db
      .collection(BULK_RUNS_COLLECTION)
      .find({}, { projection: { _id: 0 } })
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();
    const ids = new Set();
    for (const r of rows) {
      if (r.created_by_user_id != null) ids.add(r.created_by_user_id);
      if (r.undone_by_user_id != null) ids.add(r.undone_by_user_id);
    }
    const idList = [...ids];
    const users =
      idList.length === 0
        ? []
        : await db
            .collection("users")
            .find(
              { id: { $in: idList } },
              { projection: { _id: 0, id: 1, email: 1, full_name: 1 } },
            )
            .toArray();
    const byId = new Map(users.map((u) => [u.id, u]));
    const items = rows.map((r) => {
      const creator = byId.get(r.created_by_user_id);
      const undoer =
        r.undone_by_user_id != null ? byId.get(r.undone_by_user_id) : null;
      const operador = labelBulkRunUser(creator, r.created_by_user_id);
      const undo_operador =
        r.undone_at != null
          ? labelBulkRunUser(undoer, r.undone_by_user_id)
          : null;
      return {
        ...r,
        operador,
        undo_operador,
      };
    });
    res.setHeader("Cache-Control", "no-store");
    res.json({ items });
  });

  app.post("/api/admin/eventos/bulk-runs", requireAuth, requireAdmin, async (req, res) => {
    const schema = z.object({
      batch_id: z.string().min(6).max(96),
      titulo: z.string().max(256).optional(),
      categoria: z.string().max(80).optional(),
      range_start: z.string().max(32).optional(),
      range_end: z.string().max(32).optional(),
      created_event_ids: z.array(z.number().int().positive()).max(2000).optional(),
    });
    const parsed = schema.safeParse(req.body && typeof req.body === "object" ? req.body : {});
    if (!parsed.success) {
      res.status(400).json({ message: "invalid_request" });
      return;
    }
    const now = nowIso();
    const id = await nextSeq(db, "event_bulk_runs");
    const ids = parsed.data.created_event_ids || [];
    const doc = {
      id,
      batch_id: parsed.data.batch_id,
      titulo: parsed.data.titulo ? String(parsed.data.titulo).trim() : "",
      categoria: parsed.data.categoria ? String(parsed.data.categoria).trim() : "",
      range_start: parsed.data.range_start ? String(parsed.data.range_start).trim() : "",
      range_end: parsed.data.range_end ? String(parsed.data.range_end).trim() : "",
      created_event_ids: ids,
      created_count: ids.length,
      created_by_user_id: req.user.id,
      created_at: now,
      undone_at: null,
      undone_by_user_id: null,
      undone_deleted_count: null,
    };
    await db.collection(BULK_RUNS_COLLECTION).insertOne(doc);
    await recordAudit(db, {
      userId: req.user.id,
      actorUserId: req.user.id,
      action: "admin.eventos.bulk_run.create",
      details: { bulk_run_id: id, created_count: doc.created_count },
      ip: clientIp(req),
      ...auditCtx(req),
    });
    res.status(201).json(doc);
  });

  app.post(
    "/api/admin/eventos/bulk-runs/:id/undo",
    requireAuth,
    requireAdmin,
    async (req, res) => {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) {
        res.status(400).json({ message: "invalid_id" });
        return;
      }
      const run = await db
        .collection(BULK_RUNS_COLLECTION)
        .findOne({ id }, { projection: { _id: 0 } });
      if (!run) {
        res.status(404).json({ message: "not_found" });
        return;
      }
      if (run.undone_at) {
        res.status(409).json({ message: "already_undone" });
        return;
      }
      const batchId = String(run.batch_id || "").trim();
      if (!batchId) {
        res.status(400).json({ message: "invalid_batch_id" });
        return;
      }
      const fields = softDeleteFields(req.user.id);
      const upd = await db.collection("eventos").updateMany(
        { bulk_batch_id: batchId, ...notDeletedFilter() },
        { $set: fields },
      );
      const now = nowIso();
      await db.collection(BULK_RUNS_COLLECTION).updateOne(
        { id },
        {
          $set: {
            undone_at: now,
            undone_by_user_id: req.user.id,
            undone_deleted_count: upd.modifiedCount || 0,
            updated_at: now,
          },
        },
      );
      await recordAudit(db, {
        userId: req.user.id,
        actorUserId: req.user.id,
        action: "admin.eventos.bulk_run.undo",
        details: { bulk_run_id: id, scheduled: upd.modifiedCount || 0 },
        ip: clientIp(req),
        ...auditCtx(req),
      });
      res.json({ ok: true, deleted: upd.modifiedCount || 0 });
    },
  );

  // ── Admin: modelos de agendamento em massa (salvar / executar depois) ───
  const BULK_SCHEDULE_TEMPLATES = "event_bulk_schedule_templates_v1";
  const bulkSchedulePayloadSchema = z
    .object({
      titulo: z.string().optional(),
      categoria: z.string().optional(),
      corBarra: z.string().optional(),
      local: z.string().optional(),
      horario: z.string().optional(),
      descricao: z.string().optional(),
      repeatMode: z.enum(["weekly", "monthly_nth"]).optional(),
      weekday: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      weekInterval: z.string().optional(),
      monthNth: z.string().optional(),
      presbiteroEnabled: z.boolean().optional(),
      rowDefaults: z
        .object({
          preletor: z.string().optional(),
          presbitero: z.string().optional(),
        })
        .optional(),
      peopleByDate: z
        .record(
          z.object({
            preletor: z.string().optional(),
            presbitero: z.string().optional(),
          }),
        )
        .optional(),
    })
    .passthrough();

  app.get("/api/admin/eventos/bulk-schedules", requireAuth, requireAdmin, async (req, res) => {
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const rows = await db
      .collection(BULK_SCHEDULE_TEMPLATES)
      .find(notDeletedFilter(), { projection: { _id: 0 } })
      .sort({ updated_at: -1 })
      .limit(limit)
      .toArray();
    res.setHeader("Cache-Control", "no-store");
    res.json({ items: rows });
  });

  app.get("/api/admin/eventos/bulk-schedules/:id", requireAuth, requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      res.status(400).json({ message: "invalid_id" });
      return;
    }
    const row = await db
      .collection(BULK_SCHEDULE_TEMPLATES)
      .findOne({ id }, { projection: { _id: 0 } });
    if (!row || isDeletedRow(row)) {
      res.status(404).json({ message: "not_found" });
      return;
    }
    res.setHeader("Cache-Control", "no-store");
    res.json(row);
  });

  app.post("/api/admin/eventos/bulk-schedules", requireAuth, requireAdmin, async (req, res) => {
    const schema = z.object({
      nome: z.string().max(200).optional(),
      payload: bulkSchedulePayloadSchema,
    });
    const parsed = schema.safeParse(req.body && typeof req.body === "object" ? req.body : {});
    if (!parsed.success) {
      res.status(400).json({ message: "invalid_request" });
      return;
    }
    const now = nowIso();
    const templateId = await nextSeq(db, "event_bulk_schedule_templates");
    const nome =
      String(parsed.data.nome || "").trim() ||
      String(parsed.data.payload?.titulo || "").trim().slice(0, 200) ||
      `Agendamento #${templateId}`;
    const doc = {
      id: templateId,
      nome,
      payload: parsed.data.payload || {},
      created_at: now,
      updated_at: now,
      created_by_user_id: req.user.id,
    };
    await db.collection(BULK_SCHEDULE_TEMPLATES).insertOne(doc);
    await recordAudit(db, {
      userId: req.user.id,
      actorUserId: req.user.id,
      action: "admin.eventos.bulk_schedule.create",
      details: { template_id: templateId },
      ip: clientIp(req),
      ...auditCtx(req),
    });
    res.status(201).json(doc);
  });

  app.put("/api/admin/eventos/bulk-schedules/:id", requireAuth, requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      res.status(400).json({ message: "invalid_id" });
      return;
    }
    const schema = z.object({
      nome: z.string().max(200).optional(),
      payload: bulkSchedulePayloadSchema.optional(),
    });
    const parsed = schema.safeParse(req.body && typeof req.body === "object" ? req.body : {});
    if (!parsed.success) {
      res.status(400).json({ message: "invalid_request" });
      return;
    }
    const existing = await db.collection(BULK_SCHEDULE_TEMPLATES).findOne({ id }, { projection: { id: 1 } });
    if (!existing) {
      res.status(404).json({ message: "not_found" });
      return;
    }
    const now = nowIso();
    /** @type {Record<string, unknown>} */
    const $set = { updated_at: now };
    if (parsed.data.nome != null) {
      $set.nome = String(parsed.data.nome).trim().slice(0, 200);
    }
    if (parsed.data.payload != null) {
      $set.payload = parsed.data.payload;
    }
    await db.collection(BULK_SCHEDULE_TEMPLATES).updateOne({ id }, { $set });
    const row = await db
      .collection(BULK_SCHEDULE_TEMPLATES)
      .findOne({ id }, { projection: { _id: 0 } });
    await recordAudit(db, {
      userId: req.user.id,
      actorUserId: req.user.id,
      action: "admin.eventos.bulk_schedule.update",
      details: { template_id: id },
      ip: clientIp(req),
      ...auditCtx(req),
    });
    res.json(row);
  });

  app.delete("/api/admin/eventos/bulk-schedules/:id", requireAuth, requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      res.status(400).json({ message: "invalid_id" });
      return;
    }
    const marked = await markRowSoftDeleted(db, BULK_SCHEDULE_TEMPLATES, { id }, req.user.id);
    if (!marked.ok) {
      res.status(404).json({ message: "not_found" });
      return;
    }
    await recordAudit(db, {
      userId: req.user.id,
      actorUserId: req.user.id,
      action: "admin.eventos.bulk_schedule.delete_scheduled",
      details: { template_id: id, purge_after: marked.purge_after },
      ip: clientIp(req),
      ...auditCtx(req),
    });
    res.json({ ok: true, purge_after: marked.purge_after });
  });

  app.post("/api/admin/users", requireAdmin, async (_req, res) => {
    res.status(400).json({ message: "google_account_only" });
  });

  app.post("/api/admin/users/google-account", requireAdmin, async (req, res) => {
    const schema = z.object({
      email: z.string().email(),
      full_name: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "invalid_request" });
      return;
    }
    const email = parsed.data.email.toLowerCase().trim();
    const fullNameRaw = String(parsed.data.full_name || "").trim();
    const defaultName = email.includes("@") ? email.split("@")[0] : email;

    let allowResult;
    try {
      allowResult = await addGoogleAllowedEmail(db, email);
    } catch (e) {
      if (String(e?.message) === "invalid_allowed_email") {
        res.status(400).json({ message: "invalid_allowed_email" });
        return;
      }
      throw e;
    }

    const existing = await db.collection("users").findOne(
      { email },
      { projection: { _id: 0, id: 1, full_name: 1 } },
    );
    const now = nowIso();
    let userId;
    let created = false;

    if (existing) {
      userId = existing.id;
      if (fullNameRaw && fullNameRaw !== String(existing.full_name || "").trim()) {
        await db.collection("users").updateOne(
          { id: existing.id },
          { $set: { full_name: fullNameRaw, updated_at: now } },
        );
      }
    } else {
      userId = await nextSeq(db, "users");
      await db.collection("users").insertOne({
        id: userId,
        email,
        full_name: fullNameRaw || defaultName,
        role: "admin",
        funcao: "",
        password_hash: null,
        disabled: false,
        created_at: now,
        updated_at: now,
      });
      created = true;
    }

    await recordAudit(db, {
      userId,
      actorUserId: req.user.id,
      action: created ? "admin.user.create_google" : "admin.user.google_allowlist_add",
      details: {
        email,
        allowlist_added: allowResult.added,
        login_via_google: true,
      },
      ip: clientIp(req),
      ...auditCtx(req),
    });

    res.status(created ? 201 : 200).json({
      id: userId,
      email,
      created,
      allowlist_added: allowResult.added,
      allowed_emails: allowResult.cfg.allowed_emails,
      login_via_google: true,
    });
  });

  app.delete("/api/admin/google-login/allowed-emails", requireAdmin, async (req, res) => {
    const schema = z.object({ email: z.string().email() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "invalid_request" });
      return;
    }
    const email = parsed.data.email.toLowerCase().trim();
    let result;
    try {
      result = await removeGoogleAllowedEmail(db, email);
    } catch (e) {
      if (String(e?.message) === "invalid_allowed_email") {
        res.status(400).json({ message: "invalid_allowed_email" });
        return;
      }
      throw e;
    }
    await recordAudit(db, {
      userId: null,
      actorUserId: req.user.id,
      action: "admin.google_allowlist_remove",
      details: { email, removed: result.removed },
      ip: clientIp(req),
      ...auditCtx(req),
    });
    res.json({
      ok: true,
      removed: result.removed,
      allowed_emails: result.cfg.allowed_emails,
    });
  });

  app.post("/api/admin/users/invite", requireAdmin, async (req, res) => {
    const schema = z.object({
      email: z.string().email(),
      expires_days: z.number().int().min(1).max(30).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "invalid_request" });
      return;
    }
    const email = parsed.data.email.toLowerCase().trim();
    const role = "admin";

    const existing = await db.collection("users").findOne({ email }, { projection: { id: 1 } });
    if (existing) {
      res.status(409).json({ message: "email_already_exists" });
      return;
    }

    const now = nowIso();
    const id = await nextSeq(db, "users");
    await db.collection("users").insertOne({
      id,
      email,
      full_name: email.includes("@") ? email.split("@")[0] : email,
      role,
      funcao: "",
      password_hash: null,
      disabled: false,
      created_at: now,
      updated_at: now,
      invited_at: now,
    });

    const token = randomToken();
    const token_hash = sha256Hex(token);
    const expires_at = addDaysIso(parsed.data.expires_days ?? 7);
    const inviteId = await nextSeq(db, "user_invites");
    await db.collection("user_invites").insertOne({
      id: inviteId,
      user_id: id,
      token_hash,
      created_at: now,
      expires_at,
      used_at: null,
      used_ip: null,
      created_ip: clientIp(req),
    });

    await recordAudit(db, {
      userId: id,
      actorUserId: req.user.id,
      action: "admin.user.invite",
      details: { email, role, expires_at },
      ip: clientIp(req),
      ...auditCtx(req),
    });

    res.status(201).json({ id, invite_token: token, expires_at });
  });

  app.post("/api/auth/accept-invite", async (req, res) => {
    const schema = z.object({
      token: z.string().min(10),
      password: z.string().min(1),
      full_name: z.string().min(1).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "invalid_request" });
      return;
    }
    const pwPolicy = validateAccountPassword(parsed.data.password);
    if (respondIfPasswordPolicyFails(res, pwPolicy)) return;
    const token_hash = sha256Hex(parsed.data.token);
    const now = nowIso();
    const inv = await db.collection("user_invites").findOne(
      { token_hash, used_at: null, expires_at: { $gt: now } },
      { projection: { _id: 0, id: 1, user_id: 1 } },
    );
    if (!inv) {
      res.status(400).json({ message: "invalid_or_expired_invite" });
      return;
    }
    const user = await db.collection("users").findOne(
      { id: inv.user_id },
      { projection: { _id: 0, id: 1, email: 1, password_hash: 1 } },
    );
    if (!user) {
      res.status(404).json({ message: "not_found" });
      return;
    }
    if (user.password_hash) {
      res.status(409).json({ message: "password_already_set" });
      return;
    }
    const password_hash = await hashPassword(parsed.data.password);
    const $set = { password_hash, updated_at: now };
    if (parsed.data.full_name) {
      $set.full_name = parsed.data.full_name.trim();
    }
    await db.collection("users").updateOne({ id: user.id }, { $set });
    await db.collection("user_invites").updateOne(
      { id: inv.id },
      { $set: { used_at: now, used_ip: clientIp(req) } },
    );

    await recordAudit(db, {
      userId: user.id,
      actorUserId: user.id,
      action: "auth.invite_accepted",
      details: { email: user.email },
      ip: clientIp(req),
      ...auditCtx(req),
    });

    res.json({ ok: true });
  });

  app.put("/api/admin/users/:id", requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      res.status(400).json({ message: "invalid_id" });
      return;
    }
    const schema = z.object({
      email: z.string().email().optional(),
      full_name: z.string().min(1).optional(),
      password: z.string().min(1).optional(),
      funcao: z.string().optional(),
      disabled: z.boolean().optional(),
      permission_group_id: z.union([z.number().int().positive(), z.null()]).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "invalid_request" });
      return;
    }
    if (parsed.data.password) {
      const pwPolicy = validateAccountPassword(parsed.data.password);
      if (respondIfPasswordPolicyFails(res, pwPolicy)) return;
    }
    const cur = await db.collection("users").findOne(
      { id },
      { projection: { _id: 0, id: 1, email: 1, disabled: 1 } },
    );
    if (!cur) {
      res.status(404).json({ message: "not_found" });
      return;
    }
    let password_hash;
    if (parsed.data.password) {
      password_hash = await hashPassword(parsed.data.password);
    }
    const nextEmail =
      parsed.data.email != null ? parsed.data.email.toLowerCase().trim() : undefined;
    if (nextEmail && nextEmail !== cur.email) {
      const clash = await db.collection("users").findOne({ email: nextEmail });
      if (clash) {
        res.status(409).json({ message: "email_already_exists" });
        return;
      }
    }
    const now = nowIso();
    const $set = { updated_at: now };
    if (nextEmail != null) $set.email = nextEmail;
    if (parsed.data.full_name != null) $set.full_name = parsed.data.full_name.trim();
    if (parsed.data.funcao != null) $set.funcao = String(parsed.data.funcao);
    if (password_hash) $set.password_hash = password_hash;
    if (parsed.data.disabled != null) $set.disabled = parsed.data.disabled;
    if (parsed.data.permission_group_id !== undefined) {
      const gid = parsed.data.permission_group_id;
      if (gid === null) {
        $set.permission_group_id = null;
      } else {
        const g = await db.collection("permission_groups").findOne(
          { id: gid },
          { projection: { id: 1 } },
        );
        if (!g) {
          res.status(400).json({ message: "invalid_permission_group" });
          return;
        }
        $set.permission_group_id = gid;
      }
    }
    await db.collection("users").updateOne({ id }, { $set });
    const fields = [];
    if (nextEmail != null) fields.push("email");
    if (parsed.data.full_name != null) fields.push("full_name");
    if (parsed.data.funcao != null) fields.push("funcao");
    if (password_hash) fields.push("password");
    if (parsed.data.disabled != null) fields.push("disabled");
    if (parsed.data.permission_group_id !== undefined) fields.push("permission_group_id");
    await recordAudit(db, {
      userId: id,
      actorUserId: req.user.id,
      action: "admin.user.update",
      details: { fields },
      ip: clientIp(req),
      ...auditCtx(req),
    });
    res.json({ ok: true });
  });

  app.delete("/api/admin/users/:id", requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      res.status(400).json({ message: "invalid_id" });
      return;
    }
    if (req.user?.id === id) {
      res.status(400).json({ message: "cannot_delete_self" });
      return;
    }
    const row = await db.collection("users").findOne(
      { id },
      { projection: { _id: 0, id: 1, email: 1, role: 1 } },
    );
    if (!row) {
      res.status(404).json({ message: "not_found" });
      return;
    }
    if (row.role === "admin") {
      const adminCount = await db.collection("users").countDocuments({ role: "admin" });
      if (adminCount <= 1) {
        res.status(400).json({ message: "cannot_delete_last_admin" });
        return;
      }
    }

    await Promise.all([
      db.collection("sessions").deleteMany({ user_id: id }),
    ]);

    const marked = await markRowSoftDeleted(db, "users", { id }, req.user.id);
    if (!marked.ok) {
      res.status(404).json({ message: "not_found" });
      return;
    }
    await db.collection("users").updateOne({ id }, { $set: { disabled: true } });

    await recordAudit(db, {
      userId: id,
      actorUserId: req.user.id,
      action: "admin.user.delete_scheduled",
      details: { email: row.email, role: row.role, purge_after: marked.purge_after },
      ip: clientIp(req),
      ...auditCtx(req),
    });

    res.json({ ok: true, purge_after: marked.purge_after });
  });

  app.get("/api/admin/sessions/active", requireAdmin, async (_req, res) => {
    const now = nowIso();
    const rows = await db
      .collection("sessions")
      .aggregate([
        { $match: { expires_at: { $gt: now } } },
        {
          $lookup: {
            from: "users",
            localField: "user_id",
            foreignField: "id",
            as: "user",
          },
        },
        { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 0,
            token_hash: 1,
            user_id: 1,
            created_at: 1,
            expires_at: 1,
            user_email: "$user.email",
            user_full_name: "$user.full_name",
            user_role: "$user.role",
            user_disabled: "$user.disabled",
          },
        },
        { $sort: { expires_at: 1 } },
        { $limit: 500 },
      ])
      .toArray();
    res.json(rows);
  });

  app.delete("/api/admin/sessions/active/:userId", requireAdmin, async (req, res) => {
    const uid = Number(req.params.userId);
    if (!Number.isFinite(uid)) {
      res.status(400).json({ message: "invalid_user_id" });
      return;
    }
    if (req.user?.id === uid) {
      res.status(400).json({ message: "cannot_kick_self" });
      return;
    }
    const now = nowIso();
    const result = await db.collection("sessions").deleteMany({
      user_id: uid,
      expires_at: { $gt: now },
    });
    await recordAudit(db, {
      userId: uid,
      actorUserId: req.user.id,
      action: "admin.session.kick",
      details: { deleted: result.deletedCount },
      ip: clientIp(req),
      ...auditCtx(req),
    });
    res.json({ ok: true, deleted: result.deletedCount });
  });

  app.get("/api/admin/users/:id/audit-log", requireAdmin, async (req, res) => {
    setPrivateNoStore(res);
    const uid = Number(req.params.id);
    if (!Number.isFinite(uid)) {
      res.status(400).json({ message: "invalid_id" });
      return;
    }
    const exists = await db.collection("users").findOne({ id: uid }, { projection: { id: 1 } });
    if (!exists) {
      res.status(404).json({ message: "not_found" });
      return;
    }
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
    const skip = Math.max(0, Math.min(10000, Number(req.query.skip) || 0));
    const logs = await listAuditLogsForUser(db, uid, { limit, skip });
    res.json(logs);
  });

  function escapeMongoRegex(str) {
    return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  app.get("/api/admin/files", requireAdmin, async (req, res) => {
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
    const skip = Math.max(0, Math.min(50000, Number(req.query.skip) || 0));
    const q = String(req.query.q || "").trim();
    const kind = String(req.query.kind || "all").trim().toLowerCase();
    const clauses = [];
    if (q.length > 0) {
      clauses.push({
        $or: [
          { original_name: { $regex: escapeMongoRegex(q), $options: "i" } },
          { mime: { $regex: escapeMongoRegex(q), $options: "i" } },
        ],
      });
    }
    if (kind === "image") {
      clauses.push({ mime: { $regex: "^image\\/", $options: "i" } });
    } else if (kind === "video") {
      clauses.push({ mime: { $regex: "^video\\/", $options: "i" } });
    } else if (kind === "audio") {
      clauses.push({ mime: { $regex: "^audio\\/", $options: "i" } });
    }
    const filterBase =
      clauses.length === 0 ? {} : clauses.length === 1 ? clauses[0] : { $and: clauses };
    const filter = { $and: [filterBase, notDeletedFilter()] };
    const [items, total] = await Promise.all([
      db
        .collection("files")
        .find(filter)
        .project({ _id: 0, storage_path: 0 })
        .sort({ id: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection("files").countDocuments(filter),
    ]);
    res.json({ items, total, skip, limit });
  });

  app.get("/api/admin/files/:id", requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      res.status(400).json({ message: "invalid_id" });
      return;
    }
    const row = await db.collection("files").findOne({ id }, { projection: { _id: 0, storage_path: 0 } });
    if (!row || isDeletedRow(row)) {
      res.status(404).json({ message: "not_found" });
      return;
    }
    const references = await findFileReferences(db, id);
    res.json({ file: row, references });
  });

  app.delete("/api/admin/files/:id", requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      res.status(400).json({ message: "invalid_id" });
      return;
    }
    const forceRaw = String(req.query.force || "").toLowerCase();
    const force = forceRaw === "1" || forceRaw === "true" || forceRaw === "yes";
    const row = await db.collection("files").findOne({ id });
    if (!row || isDeletedRow(row)) {
      res.status(404).json({ message: "not_found" });
      return;
    }
    const references = await findFileReferences(db, id);
    if (references.length > 0 && !force) {
      res.status(409).json({ message: "in_use", references });
      return;
    }
    const marked = await markRowSoftDeleted(db, "files", { id }, req.user.id);
    if (!marked.ok) {
      res.status(404).json({ message: "not_found" });
      return;
    }
    await recordAudit(db, {
      userId: req.user.id,
      actorUserId: req.user.id,
      action: "admin.file.delete_scheduled",
      details: {
        file_id: id,
        original_name: row.original_name,
        forced: force && references.length > 0,
        reference_count: references.length,
        purge_after: marked.purge_after,
      },
      ip: clientIp(req),
      ...auditCtx(req),
    });
    res.json({ ok: true, purge_after: marked.purge_after });
  });

  const upload = multer({
    dest: uploadDir,
    limits: { fileSize: uploadMaxBytes },
  });

  app.post("/api/files", requireAuth, upload.single("file"), async (req, res) => {
    const f = req.file;
    if (!f) {
      res.status(400).json({ message: "file_required" });
      return;
    }
    const purposeRaw = req.body?.purpose;
    const purpose = typeof purposeRaw === "string" ? purposeRaw.trim() : "";
    if (purpose === "post_media") {
      const mime = String(f.mimetype || "");
      const ok = mime.startsWith("image/") || mime.startsWith("video/");
      if (!ok) {
        res.status(400).json({ message: "post_media_only" });
        return;
      }
    }

    let storagePath = f.path;
    let fileMime = f.mimetype || "application/octet-stream";
    let fileSize = f.size;
    let originalName = f.originalname;

    if (isConvertibleRasterMime(fileMime, originalName)) {
      const sharp = await getSharp();
      if (sharp) {
        try {
          storagePath = await replaceFileWithWebp(sharp, f.path);
          fileMime = "image/webp";
          fileSize = fs.statSync(storagePath).size;
          originalName = replaceNameExtensionToWebp(originalName);
        } catch (err) {
          log.warn(
            `${color.brightYellow("[files]")} falha ao converter upload para WebP: ${color.dim(
              String(err?.message || err),
            )}`,
          );
        }
      }
    }

    const now = nowIso();
    const fid = await nextSeq(db, "files");
    /** Ficheiros do site: leitura pública (imagens em posts, PDFs em materiais, etc.). */
    const publicRead =
      String(process.env.ICER_FILE_PUBLIC_READ || "true").toLowerCase() !== "false";
    await db.collection("files").insertOne({
      id: fid,
      owner_user_id: req.user.id,
      original_name: originalName,
      mime: fileMime,
      size: fileSize,
      storage_path: storagePath,
      created_at: now,
      public: publicRead,
    });
    await recordAudit(db, {
      userId: req.user.id,
      actorUserId: req.user.id,
      action: "file.upload",
      details: {
        file_id: fid,
        name: originalName,
        mime: fileMime,
        size: fileSize,
      },
      ip: clientIp(req),
      ...auditCtx(req),
    });
    res.status(201).json({ id: fid, url: `/api/files/${fid}` });
  });

  app.get("/api/files/:id", async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      res.status(400).json({ message: "invalid_id" });
      return;
    }
    const row = await db.collection("files").findOne({ id }, { projection: { _id: 0 } });
    if (!row || isDeletedRow(row)) {
      res.status(404).json({ message: "not_found" });
      return;
    }
    const isPublic = row.public !== false;
    if (!isPublic) {
      if (!req.user) {
        res.status(401).json({ message: "auth_required" });
        return;
      }
      const canRead =
        req.user.role === "admin" || req.user.id === row.owner_user_id;
      if (!canRead) {
        res.status(403).json({ message: "forbidden" });
        return;
      }
    }
    const diskPath = resolveUploadedDiskPath(row);
    if (!diskPath) {
      res.status(404).json({ message: "file_missing" });
      return;
    }

    /**
     * Variantes responsivas: aceita ?w=<largura> e/ou ?format=webp|jpeg.
     * Só aplicável a imagens raster (não SVG, não vídeo, não outros).
     */
    const mime = String(row.mime || "");
    const isRasterImage =
      /^image\//.test(mime) && !/svg|gif/.test(mime);
    const qW = Math.floor(Number(req.query.w));
    const qFormatRaw = String(req.query.format || "").toLowerCase();
    const wantedFormat =
      qFormatRaw === "webp" || qFormatRaw === "jpeg" || qFormatRaw === "jpg"
        ? qFormatRaw === "jpg"
          ? "jpeg"
          : qFormatRaw
        : null;
    const wantVariant =
      isRasterImage && (Number.isFinite(qW) && qW > 0) || wantedFormat;

    if (wantVariant) {
      const sharp = await getSharp();
      if (sharp) {
        try {
          const width = Number.isFinite(qW) && qW > 0
            ? Math.min(2048, Math.max(64, qW))
            : null;
          const fmt = wantedFormat || (mime === "image/png" ? "png" : "webp");
          const cacheDir = path.join(uploadDir, "_cache");
          fs.mkdirSync(cacheDir, { recursive: true });
          const cacheKey = `${id}-w${width || "orig"}-${fmt}.${fmt === "jpeg" ? "jpg" : fmt}`;
          const cachePath = path.join(cacheDir, cacheKey);
          let outBuffer = null;
          if (fs.existsSync(cachePath)) {
            outBuffer = fs.readFileSync(cachePath);
          } else {
            let pipeline = sharp(diskPath, { failOn: "none" });
            if (width) pipeline = pipeline.resize({ width, withoutEnlargement: true });
            if (fmt === "webp") pipeline = pipeline.webp({ quality: 82 });
            else if (fmt === "jpeg") pipeline = pipeline.jpeg({ quality: 82, mozjpeg: true });
            else if (fmt === "png") pipeline = pipeline.png({ compressionLevel: 9 });
            outBuffer = await pipeline.toBuffer();
            try {
              fs.writeFileSync(cachePath, outBuffer);
            } catch {
              /* não-fatal: serve sem cache em disco */
            }
          }
          res.setHeader("Content-Type", `image/${fmt}`);
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
          res.setHeader("Vary", "Accept");
          res.end(outBuffer);
          return;
        } catch (err) {
          log.warn(
            `${color.brightYellow("[files]")} falha ao gerar variante para id=${color.bold(
              String(id),
            )}: ${color.dim(String(err?.message || err))}`,
          );
          /* cai-para-trás para servir o original */
        }
      }
    }

    res.setHeader("Content-Type", row.mime || "application/octet-stream");
    res.setHeader(
      "Content-Disposition",
      `inline; filename=\"${String(row.original_name || "file").replaceAll('"', "")}\"`,
    );
    res.setHeader("Cache-Control", "public, max-age=86400");
    fs.createReadStream(diskPath).pipe(res);
  });

  const proxyTarget = enableUpstreamProxy
    ? process.env.ICER_UPSTREAM_API ||
      process.env.VITE_APP_BASE_URL ||
      ""
    : "";

  if (proxyTarget) {
    app.use(
      createProxyMiddleware({
        target: proxyTarget,
        changeOrigin: true,
        ws: true,
        logLevel: "silent",
        onProxyReq: (proxyReq, req) => {
          if (
            req.body &&
            typeof req.body === "object" &&
            !Buffer.isBuffer(req.body) &&
            ["POST", "PUT", "PATCH", "DELETE"].includes(req.method)
          ) {
            const bodyData = JSON.stringify(req.body);
            proxyReq.setHeader("Content-Type", "application/json; charset=utf-8");
            proxyReq.setHeader("Content-Length", Buffer.byteLength(bodyData));
            proxyReq.write(bodyData);
          }
          if (req.headers["x-origin-url"]) {
            proxyReq.setHeader("X-Origin-URL", String(req.headers["x-origin-url"]));
          }
          const auth = req.headers.authorization;
          if (auth) proxyReq.setHeader("Authorization", String(auth));
          const appId = req.headers["x-app-id"];
          if (appId) proxyReq.setHeader("X-App-Id", String(appId));
        },
        filter: (pathname) => {
          if (!pathname.startsWith("/api")) return false;
          if (pathname.startsWith("/api/auth")) return false;
          if (pathname.startsWith("/api/admin")) return false;
          if (pathname.startsWith("/api/users")) return false;
          if (pathname.startsWith("/api/files")) return false;
          if (pathname.startsWith("/api/data")) return false;
          if (pathname.startsWith("/api/health")) return false;
          return true;
        },
      }),
    );
  }

  /** SPA em produção: `npm run build` → `dist/` (Docker / deploy único). */
  const distPath = path.resolve(process.cwd(), "dist");

  app.get("/api/admin/pending-deletions", requireAdmin, async (_req, res) => {
    setPrivateNoStore(res);
    const pendingFilter = {
      deleted_at: { $exists: true, $nin: [null, ""] },
    };
    const items = [];
    for (const collection of SOFT_DELETE_COLLECTIONS) {
      const rows = await db
        .collection(collection)
        .find(pendingFilter, { projection: { _id: 0 } })
        .sort({ deleted_at: -1 })
        .limit(200)
        .toArray();
      for (const row of rows) {
        if (!isDeletedRow(row)) continue;
        items.push({
          type: collection,
          type_label: SOFT_DELETE_TYPE_LABELS[collection] || collection,
          id: row.id,
          label: softDeleteItemLabel(row),
          deleted_at: row.deleted_at,
          purge_after: row.purge_after,
          deleted_by_user_id: row.deleted_by_user_id ?? null,
        });
      }
    }
    items.sort((a, b) => String(b.deleted_at).localeCompare(String(a.deleted_at)));
    res.json({ items });
  });

  app.post(
    "/api/admin/pending-deletions/:type/:id/restore",
    requireAdmin,
    async (req, res) => {
      const type = String(req.params.type || "").trim();
      const id = Number(req.params.id);
      if (!SOFT_DELETE_COLLECTIONS.includes(type) || !Number.isFinite(id)) {
        res.status(400).json({ message: "invalid_request" });
        return;
      }
      const restored = await restoreSoftDeletedRow(db, type, { id });
      if (!restored.ok) {
        res.status(404).json({ message: "not_found" });
        return;
      }
      if (type === "users") {
        await db.collection("users").updateOne({ id }, { $set: { disabled: false } });
      }
      await recordAudit(db, {
        userId: type === "users" ? id : req.user.id,
        actorUserId: req.user.id,
        action: "admin.soft_delete.restore",
        details: { type, resource_id: id },
        ip: clientIp(req),
        ...auditCtx(req),
      });
      res.json({ ok: true });
    },
  );

  // Servir SPA quando existe `dist/` (Docker / deploy). Em local sem build, o front é o Vite.
  // Nunca redirecionar para localhost automaticamente — em hosting sem NODE_ENV=production
  // isso enviava o site público para http://localhost:5173.
  const serveSpa = fs.existsSync(path.join(distPath, "index.html"));
  if (serveSpa) {
    app.use(express.static(distPath, { index: false }));
    // Express 5 + path-to-regexp v6: não usar `app.get('*')` nem `*` em paths.
    // Fallback: middleware sem wildcard; só GET/HEAD e fora de `/api`.
    app.use((req, res, next) => {
      if (req.method !== "GET" && req.method !== "HEAD") {
        next();
        return;
      }
      if (req.path.startsWith("/api")) {
        next();
        return;
      }
      res.sendFile(path.join(distPath, "index.html"));
    });
  } else if (envBoolTrue("ICER_DEV_REDIRECT_TO_VITE")) {
    // Opt-in só para `npm run dev:server` local (sem `dist/`).
    const viteDevUrl = String(
      process.env.ICER_DEV_PUBLIC_BASE_URL || "http://localhost:5173",
    ).replace(/\/$/, "");
    app.use((req, res, next) => {
      if (req.method !== "GET" && req.method !== "HEAD") {
        next();
        return;
      }
      if (req.path.startsWith("/api") || req.path === "/health") {
        next();
        return;
      }
      const dest = `${viteDevUrl}${req.originalUrl || "/"}`;
      res.redirect(302, dest);
    });
  }

  void purgeAuditLogsByPolicy(db).catch(() => {});
  void purgeSoftDeletedRecords(db, uploadDir, resolveUploadedDiskPath).catch(() => {});
  setInterval(() => {
    void purgeAuditLogsByPolicy(db).catch(() => {});
    void purgeSoftDeletedRecords(db, uploadDir, resolveUploadedDiskPath).catch(() => {});
  }, 24 * 60 * 60 * 1000);

  return app;
}
