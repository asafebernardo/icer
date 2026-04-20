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
import { nowIso } from "./security.js";
import { effectiveMenuPermissions } from "./menuPermissions.js";
import { createDataRouter } from "./dataRoutes.js";

/**
 * @param {import("better-sqlite3").Database} db
 * @param {{
 *   uploadDir?: string;
 *   enableUpstreamProxy?: boolean;
 *   loginRateLimit?: boolean;
 * }} [options]
 */
export function createApplication(db, options = {}) {
  const uploadDir =
    options.uploadDir ?? path.resolve("server", "private_uploads");
  const enableUpstreamProxy = options.enableUpstreamProxy === true;
  const loginRateLimit = options.loginRateLimit !== false;

  fs.mkdirSync(uploadDir, { recursive: true });

  const loginRateState = new Map();
  const LOGIN_WINDOW_MS = 15 * 60 * 1000;
  const LOGIN_MAX = 40;

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

  app.use((req, _res, next) => {
    const token = req.cookies?.[getCookieName()];
    req.user = getSessionUser(db, token);
    req.sessionToken = token || null;
    next();
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
    const row = db
      .prepare(
        `SELECT id, email, full_name, role, password_hash FROM users WHERE email = ?`,
      )
      .get(email);
    if (!row) {
      res.status(401).json({ message: "invalid_credentials" });
      return;
    }
    const ok = await verifyPassword(row.password_hash, parsed.data.password);
    if (!ok) {
      res.status(401).json({ message: "invalid_credentials" });
      return;
    }
    const { token } = createSession(db, row.id);
    setSessionCookie(res, token);
    res.json({ ok: true });
  });

  app.post("/api/auth/logout", (req, res) => {
    if (req.sessionToken) {
      deleteSessionByToken(db, req.sessionToken);
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

  app.get("/api/auth/menu-effective", requireAuth, (req, res) => {
    res.json(effectiveMenuPermissions(db, req.user));
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
    const row = db
      .prepare(`SELECT id, email, full_name, password_hash FROM users WHERE id = ?`)
      .get(req.user.id);
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
      const clash = db.prepare(`SELECT id FROM users WHERE email = ?`).get(nextEmail);
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
    db.prepare(
      `UPDATE users SET
        email = COALESCE(?, email),
        full_name = COALESCE(?, full_name),
        password_hash = COALESCE(?, password_hash),
        updated_at = ?
       WHERE id = ?`,
    ).run(
      nextEmail ?? null,
      parsed.data.full_name?.trim() ?? null,
      password_hash ?? null,
      now,
      row.id,
    );
    const u = db
      .prepare(`SELECT id, email, full_name, role, funcao FROM users WHERE id = ?`)
      .get(row.id);
    res.json(u);
  });

  app.get("/api/admin/users", requireAdmin, (_req, res) => {
    const users = db
      .prepare(
        `SELECT id, email, full_name, role, funcao, created_at, updated_at
         FROM users
         ORDER BY role DESC, created_at DESC`,
      )
      .all();
    res.json(users);
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
    const exists = db.prepare(`SELECT id FROM users WHERE email = ?`).get(email);
    if (exists) {
      res.status(409).json({ message: "email_already_exists" });
      return;
    }
    const password_hash = await hashPassword(parsed.data.password);
    const now = nowIso();
    const info = db
      .prepare(
        `INSERT INTO users (email, full_name, role, password_hash, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(email, parsed.data.full_name.trim(), parsed.data.role, password_hash, now, now);
    res.status(201).json({ id: info.lastInsertRowid });
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
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "invalid_request" });
      return;
    }
    const cur = db.prepare(`SELECT id, email FROM users WHERE id = ?`).get(id);
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
      const clash = db.prepare(`SELECT id FROM users WHERE email = ?`).get(nextEmail);
      if (clash) {
        res.status(409).json({ message: "email_already_exists" });
        return;
      }
    }
    const now = nowIso();
    db.prepare(
      `UPDATE users SET
        email = COALESCE(?, email),
        full_name = COALESCE(?, full_name),
        role = COALESCE(?, role),
        funcao = COALESCE(?, funcao),
        password_hash = COALESCE(?, password_hash),
        updated_at = ?
       WHERE id = ?`,
    ).run(
      nextEmail ?? null,
      parsed.data.full_name?.trim() ?? null,
      parsed.data.role ?? null,
      parsed.data.funcao != null ? String(parsed.data.funcao) : null,
      password_hash ?? null,
      now,
      id,
    );
    res.json({ ok: true });
  });

  const upload = multer({
    dest: uploadDir,
    limits: { fileSize: 15 * 1024 * 1024 },
  });

  app.post("/api/files", requireAuth, upload.single("file"), (req, res) => {
    const f = req.file;
    if (!f) {
      res.status(400).json({ message: "file_required" });
      return;
    }
    const now = nowIso();
    const info = db
      .prepare(
        `INSERT INTO files (owner_user_id, original_name, mime, size, storage_path, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(
        req.user.id,
        f.originalname,
        f.mimetype || "application/octet-stream",
        f.size,
        f.path,
        now,
      );
    const fid = info.lastInsertRowid;
    res.status(201).json({ id: fid, url: `/api/files/${fid}` });
  });

  app.get("/api/files/:id", requireAuth, (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      res.status(400).json({ message: "invalid_id" });
      return;
    }
    const row = db
      .prepare(
        `SELECT id, owner_user_id, original_name, mime, size, storage_path
         FROM files
         WHERE id = ?`,
      )
      .get(id);
    if (!row) {
      res.status(404).json({ message: "not_found" });
      return;
    }
    const canRead = req.user.role === "admin" || req.user.id === row.owner_user_id;
    if (!canRead) {
      res.status(403).json({ message: "forbidden" });
      return;
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
    fs.createReadStream(row.storage_path).pipe(res);
  });

  const proxyTarget = enableUpstreamProxy
    ? process.env.ICER_UPSTREAM_API ||
      process.env.VITE_APP_BASE_URL ||
      process.env.VITE_BASE44_APP_BASE_URL ||
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
