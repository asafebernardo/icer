import express from "express";
import { z } from "zod";
import { requireAuth, requireAdmin } from "./auth.js";
import { nowIso } from "./security.js";
import { menuActionAllowed, getMenuPermissionsBlob, setMenuPermissionsBlob } from "./menuPermissions.js";

const CONTATO_WINDOW_MS = 15 * 60 * 1000;
const CONTATO_MAX = 30;
const contatoRate = new Map();

function rateLimitContato(req, res, next) {
  const ip = String(req.ip || req.socket?.remoteAddress || "unknown");
  const now = Date.now();
  let e = contatoRate.get(ip);
  if (!e || now > e.resetAt) {
    e = { count: 0, resetAt: now + CONTATO_WINDOW_MS };
    contatoRate.set(ip, e);
  }
  e.count += 1;
  if (e.count > CONTATO_MAX) {
    res.status(429).json({ message: "too_many_requests" });
    return;
  }
  next();
}

function parseLimit(raw, def, max) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return def;
  return Math.min(Math.floor(n), max);
}

function listOrderClause(table, sort) {
  const s = String(sort || "").trim();
  if (!/^[-\w]+$/.test(s)) return "ORDER BY created_at DESC";
  if (table === "eventos") {
    if (s === "data" || s === "event_date") return "ORDER BY event_date ASC, created_at ASC";
    if (s === "-data") return "ORDER BY event_date DESC, created_at DESC";
  }
  if (s === "created_date" || s === "data") return "ORDER BY created_at ASC";
  if (s === "-created_date" || s === "-data") return "ORDER BY created_at DESC";
  return "ORDER BY created_at DESC";
}

function rowToRecord(row) {
  if (!row) return null;
  let extra = {};
  try {
    extra = JSON.parse(row.body_json || "{}");
    if (!extra || typeof extra !== "object") extra = {};
  } catch {
    extra = {};
  }
  return {
    ...extra,
    id: row.id,
    created_date: row.created_at,
    updated_date: row.updated_at,
  };
}

function eventDateFromBody(body) {
  const d = body?.data;
  if (d == null) return "";
  const s = String(d).trim().match(/^(\d{4}-\d{2}-\d{2})/);
  return s ? s[1] : String(d).slice(0, 10);
}

function requireMenu(db, menuKey, action) {
  return (req, res, next) => {
    if (!req.user) {
      res.status(401).json({ message: "auth_required" });
      return;
    }
    if (!menuActionAllowed(db, req.user, menuKey, action)) {
      res.status(403).json({ message: "forbidden" });
      return;
    }
    next();
  };
}

function assertOwnerOrAdmin(req, res, row) {
  if (!row) {
    res.status(404).json({ message: "not_found" });
    return false;
  }
  if (req.user.role === "admin") return true;
  if (row.owner_user_id == null || row.owner_user_id !== req.user.id) {
    res.status(403).json({ message: "forbidden" });
    return false;
  }
  return true;
}

/**
 * @param {import("better-sqlite3").Database} db
 */
