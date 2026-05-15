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
      res.status(409).json({ message: "password_not_set" });
      return;
    }
    if (row.disabled === true) {
      res.status(403).json({ message: "account_disabled" });
      return;
    }
    // Sessão única: bloqueia novo login se já existir sessão ativa.
    // (Só libera quando expirar ou o utilizador fizer logout.)
    if (enforceSingleSession) {
      const now = nowIso();
      const active = await db.collection("sessions").findOne({
        user_id: row.id,
        expires_at: { $gt: now },
      });
      if (active) {
        res.status(409).json({ message: "session_already_active" });
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
      await bumpLoginFailure([ipKey, userKey]);
      await sleep(350);
      res.status(401).json({ message: "invalid_credentials" });
      return;
    }
    await clearLoginFailures([ipKey, userKey]);
    const loginStamp = nowIso();
    await db.collection("users").updateOne(
      { id: row.id },
      { $set: { last_login_at: loginStamp } },
    );
    const ttlMinutes = await getSessionTtlMinutes();
    const { token } = await createSession(db, row.id, { minutes: ttlMinutes });
    setSessionCookie(res, token);
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
    const schema = z.object({
      full_name: z.string().min(1).optional(),
      email: z.string().email().optional(),
      current_password: z.string().min(1).optional(),
      new_password: z.string().min(10).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "invalid_request" });
      return;
    }
    const row = await db.collection("users").findOne(
      { id: req.user.id },
      { projection: { _id: 0, id: 1, email: 1, full_name: 1, password_hash: 1 } },
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

    const wantsPasswordChange = !!parsed.data.new_password;
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

    let password_hash;
    if (parsed.data.new_password) {
      password_hash = await hashPassword(parsed.data.new_password);
    }
    const now = nowIso();
    const $set = { updated_at: now };
    if (nextEmail != null) $set.email = nextEmail;
    if (parsed.data.full_name != null) $set.full_name = parsed.data.full_name.trim();
    if (password_hash) $set.password_hash = password_hash;
    await db.collection("users").updateOne({ id: row.id }, { $set });
    const fields = [];
    if (nextEmail != null) fields.push("email");
    if (parsed.data.full_name != null) fields.push("full_name");
    if (password_hash) fields.push("password");
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
      { projection: { _id: 0, id: 1, email: 1, full_name: 1, role: 1, funcao: 1 } },
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

  app.post("/api/admin/users", requireAdmin, async (req, res) => {
    const schema = z.object({
      email: z.string().email(),
      full_name: z.string().min(1),
      role: z.enum(["admin", "user"]).default("user"),
      password: z.string().min(10),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "invalid_request" });
      return;
    }
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
      role: parsed.data.role,
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
      details: { email, role: parsed.data.role },
      ip: clientIp(req),
    });
    res.status(201).json({ id });
  });

  app.post("/api/admin/users/invite", requireAdmin, async (req, res) => {
    const schema = z.object({
      email: z.string().email(),
      role: z.enum(["admin", "user"]).default("user"),
      expires_days: z.number().int().min(1).max(30).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "invalid_request" });
      return;
    }
    const email = parsed.data.email.toLowerCase().trim();
    const role = parsed.data.role;

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
      password: z.string().min(10),
      full_name: z.string().min(1).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "invalid_request" });
      return;
    }
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
      role: z.enum(["admin", "user"]).optional(),
      password: z.string().min(10).optional(),
      funcao: z.string().optional(),
      disabled: z.boolean().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "invalid_request" });
      return;
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
    if (parsed.data.role != null) $set.role = parsed.data.role;
    if (parsed.data.funcao != null) $set.funcao = String(parsed.data.funcao);
    if (password_hash) $set.password_hash = password_hash;
    if (parsed.data.disabled != null) $set.disabled = parsed.data.disabled;
    await db.collection("users").updateOne({ id }, { $set });
    const fields = [];
    if (nextEmail != null) fields.push("email");
    if (parsed.data.full_name != null) fields.push("full_name");
    if (parsed.data.role != null) fields.push("role");
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
