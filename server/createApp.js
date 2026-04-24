import fs from "node:fs";
import path from "node:path";
import express from "express";
import cookieParser from "cookie-parser";
import multer from "multer";
import { z } from "zod";
import { createProxyMiddleware } from "http-proxy-middleware";

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
import { addDaysIso, nowIso, randomToken, sha256Hex } from "./security.js";
import qrcode from "qrcode";
import { effectiveMenuPermissions, menuActionAllowed } from "./menuPermissions.js";
import {
  getPublicWorkspace,
  mergePublicWorkspaceAdmin,
  setAgendaSugestoesEditor,
  appendDismissedDestaque,
} from "./publicWorkspace.js";
import { createDataRouter } from "./dataRoutes.js";
import { nextSeq } from "./sequences.js";
import {
  clientIp,
  recordAudit,
  listAuditLogsForUser,
  listAuditLogsGlobal,
} from "./auditLog.js";
import { validateAccountPassword } from "./passwordPolicy.js";
import { getBackupSummary, pipeSiteBackupZip, writeSiteBackupZipToFile } from "./siteBackup.js";
import {
  getGoogleIntegrationSafe,
  mergeGoogleIntegration,
} from "./adminGoogleIntegration.js";
import {
  buildGoogleAuthUrl,
  buildOAuthClient,
  callbackRedirectBase,
  consumeGoogleOauthState,
  createGoogleOauthState,
  disconnectGoogle,
  exchangeCodeAndStoreTokens,
  getAuthorizedDriveClient,
  getGoogleTokensSafe,
} from "./googleOAuth.js";
import {
  decryptTotpSecret,
  encryptTotpSecret,
  generateRecoveryCodes,
  generateTotpSecret,
  hashRecoveryCode,
  isTotpEnforcementEnabled,
  totpGraceDays,
  totpVerify,
} from "./totp.js";

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

  // Bloqueio por tentativas falhadas (por IP e por utilizador/email).
  // Regras:
  // - 3 falhas na janela → bloqueio temporário
  // - 9 falhas na janela → "fora do ar" para esse utilizador/IP (bloqueio mais longo)
  const LOGIN_FAIL_WINDOW_MS = 15 * 60 * 1000;
  const LOGIN_FAIL_LOCK_3_MS = 15 * 60 * 1000;
  const LOGIN_FAIL_LOCK_9_MS = 24 * 60 * 60 * 1000;
  const LOGIN_FAIL_COLLECTION = "auth_login_failures_v1";

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  async function readLoginBlocks(keys) {
    if (!keys || keys.length === 0) return [];
    const now = nowIso();
    return await db
      .collection(LOGIN_FAIL_COLLECTION)
      .find({ key: { $in: keys }, locked_until: { $gt: now } })
      .project({ _id: 0, key: 1, locked_until: 1, hard: 1, count: 1 })
      .toArray();
  }

  async function bumpLoginFailure(keys, { hard = false } = {}) {
    const nowTs = Date.now();
    const now = nowIso();
    for (const key of keys) {
      if (!key) continue;
      const cur = await db
        .collection(LOGIN_FAIL_COLLECTION)
        .findOne({ key }, { projection: { _id: 0, key: 1, count: 1, first_fail_ts: 1 } });
      const freshWindow =
        !cur?.first_fail_ts || !Number.isFinite(cur.first_fail_ts)
          ? true
          : nowTs - cur.first_fail_ts > LOGIN_FAIL_WINDOW_MS;
      const nextCount = freshWindow ? 1 : Number(cur.count || 0) + 1;
      const first_fail_ts = freshWindow ? nowTs : cur.first_fail_ts;
      const $set = {
        key,
        count: nextCount,
        first_fail_ts,
        last_fail_at: now,
        updated_at: now,
      };
      let locked_until = null;
      let nextHard = hard === true;
      if (nextCount >= 9) {
        locked_until = new Date(nowTs + LOGIN_FAIL_LOCK_9_MS).toISOString();
        nextHard = true;
      } else if (nextCount >= 3) {
        locked_until = new Date(nowTs + LOGIN_FAIL_LOCK_3_MS).toISOString();
      }
      if (locked_until) $set.locked_until = locked_until;
      $set.hard = nextHard;
      await db
        .collection(LOGIN_FAIL_COLLECTION)
        .updateOne({ key }, { $set }, { upsert: true });
    }
  }

  async function clearLoginFailures(keys) {
    if (!keys || keys.length === 0) return;
    await db.collection(LOGIN_FAIL_COLLECTION).deleteMany({ key: { $in: keys } });
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
    res.json({ ok: true, time: nowIso() });
  });

  // Config pública do site (logo, fundos, paleta, etc.). Não depende de sessão.
  app.get("/api/site-config", async (_req, res) => {
    const cfg = await getPublicSiteConfig();
    res.setHeader("Cache-Control", "no-store");
    res.json(cfg);
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
  const isProd = process.env.NODE_ENV === "production";
  const csrfCookieOptions = {
    httpOnly: false,
    sameSite: "lax",
    secure: isProd,
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
      path === "/api/auth/csrf" ||
      path.startsWith("/api/health") ||
      path === "/api/site-config" ||
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

  // ── 2FA enforcement (bloqueia uso após grace) ───────────────────────────
  app.use(async (req, res, next) => {
    if (!req.user) return next();
    if (!isTotpEnforcementEnabled()) return next();
    if (req.user?.totp_enabled === true) return next();

    const p = String(req.path || req.originalUrl || "");
    const allow =
      p === "/api/auth/me" ||
      p === "/api/auth/logout" ||
      p === "/api/auth/csrf" ||
      p === "/api/auth/2fa/setup" ||
      p === "/api/auth/2fa/verify" ||
      p === "/api/auth/2fa/disable" ||
      p === "/api/auth/login-2fa";
    if (allow) return next();

    const started = req.user?.totp_grace_started_at
      ? new Date(String(req.user.totp_grace_started_at)).getTime()
      : 0;
    if (!started) return next(); // grace ainda não começou
    const days = totpGraceDays();
    const deadline = started + days * 24 * 60 * 60 * 1000;
    if (Date.now() <= deadline) return next();
    res.status(403).json({ message: "2fa_required" });
  });

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

  const loginMw = loginRateLimit ? rateLimitLogin : (_req, _res, next) => next();

  app.post("/api/auth/login", loginMw, async (req, res) => {
    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(1),
      /** Com palavra-passe válida, apaga sessões existentes e inicia uma nova (só se `enforceSingleSession`). */
      force_new_session: z.boolean().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "invalid_request" });
      return;
    }
    const email = parsed.data.email.toLowerCase().trim();
    const ipKey = `ip:${clientIp(req)}`;
    const userKey = `user:${email}`;
    const blockRows = await readLoginBlocks([ipKey, userKey]);
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
      await bumpLoginFailure([ipKey, userKey]);
      await sleep(350);
      res.status(401).json({ message: "invalid_credentials" });
      return;
    }
    if (!row.password_hash) {
      // Evita enumeração por estado de conta.
      await bumpLoginFailure([ipKey, userKey]);
      await sleep(350);
      res.status(401).json({ message: "invalid_credentials" });
      return;
    }
    if (row.disabled === true) {
      await bumpLoginFailure([ipKey, userKey]);
      await sleep(350);
      res.status(401).json({ message: "invalid_credentials" });
      return;
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
      await bumpLoginFailure([ipKey, userKey]);
      await sleep(350);
      res.status(401).json({ message: "invalid_credentials" });
      return;
    }
    await clearLoginFailures([ipKey, userKey]);

    // Sessão única: só depois de validar a palavra-passe (evita sondagem sem credenciais).
    if (enforceSingleSession) {
      const now = nowIso();
      const active = await db.collection("sessions").findOne({
        user_id: row.id,
        expires_at: { $gt: now },
      });
      if (active) {
        if (parsed.data.force_new_session === true) {
          await db.collection("sessions").deleteMany({ user_id: row.id });
          await recordAudit(db, {
            userId: row.id,
            actorUserId: row.id,
            action: "auth.sessions_revoked_by_login",
            details: { reason: "force_new_session" },
            ip: clientIp(req),
            ...auditCtx(req),
          });
        } else {
          res.status(409).json({ message: "session_already_active" });
          return;
        }
      }
    }

    const loginStamp = nowIso();
    await db.collection("users").updateOne(
      { id: row.id },
      { $set: { last_login_at: loginStamp } },
    );

    // Inicia grace period do 2FA para todos (se enforce estiver ativo).
    if (isTotpEnforcementEnabled()) {
      const u = await db.collection("users").findOne(
        { id: row.id },
        { projection: { _id: 0, totp_enabled: 1, totp_grace_started_at: 1, totp_secret_enc: 1 } },
      );
      const enabled = u?.totp_enabled === true && String(u?.totp_secret_enc || "").trim();
      if (!enabled) {
        const started = u?.totp_grace_started_at ? String(u.totp_grace_started_at) : "";
        if (!started) {
          await db.collection("users").updateOne(
            { id: row.id },
            { $set: { totp_grace_started_at: nowIso() } },
          );
        } else {
          const startMs = new Date(started).getTime();
          const deadline = startMs + totpGraceDays() * 24 * 60 * 60 * 1000;
          if (Number.isFinite(startMs) && Date.now() > deadline) {
            res.status(403).json({ message: "2fa_required" });
            return;
          }
        }
      }
    }

    // Se 2FA estiver ativo, não cria sessão: exige confirmação do TOTP.
    const two = await db.collection("users").findOne(
      { id: row.id },
      { projection: { _id: 0, totp_enabled: 1, totp_secret_enc: 1 } },
    );
    if (two?.totp_enabled === true && String(two?.totp_secret_enc || "").trim()) {
      const loginToken = randomToken();
      const tokenHash = sha256Hex(loginToken);
      const now = nowIso();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      await db.collection("auth_2fa_challenges_v1").insertOne({
        token_hash: tokenHash,
        user_id: row.id,
        created_at: now,
        expires_at: expiresAt,
      });
      res.json({ message: "2fa_required", login_token: loginToken, expires_at: expiresAt });
      return;
    }

    const ttlMinutes = await getSessionTtlMinutes();
    const { token } = await createSession(db, row.id, { minutes: ttlMinutes });
    setSessionCookie(res, token);
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

  app.post("/api/auth/login-2fa", async (req, res) => {
    const schema = z.object({
      login_token: z.string().min(10),
      code: z.string().min(4).max(12).optional(),
      recovery_code: z.string().min(6).max(64).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "invalid_request" });
      return;
    }
    const tokenHash = sha256Hex(parsed.data.login_token);
    const now = nowIso();
    const ch = await db.collection("auth_2fa_challenges_v1").findOne({
      token_hash: tokenHash,
      expires_at: { $gt: now },
    });
    if (!ch) {
      res.status(400).json({ message: "invalid_or_expired_2fa" });
      return;
    }
    const u = await db.collection("users").findOne(
      { id: ch.user_id },
      { projection: { _id: 0, id: 1, email: 1, totp_enabled: 1, totp_secret_enc: 1, totp_recovery_codes_hash: 1 } },
    );
    if (!u || u.totp_enabled !== true || !u.totp_secret_enc) {
      res.status(400).json({ message: "2fa_not_enabled" });
      return;
    }
    const secret = decryptTotpSecret(u.totp_secret_enc);
    if (!secret) {
      res.status(500).json({ message: "2fa_secret_unavailable" });
      return;
    }
    const code = String(parsed.data.code || "").trim();
    const rec = String(parsed.data.recovery_code || "").trim();
    let ok = false;
    let usedRecoveryHash = null;
    if (code) {
      ok = totpVerify(secret, code);
    } else if (rec) {
      const h = hashRecoveryCode(rec);
      const list = Array.isArray(u.totp_recovery_codes_hash) ? u.totp_recovery_codes_hash : [];
      if (list.includes(h)) {
        ok = true;
        usedRecoveryHash = h;
      }
    }
    if (!ok) {
      res.status(401).json({ message: "invalid_2fa_code" });
      return;
    }
    if (usedRecoveryHash) {
      await db.collection("users").updateOne(
        { id: u.id },
        { $pull: { totp_recovery_codes_hash: usedRecoveryHash }, $set: { updated_at: nowIso() } },
      );
    }
    await db.collection("auth_2fa_challenges_v1").deleteOne({ token_hash: tokenHash });
    const ttlMinutes = await getSessionTtlMinutes();
    const { token } = await createSession(db, u.id, { minutes: ttlMinutes });
    setSessionCookie(res, token);
    ensureCsrfCookie(req, res);
    await recordAudit(db, {
      userId: u.id,
      actorUserId: u.id,
      action: "auth.login_2fa",
      details: { email: u.email, used_recovery: Boolean(usedRecoveryHash) },
      ip: clientIp(req),
      ...auditCtx(req),
    });
    res.json({ ok: true });
  });

  app.post("/api/auth/2fa/setup", requireAuth, async (req, res) => {
    const issuer = String(process.env.ICER_TOTP_ISSUER || "ICER").trim() || "ICER";
    const secret = generateTotpSecret();
    const otpauth = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(req.user.email)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`;
    const qr = await qrcode.toDataURL(otpauth, { margin: 1, scale: 6 });
    const enc = encryptTotpSecret(secret);
    const now = nowIso();
    await db.collection("users").updateOne(
      { id: req.user.id },
      { $set: { totp_pending_secret_enc: enc, totp_pending_created_at: now, updated_at: now } },
    );
    res.setHeader("Cache-Control", "no-store");
    res.json({ ok: true, otpauth_url: otpauth, qr_data_url: qr, secret });
  });

  app.post("/api/auth/2fa/verify", requireAuth, async (req, res) => {
    const schema = z.object({ code: z.string().min(4).max(12) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "invalid_request" });
      return;
    }
    const row = await db.collection("users").findOne(
      { id: req.user.id },
      { projection: { _id: 0, totp_pending_secret_enc: 1 } },
    );
    const pending = String(row?.totp_pending_secret_enc || "").trim();
    if (!pending) {
      res.status(400).json({ message: "2fa_setup_not_started" });
      return;
    }
    const secret = decryptTotpSecret(pending);
    if (!secret) {
      res.status(500).json({ message: "2fa_secret_unavailable" });
      return;
    }
    const ok = totpVerify(secret, parsed.data.code);
    if (!ok) {
      res.status(401).json({ message: "invalid_2fa_code" });
      return;
    }
    const codes = generateRecoveryCodes(10);
    const hashes = codes.map(hashRecoveryCode);
    const now = nowIso();
    await db.collection("users").updateOne(
      { id: req.user.id },
      {
        $set: {
          totp_enabled: true,
          totp_secret_enc: pending,
          totp_verified_at: now,
          totp_recovery_codes_hash: hashes,
          updated_at: now,
        },
        $unset: { totp_pending_secret_enc: "", totp_pending_created_at: "" },
      },
    );
    await recordAudit(db, {
      userId: req.user.id,
      actorUserId: req.user.id,
      action: "auth.2fa_enabled",
      details: {},
      ip: clientIp(req),
      ...auditCtx(req),
    });
    res.json({ ok: true, recovery_codes: codes });
  });

  app.post("/api/auth/2fa/disable", requireAuth, async (req, res) => {
    const schema = z.object({
      code: z.string().min(4).max(12).optional(),
      recovery_code: z.string().min(6).max(64).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "invalid_request" });
      return;
    }
    const u = await db.collection("users").findOne(
      { id: req.user.id },
      { projection: { _id: 0, totp_enabled: 1, totp_secret_enc: 1, totp_recovery_codes_hash: 1 } },
    );
    if (!u?.totp_enabled || !u.totp_secret_enc) {
      res.status(400).json({ message: "2fa_not_enabled" });
      return;
    }
    const secret = decryptTotpSecret(u.totp_secret_enc);
    const code = String(parsed.data.code || "").trim();
    const rec = String(parsed.data.recovery_code || "").trim();
    let ok = false;
    if (code && secret) ok = totpVerify(secret, code);
    if (!ok && rec) {
      const h = hashRecoveryCode(rec);
      const list = Array.isArray(u.totp_recovery_codes_hash) ? u.totp_recovery_codes_hash : [];
      ok = list.includes(h);
    }
    if (!ok) {
      res.status(401).json({ message: "invalid_2fa_code" });
      return;
    }
    const now = nowIso();
    await db.collection("users").updateOne(
      { id: req.user.id },
      { $set: { totp_enabled: false, updated_at: now }, $unset: { totp_secret_enc: "", totp_verified_at: "", totp_recovery_codes_hash: "" } },
    );
    await recordAudit(db, {
      userId: req.user.id,
      actorUserId: req.user.id,
      action: "auth.2fa_disabled",
      details: {},
      ip: clientIp(req),
      ...auditCtx(req),
    });
    res.json({ ok: true });
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
    if (!req.user) {
      res.status(401).json({ message: "auth_required" });
      return;
    }
    res.json(req.user);
  });

  app.get("/api/auth/menu-effective", requireAuth, async (req, res) => {
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
      { projection: { _id: 0, id: 1, email: 1, full_name: 1, role: 1, funcao: 1, avatar_url: 1 } },
    );
    res.json(u);
  });

  app.get("/api/admin/users", requireAdmin, async (_req, res) => {
    const users = await db
      .collection("users")
      .find(
        {},
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
          },
        },
      )
      .sort({ role: -1, created_at: -1 })
      .toArray();
    res.json(users);
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

  app.get("/api/admin/backup/info", requireAuth, requireAdmin, async (_req, res) => {
    try {
      const info = await getBackupSummary(db, uploadDir, resolveUploadedDiskPath);
      res.setHeader("Cache-Control", "no-store");
      res.json(info);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[ICER] backup/info", e);
      res.status(500).json({ message: "backup_info_failed" });
    }
  });

  app.get("/api/admin/backup/export", requireAuth, requireAdmin, async (req, res) => {
    const stamp = new Date().toISOString().replaceAll(":", "-").replace(/\.\d{3}Z$/, "Z");
    const filename = `icer-site-backup-${stamp}.zip`;
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Cache-Control", "no-store");
    try {
      // Registra a intenção antes de começar o stream (evita async após fechar DB nos testes).
      await recordAudit(db, {
        userId: req.user.id,
        actorUserId: req.user.id,
        action: "admin.backup_export",
        details: { filename },
        ip: clientIp(req),
        ...auditCtx(req),
      });
      await pipeSiteBackupZip(res, db, uploadDir, resolveUploadedDiskPath);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[ICER] backup/export", e);
      if (!res.headersSent) {
        res.status(500).json({ message: "backup_export_failed" });
      }
    }
  });

  app.get("/api/admin/integrations/google", requireAuth, requireAdmin, async (_req, res) => {
    const data = await getGoogleIntegrationSafe(db);
    res.setHeader("Cache-Control", "no-store");
    res.json(data);
  });

  app.put("/api/admin/integrations/google", requireAuth, requireAdmin, async (req, res) => {
    const schema = z.object({
      enabled: z.boolean().optional(),
      client_id: z.string().max(2048).optional(),
      client_secret: z.string().max(8192).optional(),
      clear_client_secret: z.boolean().optional(),
      drive_export_folder_id: z.string().max(512).optional(),
      auto_upload_backups: z.boolean().optional(),
      notes: z.string().max(8000).optional(),
    });
    const parsed = schema.safeParse(req.body && typeof req.body === "object" ? req.body : {});
    if (!parsed.success) {
      res.status(400).json({ message: "invalid_request" });
      return;
    }
    const next = await mergeGoogleIntegration(db, parsed.data);
    await recordAudit(db, {
      userId: req.user.id,
      actorUserId: req.user.id,
      action: "admin.google_integration_update",
      details: {
        enabled: next.enabled,
        client_id_set: !!next.client_id,
        client_secret_set: next.client_secret_set,
        drive_export_folder_id_set: !!next.drive_export_folder_id,
      },
      ip: clientIp(req),
      ...auditCtx(req),
    });
    res.setHeader("Cache-Control", "no-store");
    res.json(next);
  });

  // OAuth: status / connect / disconnect
  app.get("/api/admin/integrations/google/status", requireAuth, requireAdmin, async (_req, res) => {
    const st = await getGoogleTokensSafe(db);
    res.setHeader("Cache-Control", "no-store");
    res.json(st);
  });

  app.post("/api/admin/integrations/google/disconnect", requireAuth, requireAdmin, async (req, res) => {
    await disconnectGoogle(db);
    await recordAudit(db, {
      userId: req.user.id,
      actorUserId: req.user.id,
      action: "admin.google_disconnect",
      details: {},
      ip: clientIp(req),
      ...auditCtx(req),
    });
    res.json({ ok: true });
  });

  app.get("/api/auth/google/start", requireAuth, requireAdmin, async (req, res) => {
    const cfg = await getGoogleIntegrationSafe(db);
    if (!cfg.enabled || !cfg.client_id || !cfg.client_secret_set) {
      res.status(400).json({ message: "google_not_configured" });
      return;
    }
    // lê secret real do KV (não expõe ao cliente)
    const row = await db.collection("app_kv").findOne({ key: "google_integration_v1" }, { projection: { _id: 0, value: 1 } });
    const real = row?.value && typeof row.value === "object" ? row.value : {};
    const client_secret = String(real.client_secret || "").trim();
    const client_id = String(real.client_id || "").trim();
    if (!client_id || !client_secret) {
      res.status(400).json({ message: "google_not_configured" });
      return;
    }
    const state = await createGoogleOauthState(db, req.user.id, { redirectTo: "/Dashboard?tab=google" });
    const { url } = buildGoogleAuthUrl(req, { client_id, client_secret }, state);
    res.setHeader("Cache-Control", "no-store");
    res.json({ ok: true, auth_url: url });
  });

  app.get("/api/auth/google/callback", async (req, res) => {
    const code = String(req.query.code || "").trim();
    const state = String(req.query.state || "").trim();
    if (!code || !state) {
      res.status(400).type("text/plain").send("OAuth callback inválido.");
      return;
    }
    const st = await consumeGoogleOauthState(db, state);
    if (!st) {
      res.status(400).type("text/plain").send("Estado OAuth expirado.");
      return;
    }
    const row = await db.collection("app_kv").findOne({ key: "google_integration_v1" }, { projection: { _id: 0, value: 1 } });
    const real = row?.value && typeof row.value === "object" ? row.value : {};
    const client_id = String(real.client_id || "").trim();
    const client_secret = String(real.client_secret || "").trim();
    if (!client_id || !client_secret) {
      res.status(400).type("text/plain").send("Google não configurado.");
      return;
    }
    const base = callbackRedirectBase(req);
    const redirectUri = `${base}/api/auth/google/callback`;
    const oauth2 = buildOAuthClient({ client_id, client_secret }, redirectUri);
    try {
      const { connected_email } = await exchangeCodeAndStoreTokens(db, oauth2, code);
      await recordAudit(db, {
        userId: st.user_id,
        actorUserId: st.user_id,
        action: "auth.google_connected",
        details: { connected_email },
        ip: clientIp(req),
        ...auditCtx(req),
      });
      res.redirect(`${base}${st.redirect_to || "/Dashboard?tab=google"}&connected=1`);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[ICER] google oauth callback", e);
      res.redirect(`${base}${st.redirect_to || "/Dashboard?tab=google"}&connected=0`);
    }
  });

  // Backup → Google Drive
  app.post("/api/admin/backup/upload-google", requireAuth, requireAdmin, async (req, res) => {
    const cfgSafe = await getGoogleIntegrationSafe(db);
    if (!cfgSafe.enabled) {
      res.status(400).json({ message: "google_integration_disabled" });
      return;
    }
    if (!cfgSafe.drive_export_folder_id) {
      res.status(400).json({ message: "google_drive_folder_required" });
      return;
    }
    const row = await db.collection("app_kv").findOne({ key: "google_integration_v1" }, { projection: { _id: 0, value: 1 } });
    const real = row?.value && typeof row.value === "object" ? row.value : {};
    const client_id = String(real.client_id || "").trim();
    const client_secret = String(real.client_secret || "").trim();
    const base = callbackRedirectBase(req);
    const redirectUri = `${base}/api/auth/google/callback`;
    const auth = await getAuthorizedDriveClient(db, { client_id, client_secret }, redirectUri);
    if (!auth.ok) {
      res.status(409).json({ message: "google_not_connected" });
      return;
    }
    const stamp = new Date().toISOString().replaceAll(":", "-").replace(/\.\d{3}Z$/, "Z");
    const filename = `icer-site-backup-${stamp}.zip`;
    const fsP = await import("node:fs/promises");
    const os = await import("node:os");
    const path = await import("node:path");
    const tmp = await fsP.mkdtemp(path.join(os.tmpdir(), "icer-"));
    const outPath = path.join(tmp, filename);
    try {
      await writeSiteBackupZipToFile(outPath, db, uploadDir, resolveUploadedDiskPath);
      const fsMod = await import("node:fs");
      const media = {
        mimeType: "application/zip",
        body: fsMod.createReadStream(outPath),
      };
      const meta = {
        name: filename,
        parents: [cfgSafe.drive_export_folder_id],
      };
      const up = await auth.drive.files.create({
        requestBody: meta,
        media,
        fields: "id,name,createdTime",
      });
      await recordAudit(db, {
        userId: req.user.id,
        actorUserId: req.user.id,
        action: "admin.backup_upload_google",
        details: { drive_file_id: up.data.id, name: up.data.name },
        ip: clientIp(req),
        ...auditCtx(req),
      });
      res.json({ ok: true, drive_file: up.data });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[ICER] backup/upload-google", e);
      res.status(500).json({ message: "google_upload_failed" });
    } finally {
      try {
        const fsP = await import("node:fs/promises");
        await fsP.rm(tmp, { recursive: true, force: true });
      } catch {
        /* ignore */
      }
    }
  });

  // ── Admin: Rotinas de agendamento em massa (Eventos) ─────────────────────
  const BULK_RUNS_COLLECTION = "event_bulk_runs_v1";

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
    res.setHeader("Cache-Control", "no-store");
    res.json({ items: rows });
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
      const del = await db.collection("eventos").deleteMany({ bulk_batch_id: batchId });
      const now = nowIso();
      await db.collection(BULK_RUNS_COLLECTION).updateOne(
        { id },
        {
          $set: {
            undone_at: now,
            undone_by_user_id: req.user.id,
            undone_deleted_count: del.deletedCount || 0,
            updated_at: now,
          },
        },
      );
      await recordAudit(db, {
        userId: req.user.id,
        actorUserId: req.user.id,
        action: "admin.eventos.bulk_run.undo",
        details: { bulk_run_id: id, deleted: del.deletedCount || 0 },
        ip: clientIp(req),
        ...auditCtx(req),
      });
      res.json({ ok: true, deleted: del.deletedCount || 0 });
    },
  );

  app.post("/api/admin/users", requireAdmin, async (req, res) => {
    const schema = z.object({
      email: z.string().email(),
      full_name: z.string().min(1),
      password: z.string().min(1),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "invalid_request" });
      return;
    }
    const pwPolicy = validateAccountPassword(parsed.data.password);
    if (respondIfPasswordPolicyFails(res, pwPolicy)) return;
    const email = parsed.data.email.toLowerCase().trim();
    const exists = await db.collection("users").findOne({ email }, { projection: { id: 1 } });
    if (exists) {
      res.status(409).json({ message: "email_already_exists" });
      return;
    }
    const password_hash = await hashPassword(parsed.data.password);
    const now = nowIso();
    const id = await nextSeq(db, "users");
    await db.collection("users").insertOne({
      id,
      email,
      full_name: parsed.data.full_name.trim(),
      role: "admin",
      funcao: "",
      password_hash,
      disabled: false,
      created_at: now,
      updated_at: now,
    });
    await recordAudit(db, {
      userId: id,
      actorUserId: req.user.id,
      action: "admin.user.create",
      details: { email, role: "admin" },
      ip: clientIp(req),
    });
    res.status(201).json({ id });
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
    await db.collection("users").updateOne({ id }, { $set });
    const fields = [];
    if (nextEmail != null) fields.push("email");
    if (parsed.data.full_name != null) fields.push("full_name");
    if (parsed.data.funcao != null) fields.push("funcao");
    if (password_hash) fields.push("password");
    if (parsed.data.disabled != null) fields.push("disabled");
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
      db.collection("user_invites").deleteMany({ user_id: id }),
      db.collection("users").deleteOne({ id }),
    ]);

    await recordAudit(db, {
      userId: id,
      actorUserId: req.user.id,
      action: "admin.user.delete",
      details: { email: row.email, role: row.role },
      ip: clientIp(req),
      ...auditCtx(req),
    });

    res.json({ ok: true });
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
    const now = nowIso();
    const fid = await nextSeq(db, "files");
    /** Ficheiros do site: leitura pública (imagens em posts, PDFs em materiais, etc.). */
    const publicRead =
      String(process.env.ICER_FILE_PUBLIC_READ || "true").toLowerCase() !== "false";
    await db.collection("files").insertOne({
      id: fid,
      owner_user_id: req.user.id,
      original_name: f.originalname,
      mime: f.mimetype || "application/octet-stream",
      size: f.size,
      storage_path: f.path,
      created_at: now,
      public: publicRead,
    });
    await recordAudit(db, {
      userId: req.user.id,
      actorUserId: req.user.id,
      action: "file.upload",
      details: {
        file_id: fid,
        name: f.originalname,
        mime: f.mimetype || "",
        size: f.size,
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
    if (!row) {
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
  if (fs.existsSync(path.join(distPath, "index.html"))) {
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
  }

  return app;
}
