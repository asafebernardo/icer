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
import { effectiveMenuPermissions } from "./menuPermissions.js";
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

  fs.mkdirSync(uploadDir, { recursive: true });

  const loginRateState = new Map();
  const LOGIN_WINDOW_MS = 15 * 60 * 1000;
  const LOGIN_MAX = 40;

  const SESSION_TTL_KEY = "session_ttl_minutes";
  const SESSION_TTL_ALLOWED = new Set([10, 30, 60, 120, 300]);
  const SESSION_TTL_DEFAULT = 120;

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

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, time: nowIso() });
  });

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
    const now = nowIso();
    const active = await db.collection("sessions").findOne({
      user_id: row.id,
      expires_at: { $gt: now },
    });
    if (active) {
      res.status(409).json({ message: "session_already_active" });
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
      res.status(401).json({ message: "invalid_credentials" });
      return;
    }
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
      current_password: z.string().min(1),
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
    const pwOk = await verifyPassword(row.password_hash, parsed.data.current_password);
    if (!pwOk) {
      res.status(401).json({ message: "invalid_credentials" });
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
          },
        },
      )
      .sort({ role: -1, created_at: -1 })
      .toArray();
    res.json(users);
  });

  app.get("/api/admin/session-ttl", requireAdmin, async (_req, res) => {
    const ttl_minutes = await getSessionTtlMinutes();
    res.json({ ttl_minutes });
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
    if (!fs.existsSync(row.storage_path)) {
      res.status(404).json({ message: "file_missing" });
      return;
    }
    res.setHeader("Content-Type", row.mime || "application/octet-stream");
    res.setHeader(
      "Content-Disposition",
      `inline; filename=\"${String(row.original_name || "file").replaceAll('"', "")}\"`,
    );
    res.setHeader("Cache-Control", "public, max-age=86400");
    fs.createReadStream(row.storage_path).pipe(res);
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

  return app;
}