export function createDataRouter(db) {
  const r = express.Router();

  r.get("/menu-permissions", requireAuth, requireAdmin, (_req, res) => {
    res.json(getMenuPermissionsBlob(db));
  });

  r.put("/menu-permissions", requireAuth, requireAdmin, (req, res) => {
    if (!req.body || typeof req.body !== "object") {
      res.status(400).json({ message: "invalid_request" });
      return;
    }
    setMenuPermissionsBlob(db, req.body);
    res.json({ ok: true });
  });

  // --- Contato (público: criar) ---
  const contatoSchema = z.object({
    nome: z.string().min(1),
    email: z.string().email(),
    telefone: z.string().optional(),
    assunto: z.string().min(1),
    mensagem: z.string().min(1),
  });

  r.post("/contatos", rateLimitContato, (req, res) => {
    const parsed = contatoSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "invalid_request" });
      return;
    }
    const now = nowIso();
    const body_json = JSON.stringify(parsed.data);
    const info = db
      .prepare(
        `INSERT INTO contatos (body_json, created_at) VALUES (?, ?)`,
      )
      .run(body_json, now);
    res.status(201).json({ id: info.lastInsertRowid });
  });

  // --- Posts ---
  r.get("/posts", (req, res) => {
    const limit = parseLimit(req.query.limit, 100, 500);
    const skip = parseLimit(req.query.skip, 0, 10000);
    const order = listOrderClause("posts", req.query.sort);
    const rows = db
      .prepare(
        `SELECT id, owner_user_id, body_json, created_at AS created_at, updated_at AS updated_at
         FROM posts ${order} LIMIT ? OFFSET ?`,
      )
      .all(limit, skip);
    res.json(rows.map(rowToRecord));
  });

  r.post("/posts", requireAuth, requireMenu(db, "postagens", "create"), (req, res) => {
    const now = nowIso();
    const body = req.body && typeof req.body === "object" ? { ...req.body } : {};
    delete body.id;
    const body_json = JSON.stringify(body);
    const info = db
      .prepare(
        `INSERT INTO posts (owner_user_id, body_json, created_at, updated_at)
         VALUES (?, ?, ?, ?)`,
      )
      .run(req.user.id, body_json, now, now);
    const row = db
      .prepare(
        `SELECT id, owner_user_id, body_json, created_at AS created_at, updated_at AS updated_at FROM posts WHERE id = ?`,
      )
      .get(info.lastInsertRowid);
    res.status(201).json(rowToRecord(row));
  });

  r.put("/posts/:id", requireAuth, requireMenu(db, "postagens", "edit"), (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      res.status(400).json({ message: "invalid_id" });
      return;
    }
    const row = db.prepare(`SELECT * FROM posts WHERE id = ?`).get(id);
    if (!assertOwnerOrAdmin(req, res, row)) return;
    const now = nowIso();
    const body = req.body && typeof req.body === "object" ? { ...req.body } : {};
    delete body.id;
    const body_json = JSON.stringify(body);
    db.prepare(`UPDATE posts SET body_json = ?, updated_at = ? WHERE id = ?`).run(
      body_json,
      now,
      id,
    );
    const next = db
      .prepare(
        `SELECT id, owner_user_id, body_json, created_at AS created_at, updated_at AS updated_at FROM posts WHERE id = ?`,
      )
      .get(id);
    res.json(rowToRecord(next));
  });

  r.delete("/posts/:id", requireAuth, requireMenu(db, "postagens", "delete"), (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      res.status(400).json({ message: "invalid_id" });
      return;
    }
    const row = db.prepare(`SELECT * FROM posts WHERE id = ?`).get(id);
    if (!assertOwnerOrAdmin(req, res, row)) return;
    db.prepare(`DELETE FROM posts WHERE id = ?`).run(id);
    res.status(204).end();
  });

  // --- Eventos ---
  r.get("/eventos", (req, res) => {
    const limit = parseLimit(req.query.limit, 500, 2000);
    const skip = parseLimit(req.query.skip, 0, 10000);
    const order = listOrderClause("eventos", req.query.sort);
    const rows = db
      .prepare(
        `SELECT id, owner_user_id, event_date, body_json, created_at AS created_at, updated_at AS updated_at
         FROM eventos ${order} LIMIT ? OFFSET ?`,
      )
      .all(limit, skip);
    res.json(rows.map(rowToRecord));
  });

  r.post("/eventos", requireAuth, requireMenu(db, "eventos", "create"), (req, res) => {
    const now = nowIso();
    const body = req.body && typeof req.body === "object" ? { ...req.body } : {};
    delete body.id;
    const event_date = eventDateFromBody(body);
    const body_json = JSON.stringify(body);
    const info = db
      .prepare(
        `INSERT INTO eventos (owner_user_id, event_date, body_json, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(req.user.id, event_date, body_json, now, now);
    const row = db
      .prepare(
        `SELECT id, owner_user_id, event_date, body_json, created_at AS created_at, updated_at AS updated_at FROM eventos WHERE id = ?`,
      )
      .get(info.lastInsertRowid);
    res.status(201).json(rowToRecord(row));
  });

  r.put("/eventos/:id", requireAuth, requireMenu(db, "eventos", "edit"), (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      res.status(400).json({ message: "invalid_id" });
      return;
    }
    const row = db.prepare(`SELECT * FROM eventos WHERE id = ?`).get(id);
    if (!assertOwnerOrAdmin(req, res, row)) return;
    const now = nowIso();
    const body = req.body && typeof req.body === "object" ? { ...req.body } : {};
    delete body.id;
    const event_date = eventDateFromBody(body);
    const body_json = JSON.stringify(body);
    db.prepare(
      `UPDATE eventos SET event_date = ?, body_json = ?, updated_at = ? WHERE id = ?`,
    ).run(event_date, body_json, now, id);
    const next = db
      .prepare(
        `SELECT id, owner_user_id, event_date, body_json, created_at AS created_at, updated_at AS updated_at FROM eventos WHERE id = ?`,
      )
      .get(id);
    res.json(rowToRecord(next));
  });

  r.delete("/eventos/:id", requireAuth, requireMenu(db, "eventos", "delete"), (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      res.status(400).json({ message: "invalid_id" });
      return;
    }
    const row = db.prepare(`SELECT * FROM eventos WHERE id = ?`).get(id);
    if (!assertOwnerOrAdmin(req, res, row)) return;
    db.prepare(`DELETE FROM eventos WHERE id = ?`).run(id);
    res.status(204).end();
  });

  // --- Materiais ---
  r.get("/materiais", (req, res) => {
    const limit = parseLimit(req.query.limit, 50, 500);
    const skip = parseLimit(req.query.skip, 0, 10000);
    const order = listOrderClause("materiais", req.query.sort);
    const rows = db
      .prepare(
        `SELECT id, owner_user_id, body_json, created_at AS created_at, updated_at AS updated_at
         FROM materiais ${order} LIMIT ? OFFSET ?`,
      )
      .all(limit, skip);
    res.json(rows.map(rowToRecord));
  });

  r.post("/materiais", requireAuth, requireMenu(db, "materiais_tab", "create"), (req, res) => {
    const now = nowIso();
    const body = req.body && typeof req.body === "object" ? { ...req.body } : {};
    delete body.id;
    const body_json = JSON.stringify(body);
    const info = db
      .prepare(
        `INSERT INTO materiais (owner_user_id, body_json, created_at, updated_at)
         VALUES (?, ?, ?, ?)`,
      )
      .run(req.user.id, body_json, now, now);
    const row = db
      .prepare(
        `SELECT id, owner_user_id, body_json, created_at AS created_at, updated_at AS updated_at FROM materiais WHERE id = ?`,
      )
      .get(info.lastInsertRowid);
    res.status(201).json(rowToRecord(row));
  });

  r.put("/materiais/:id", requireAuth, requireMenu(db, "materiais_tab", "edit"), (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      res.status(400).json({ message: "invalid_id" });
      return;
    }
    const row = db.prepare(`SELECT * FROM materiais WHERE id = ?`).get(id);
    if (!assertOwnerOrAdmin(req, res, row)) return;
    const now = nowIso();
    const body = req.body && typeof req.body === "object" ? { ...req.body } : {};
    delete body.id;
    const body_json = JSON.stringify(body);
    db.prepare(`UPDATE materiais SET body_json = ?, updated_at = ? WHERE id = ?`).run(
      body_json,
      now,
      id,
    );
    const next = db
      .prepare(
        `SELECT id, owner_user_id, body_json, created_at AS created_at, updated_at AS updated_at FROM materiais WHERE id = ?`,
      )
      .get(id);
    res.json(rowToRecord(next));
  });

  r.delete("/materiais/:id", requireAuth, requireMenu(db, "materiais_tab", "delete"), (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      res.status(400).json({ message: "invalid_id" });
      return;
    }
    const row = db.prepare(`SELECT * FROM materiais WHERE id = ?`).get(id);
    if (!assertOwnerOrAdmin(req, res, row)) return;
    db.prepare(`DELETE FROM materiais WHERE id = ?`).run(id);
    res.status(204).end();
  });

  // --- Galeria ---
  r.get("/fotos-galeria", (req, res) => {
    const limit = parseLimit(req.query.limit, 100, 500);
    const skip = parseLimit(req.query.skip, 0, 10000);
    const order = listOrderClause("fotos_galeria", req.query.sort);
    const rows = db
      .prepare(
        `SELECT id, owner_user_id, body_json, created_at AS created_at, updated_at AS updated_at
         FROM fotos_galeria ${order} LIMIT ? OFFSET ?`,
      )
      .all(limit, skip);
    res.json(rows.map(rowToRecord));
  });

  r.post("/fotos-galeria", requireAuth, requireMenu(db, "galeria", "create"), (req, res) => {
    const now = nowIso();
    const body = req.body && typeof req.body === "object" ? { ...req.body } : {};
    delete body.id;
    const body_json = JSON.stringify(body);
    const info = db
      .prepare(
        `INSERT INTO fotos_galeria (owner_user_id, body_json, created_at, updated_at)
         VALUES (?, ?, ?, ?)`,
      )
      .run(req.user.id, body_json, now, now);
    const row = db
      .prepare(
        `SELECT id, owner_user_id, body_json, created_at AS created_at, updated_at AS updated_at FROM fotos_galeria WHERE id = ?`,
      )
      .get(info.lastInsertRowid);
    res.status(201).json(rowToRecord(row));
  });

  r.put("/fotos-galeria/:id", requireAuth, requireMenu(db, "galeria", "edit"), (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      res.status(400).json({ message: "invalid_id" });
      return;
    }
    const row = db.prepare(`SELECT * FROM fotos_galeria WHERE id = ?`).get(id);
    if (!assertOwnerOrAdmin(req, res, row)) return;
    const now = nowIso();
    const body = req.body && typeof req.body === "object" ? { ...req.body } : {};
    delete body.id;
    const body_json = JSON.stringify(body);
    db.prepare(`UPDATE fotos_galeria SET body_json = ?, updated_at = ? WHERE id = ?`).run(
      body_json,
      now,
      id,
    );
    const next = db
      .prepare(
        `SELECT id, owner_user_id, body_json, created_at AS created_at, updated_at AS updated_at FROM fotos_galeria WHERE id = ?`,
      )
      .get(id);
    res.json(rowToRecord(next));
  });

  r.delete("/fotos-galeria/:id", requireAuth, requireMenu(db, "galeria", "delete"), (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      res.status(400).json({ message: "invalid_id" });
      return;
    }
    const row = db.prepare(`SELECT * FROM fotos_galeria WHERE id = ?`).get(id);
    if (!assertOwnerOrAdmin(req, res, row)) return;
    db.prepare(`DELETE FROM fotos_galeria WHERE id = ?`).run(id);
    res.status(204).end();
  });

  return r;
}
