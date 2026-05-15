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
import { nextSeq } from "./sequences.js";

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
      { projection: { _id: 0, id: 1, email: 1, full_name: 1, role: 1, password_hash: 1 } },
    );
    if (!row) {
      res.status(401).json({ message: "invalid_credentials" });
      return;
    }
    const ok = await verifyPassword(row.password_hash, parsed.data.password);
    if (!ok) {
      res.status(401).json({ message: "invalid_credentials" });
      return;
    }
    const { token } = await createSession(db, row.id);
    setSessionCookie(res, token);
    res.json({ ok: true });
  });

  app.post("/api/auth/logout", async (req, res) => {
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
            created_at: 1,
            updated_at: 1,
          },
        },
      )
      .sort({ role: -1, created_at: -1 })
      .toArray();
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
      created_at: now,
      updated_at: now,
    });
    res.status(201).json({ id });
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
    const cur = await db.collection("users").findOne({ id }, { projection: { _id: 0, id: 1, email: 1 } });
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
    await db.collection("users").updateOne({ id }, { $set });
    res.json({ ok: true });
  });

  const upload = multer({
    dest: uploadDir,
    limits: { fileSize: 15 * 1024 * 1024 },
  });

  app.post("/api/files", requireAuth, upload.single("file"), async (req, res) => {
    const f = req.file;
    if (!f) {
      res.status(400).json({ message: "file_required" });
      return;
    }
    const now = nowIso();
    const fid = await nextSeq(db, "files");
    await db.collection("files").insertOne({
      id: fid,
      owner_user_id: req.user.id,
      original_name: f.originalname,
      mime: f.mimetype || "application/octet-stream",
      size: f.size,
      storage_path: f.path,
      created_at: now,
    });
    res.status(201).json({ id: fid, url: `/api/files/${fid}` });
  });

  app.get("/api/files/:id", requireAuth, async (req, res) => {
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
