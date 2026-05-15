import express from "express";
import { z } from "zod";
import { requireAuth, requireAdmin } from "./auth.js";
import { nowIso } from "./security.js";
import {
  menuActionAllowed,
  getMenuPermissionsBlob,
  setMenuPermissionsBlob,
} from "./menuPermissions.js";
import { nextSeq } from "./sequences.js";
import { clientIp, recordAudit } from "./auditLog.js";

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

/** @param {"posts"|"eventos"|"materiais"|"fotos_galeria"} table */
function mongoSort(table, sort) {
  const s = String(sort || "").trim();
  if (!/^[-\w]+$/.test(s)) {
    return { created_at: -1 };
  }
  if (table === "eventos") {
    if (s === "data" || s === "event_date") return { event_date: 1, created_at: 1 };
    if (s === "-data") return { event_date: -1, created_at: -1 };
  }
  if (s === "created_date" || s === "data") return { created_at: 1 };
  if (s === "-created_date" || s === "-data") return { created_at: -1 };
  return { created_at: -1 };
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

/**
 * @param {import("mongodb").Db} db
 */
function requireMenu(db, menuKey, action) {
  return async (req, res, next) => {
    if (!req.user) {
      res.status(401).json({ message: "auth_required" });
      return;
    }
    if (!(await menuActionAllowed(db, req.user, menuKey, action))) {
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
 * @param {import("mongodb").Db} db
 */
export function createDataRouter(db) {
  const r = express.Router();

  r.get("/menu-permissions", requireAuth, requireAdmin, async (_req, res) => {
    res.json(await getMenuPermissionsBlob(db));
  });

  r.put("/menu-permissions", requireAuth, requireAdmin, async (req, res) => {
    if (!req.body || typeof req.body !== "object") {
      res.status(400).json({ message: "invalid_request" });
      return;
    }
    await setMenuPermissionsBlob(db, req.body);
    await recordAudit(db, {
      userId: req.user.id,
      actorUserId: req.user.id,
      action: "data.menu_permissions.update",
      details: {},
      ip: clientIp(req),
    });
    res.json({ ok: true });
  });

  const contatoSchema = z.object({
    nome: z.string().min(1),
    email: z.string().email(),
    telefone: z.string().optional(),
    assunto: z.string().min(1),
    mensagem: z.string().min(1),
  });

  r.post("/contatos", rateLimitContato, async (req, res) => {
    const parsed = contatoSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "invalid_request" });
      return;
    }
    const now = nowIso();
    const body_json = JSON.stringify(parsed.data);
    const id = await nextSeq(db, "contatos");
    await db.collection("contatos").insertOne({
      id,
      body_json,
      created_at: now,
    });
    res.status(201).json({ id });
  });

  r.get("/posts", async (req, res) => {
    const limit = parseLimit(req.query.limit, 100, 500);
    const skip = parseLimit(req.query.skip, 0, 10000);
    const sort = mongoSort("posts", req.query.sort);
    const rows = await db
      .collection("posts")
      .find({}, { projection: { _id: 0 } })
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .toArray();
    res.json(rows.map(rowToRecord));
  });

  r.post(
    "/posts",
    requireAuth,
    requireMenu(db, "postagens", "create"),
    async (req, res) => {
      const now = nowIso();
      const body = req.body && typeof req.body === "object" ? { ...req.body } : {};
      delete body.id;
      const body_json = JSON.stringify(body);
      const id = await nextSeq(db, "posts");
      await db.collection("posts").insertOne({
        id,
        owner_user_id: req.user.id,
        body_json,
        created_at: now,
        updated_at: now,
      });
      const row = await db.collection("posts").findOne({ id }, { projection: { _id: 0 } });
      await recordAudit(db, {
        userId: req.user.id,
        actorUserId: req.user.id,
        action: "data.posts.create",
        details: { resource_id: id },
        ip: clientIp(req),
      });
      res.status(201).json(rowToRecord(row));
    },
  );

  r.put(
    "/posts/:id",
    requireAuth,
    requireMenu(db, "postagens", "edit"),
    async (req, res) => {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) {
        res.status(400).json({ message: "invalid_id" });
        return;
      }
      const row = await db.collection("posts").findOne({ id }, { projection: { _id: 0 } });
      if (!assertOwnerOrAdmin(req, res, row)) return;
      const now = nowIso();
      const body = req.body && typeof req.body === "object" ? { ...req.body } : {};
      delete body.id;
      const body_json = JSON.stringify(body);
      await db.collection("posts").updateOne(
        { id },
        { $set: { body_json, updated_at: now } },
      );
      const next = await db.collection("posts").findOne({ id }, { projection: { _id: 0 } });
      await recordAudit(db, {
        userId: row.owner_user_id ?? req.user.id,
        actorUserId: req.user.id,
        action: "data.posts.update",
        details: { resource_id: id },
        ip: clientIp(req),
      });
      res.json(rowToRecord(next));
    },
  );

  r.delete(
    "/posts/:id",
    requireAuth,
    requireMenu(db, "postagens", "delete"),
    async (req, res) => {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) {
        res.status(400).json({ message: "invalid_id" });
        return;
      }
      const row = await db.collection("posts").findOne({ id }, { projection: { _id: 0 } });
      if (!assertOwnerOrAdmin(req, res, row)) return;
      await recordAudit(db, {
        userId: row.owner_user_id ?? req.user.id,
        actorUserId: req.user.id,
        action: "data.posts.delete",
        details: { resource_id: id },
        ip: clientIp(req),
      });
      await db.collection("posts").deleteOne({ id });
      res.status(204).end();
    },
  );

  r.get("/eventos", async (req, res) => {
    const limit = parseLimit(req.query.limit, 500, 2000);
    const skip = parseLimit(req.query.skip, 0, 10000);
    const sort = mongoSort("eventos", req.query.sort);
    const rows = await db
      .collection("eventos")
      .find({}, { projection: { _id: 0 } })
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .toArray();
    res.json(rows.map(rowToRecord));
  });

  r.post(
    "/eventos",
    requireAuth,
    requireMenu(db, "eventos", "create"),
    async (req, res) => {
      const now = nowIso();
      const body = req.body && typeof req.body === "object" ? { ...req.body } : {};
      delete body.id;
      const event_date = eventDateFromBody(body);
      const body_json = JSON.stringify(body);
      const id = await nextSeq(db, "eventos");
      await db.collection("eventos").insertOne({
        id,
        owner_user_id: req.user.id,
        event_date,
        body_json,
        created_at: now,
        updated_at: now,
      });
      const row = await db
        .collection("eventos")
        .findOne({ id }, { projection: { _id: 0 } });
      await recordAudit(db, {
        userId: req.user.id,
        actorUserId: req.user.id,
        action: "data.eventos.create",
        details: { resource_id: id },
        ip: clientIp(req),
      });
      res.status(201).json(rowToRecord(row));
    },
  );

  r.put(
    "/eventos/:id",
    requireAuth,
    requireMenu(db, "eventos", "edit"),
    async (req, res) => {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) {
        res.status(400).json({ message: "invalid_id" });
        return;
      }
      const row = await db.collection("eventos").findOne({ id }, { projection: { _id: 0 } });
      if (!assertOwnerOrAdmin(req, res, row)) return;
      const now = nowIso();
      const body = req.body && typeof req.body === "object" ? { ...req.body } : {};
      delete body.id;
      const event_date = eventDateFromBody(body);
      const body_json = JSON.stringify(body);
      await db.collection("eventos").updateOne(
        { id },
        { $set: { event_date, body_json, updated_at: now } },
      );
      const next = await db
        .collection("eventos")
        .findOne({ id }, { projection: { _id: 0 } });
      await recordAudit(db, {
        userId: row.owner_user_id ?? req.user.id,
        actorUserId: req.user.id,
        action: "data.eventos.update",
        details: { resource_id: id },
        ip: clientIp(req),
      });
      res.json(rowToRecord(next));
    },
  );

  r.delete(
    "/eventos/:id",
    requireAuth,
    requireMenu(db, "eventos", "delete"),
    async (req, res) => {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) {
        res.status(400).json({ message: "invalid_id" });
        return;
      }
      const row = await db.collection("eventos").findOne({ id }, { projection: { _id: 0 } });
      if (!assertOwnerOrAdmin(req, res, row)) return;
      await recordAudit(db, {
        userId: row.owner_user_id ?? req.user.id,
        actorUserId: req.user.id,
        action: "data.eventos.delete",
        details: { resource_id: id },
        ip: clientIp(req),
      });
      await db.collection("eventos").deleteOne({ id });
      res.status(204).end();
    },
  );

  r.get("/materiais", async (req, res) => {
    const limit = parseLimit(req.query.limit, 50, 500);
    const skip = parseLimit(req.query.skip, 0, 10000);
    const sort = mongoSort("materiais", req.query.sort);
    const rows = await db
      .collection("materiais")
      .find({}, { projection: { _id: 0 } })
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .toArray();
    res.json(rows.map(rowToRecord));
  });

  r.post(
    "/materiais",
    requireAuth,
    requireMenu(db, "materiais_tab", "create"),
    async (req, res) => {
      const now = nowIso();
      const body = req.body && typeof req.body === "object" ? { ...req.body } : {};
      delete body.id;
      const body_json = JSON.stringify(body);
      const id = await nextSeq(db, "materiais");
      await db.collection("materiais").insertOne({
        id,
        owner_user_id: req.user.id,
        body_json,
        created_at: now,
        updated_at: now,
      });
      const row = await db
        .collection("materiais")
        .findOne({ id }, { projection: { _id: 0 } });
      await recordAudit(db, {
        userId: req.user.id,
        actorUserId: req.user.id,
        action: "data.materiais.create",
        details: { resource_id: id },
        ip: clientIp(req),
      });
      res.status(201).json(rowToRecord(row));
    },
  );

  r.put(
    "/materiais/:id",
    requireAuth,
    requireMenu(db, "materiais_tab", "edit"),
    async (req, res) => {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) {
        res.status(400).json({ message: "invalid_id" });
        return;
      }
      const row = await db.collection("materiais").findOne({ id }, { projection: { _id: 0 } });
      if (!assertOwnerOrAdmin(req, res, row)) return;
      const now = nowIso();
      const body = req.body && typeof req.body === "object" ? { ...req.body } : {};
      delete body.id;
      const body_json = JSON.stringify(body);
      await db.collection("materiais").updateOne(
        { id },
        { $set: { body_json, updated_at: now } },
      );
      const next = await db
        .collection("materiais")
        .findOne({ id }, { projection: { _id: 0 } });
      await recordAudit(db, {
        userId: row.owner_user_id ?? req.user.id,
        actorUserId: req.user.id,
        action: "data.materiais.update",
        details: { resource_id: id },
        ip: clientIp(req),
      });
      res.json(rowToRecord(next));
    },
  );

  r.delete(
    "/materiais/:id",
    requireAuth,
    requireMenu(db, "materiais_tab", "delete"),
    async (req, res) => {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) {
        res.status(400).json({ message: "invalid_id" });
        return;
      }
      const row = await db.collection("materiais").findOne({ id }, { projection: { _id: 0 } });
      if (!assertOwnerOrAdmin(req, res, row)) return;
      await recordAudit(db, {
        userId: row.owner_user_id ?? req.user.id,
        actorUserId: req.user.id,
        action: "data.materiais.delete",
        details: { resource_id: id },
        ip: clientIp(req),
      });
      await db.collection("materiais").deleteOne({ id });
      res.status(204).end();
    },
  );

  r.get("/fotos-galeria", async (req, res) => {
    const limit = parseLimit(req.query.limit, 100, 500);
    const skip = parseLimit(req.query.skip, 0, 10000);
    const sort = mongoSort("fotos_galeria", req.query.sort);
    const rows = await db
      .collection("fotos_galeria")
      .find({}, { projection: { _id: 0 } })
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .toArray();
    res.json(rows.map(rowToRecord));
  });

  r.post(
    "/fotos-galeria",
    requireAuth,
    requireMenu(db, "galeria", "create"),
    async (req, res) => {
      const now = nowIso();
      const body = req.body && typeof req.body === "object" ? { ...req.body } : {};
      delete body.id;
      const body_json = JSON.stringify(body);
      const id = await nextSeq(db, "fotos_galeria");
      await db.collection("fotos_galeria").insertOne({
        id,
        owner_user_id: req.user.id,
        body_json,
        created_at: now,
        updated_at: now,
      });
      const row = await db
        .collection("fotos_galeria")
        .findOne({ id }, { projection: { _id: 0 } });
      await recordAudit(db, {
        userId: req.user.id,
        actorUserId: req.user.id,
        action: "data.fotos_galeria.create",
        details: { resource_id: id },
        ip: clientIp(req),
      });
      res.status(201).json(rowToRecord(row));
    },
  );

  r.put(
    "/fotos-galeria/:id",
    requireAuth,
    requireMenu(db, "galeria", "edit"),
    async (req, res) => {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) {
        res.status(400).json({ message: "invalid_id" });
        return;
      }
      const row = await db
        .collection("fotos_galeria")
        .findOne({ id }, { projection: { _id: 0 } });
      if (!assertOwnerOrAdmin(req, res, row)) return;
      const now = nowIso();
      const body = req.body && typeof req.body === "object" ? { ...req.body } : {};
      delete body.id;
      const body_json = JSON.stringify(body);
      await db.collection("fotos_galeria").updateOne(
        { id },
        { $set: { body_json, updated_at: now } },
      );
      const next = await db
        .collection("fotos_galeria")
        .findOne({ id }, { projection: { _id: 0 } });
      await recordAudit(db, {
        userId: row.owner_user_id ?? req.user.id,
        actorUserId: req.user.id,
        action: "data.fotos_galeria.update",
        details: { resource_id: id },
        ip: clientIp(req),
      });
      res.json(rowToRecord(next));
    },
  );

  r.delete(
    "/fotos-galeria/:id",
    requireAuth,
    requireMenu(db, "galeria", "delete"),
    async (req, res) => {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) {
        res.status(400).json({ message: "invalid_id" });
        return;
      }
      const row = await db
        .collection("fotos_galeria")
        .findOne({ id }, { projection: { _id: 0 } });
      if (!assertOwnerOrAdmin(req, res, row)) return;
      await recordAudit(db, {
        userId: row.owner_user_id ?? req.user.id,
        actorUserId: req.user.id,
        action: "data.fotos_galeria.delete",
        details: { resource_id: id },
        ip: clientIp(req),
      });
      await db.collection("fotos_galeria").deleteOne({ id });
      res.status(204).end();
    },
  );

  return r;
}
