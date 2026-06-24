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
import {
  isDeletedRow,
  markRowSoftDeleted,
  notDeletedFilter,
} from "./softDelete.js";
import { sanitizePostBody } from "./htmlSanitize.js";

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

/**
 * Data usada para ordenar posts na lista: `data_publicacao` do corpo, ou criação do registo.
 * @param {Record<string, unknown>} body
 * @param {string | Date} fallbackIso data de criação do registo (ISO ou Date)
 */
function pubSortAtFromBody(body, fallbackIso) {
  const iso = body?.data_publicacao;
  if (typeof iso === "string" && iso.trim()) {
    const t = Date.parse(iso.trim());
    if (!Number.isNaN(t)) return new Date(t);
  }
  const d =
    fallbackIso instanceof Date ? fallbackIso : new Date(String(fallbackIso));
  return Number.isNaN(d.getTime()) ? new Date(0) : d;
}

/**
 * @param {{ body_json?: string, created_at?: unknown }} row
 */
function pubSortAtFromRow(row) {
  let extra = {};
  try {
    extra = JSON.parse(row.body_json || "{}");
  } catch {
    extra = {};
  }
  const iso = extra?.data_publicacao;
  if (typeof iso === "string" && iso.trim()) {
    const t = Date.parse(iso.trim());
    if (!Number.isNaN(t)) return new Date(t);
  }
  const ca = row.created_at;
  if (ca instanceof Date) return ca;
  if (typeof ca === "string") {
    const t = Date.parse(ca);
    if (!Number.isNaN(t)) return new Date(t);
  }
  return new Date(0);
}

/**
 * Preenche `pub_sort_at` em posts antigos sem o campo (uma vez por arranque até ficar vazio).
 * @param {import("mongodb").Db} db
 */
export async function backfillPostsPubSortAt(db) {
  const coll = db.collection("posts");
  const cursor = coll.find({
    $or: [{ pub_sort_at: { $exists: false } }, { pub_sort_at: null }],
  });
  const ops = [];
  for await (const row of cursor) {
    ops.push({
      updateOne: {
        filter: { id: row.id },
        update: { $set: { pub_sort_at: pubSortAtFromRow(row) } },
      },
    });
    if (ops.length >= 500) {
      await coll.bulkWrite(ops);
      ops.length = 0;
    }
  }
  if (ops.length) await coll.bulkWrite(ops);
}

/** @param {"posts"|"eventos"|"materiais"|"fotos_galeria"} table */
function mongoSort(table, sort) {
  const s = String(sort || "").trim();
  if (!/^[-\w]+$/.test(s)) {
    return table === "posts"
      ? { pub_sort_at: -1, created_at: -1 }
      : { created_at: -1 };
  }
  if (table === "eventos") {
    if (s === "data" || s === "event_date") return { event_date: 1, created_at: 1 };
    if (s === "-data") return { event_date: -1, created_at: -1 };
  }
  if (table === "posts") {
    if (s === "created_date" || s === "data") return { pub_sort_at: 1, created_at: 1 };
    if (s === "-created_date" || s === "-data") return { pub_sort_at: -1, created_at: -1 };
  }
  if (s === "created_date" || s === "data") return { created_at: 1 };
  if (s === "-created_date" || s === "-data") return { created_at: -1 };
  return { created_at: -1 };
}

/** Visibilidades reconhecidas em postagens. */
const POST_VISIBILITIES = new Set(["public", "unlisted", "private"]);

/** Normaliza um valor arbitrário para uma visibilidade conhecida; default "public". */
function normalizePostVisibility(v) {
  const s = String(v ?? "").trim().toLowerCase();
  return POST_VISIBILITIES.has(s) ? s : "public";
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
  const draft = row.is_draft === true;
  const visibility =
    typeof row.visibility === "string" && row.visibility
      ? normalizePostVisibility(row.visibility)
      : normalizePostVisibility(extra.visibility);
  return {
    ...extra,
    id: row.id,
    created_date: row.created_at,
    updated_date: row.updated_at,
    is_draft: draft,
    status: draft ? "draft" : "published",
    visibility,
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
  if (!row || isDeletedRow(row)) {
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
    const draftsOnly = String(req.query.drafts || "").trim() === "1";
    /** Rascunhos só na lista para admins com `?drafts=1`. Caso contrário, não listar rascunhos. */
    let filter = {};
    if (draftsOnly) {
      if (!req.user || req.user.role !== "admin") {
        res.status(403).json({ message: "forbidden" });
        return;
      }
      filter = { is_draft: true };
    } else {
      filter = { is_draft: { $ne: true } };
    }
    /**
     * Visibilidade na listagem pública:
     *  - "public" (ou ausente, para posts antigos): aparece para todos.
     *  - "unlisted": só com link direto (oculta da listagem para todos).
     *  - "private": só visível na listagem ao dono ou a um admin.
     */
    const isAdmin = req.user?.role === "admin";
    if (!draftsOnly) {
      const visibilityClauses = [
        { visibility: "public" },
        { visibility: { $exists: false } },
        { visibility: null },
        { visibility: "" },
      ];
      if (req.user?.id != null) {
        visibilityClauses.push({
          visibility: { $in: ["unlisted", "private"] },
          owner_user_id: Number(req.user.id),
        });
      }
      if (isAdmin) {
        visibilityClauses.push({ visibility: { $in: ["unlisted", "private"] } });
      }
      filter = { $and: [filter, { $or: visibilityClauses }, notDeletedFilter()] };
    } else {
      filter = { $and: [filter, notDeletedFilter()] };
    }
    const [rows, total] = await Promise.all([
      db
        .collection("posts")
        .find(filter, { projection: { _id: 0 } })
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection("posts").countDocuments(filter),
    ]);
    res.json({
      items: rows.map(rowToRecord),
      total,
      skip,
      limit,
    });
  });

  r.get("/posts/:id", async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      res.status(400).json({ message: "invalid_id" });
      return;
    }
    const row = await db.collection("posts").findOne({ id }, { projection: { _id: 0 } });
    if (!row || isDeletedRow(row)) {
      res.status(404).json({ message: "not_found" });
      return;
    }
    if (row.is_draft === true) {
      const uid = req.user?.id;
      const ownerOk =
        uid != null &&
        row.owner_user_id != null &&
        Number(row.owner_user_id) === Number(uid);
      const adminOk = req.user?.role === "admin";
      if (!ownerOk && !adminOk) {
        res.status(404).json({ message: "not_found" });
        return;
      }
    }
    /**
     * "private" exige dono ou admin — devolve 404 em vez de 403 para não vazar a existência
     * da postagem a quem não tem permissão. "unlisted" não restringe acesso direto pelo id.
     */
    if (normalizePostVisibility(row.visibility) === "private") {
      const uid = req.user?.id;
      const ownerOk =
        uid != null &&
        row.owner_user_id != null &&
        Number(row.owner_user_id) === Number(uid);
      const adminOk = req.user?.role === "admin";
      if (!ownerOk && !adminOk) {
        res.status(404).json({ message: "not_found" });
        return;
      }
    }
    res.json(rowToRecord(row));
  });

  r.post(
    "/posts",
    requireAuth,
    requireMenu(db, "postagens", "create"),
    async (req, res) => {
      const now = nowIso();
      const body = sanitizePostBody(
        req.body && typeof req.body === "object" ? { ...req.body } : {},
      );
      delete body.id;
      const is_draft =
        body.status === "draft" || body.is_draft === true;
      const visibility = normalizePostVisibility(body.visibility);
      body.visibility = visibility;
      const body_json = JSON.stringify(body);
      const pub_sort_at = pubSortAtFromBody(body, now);
      const id = await nextSeq(db, "posts");
      await db.collection("posts").insertOne({
        id,
        owner_user_id: req.user.id,
        body_json,
        is_draft: Boolean(is_draft),
        visibility,
        pub_sort_at,
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
      let prev = {};
      try {
        prev = JSON.parse(row.body_json || "{}");
        if (!prev || typeof prev !== "object") prev = {};
      } catch {
        prev = {};
      }
      const incoming = sanitizePostBody(
        req.body && typeof req.body === "object" ? { ...req.body } : {},
      );
      delete incoming.id;
      const merged = sanitizePostBody({ ...prev, ...incoming });
      const visibility = normalizePostVisibility(merged.visibility);
      merged.visibility = visibility;
      const body_json = JSON.stringify(merged);
      const is_draft =
        merged.status === "draft" || merged.is_draft === true;
      const pub_sort_at = pubSortAtFromBody(merged, row.created_at || now);
      await db.collection("posts").updateOne(
        { id },
        {
          $set: {
            body_json,
            updated_at: now,
            is_draft: Boolean(is_draft),
            visibility,
            pub_sort_at,
          },
        },
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
        action: "data.posts.delete_scheduled",
        details: { resource_id: id },
        ip: clientIp(req),
      });
      const marked = await markRowSoftDeleted(db, "posts", { id }, req.user.id);
      if (!marked.ok) {
        res.status(404).json({ message: "not_found" });
        return;
      }
      res.status(204).end();
    },
  );

  r.get("/eventos", async (req, res) => {
    const limit = parseLimit(req.query.limit, 500, 2000);
    const skip = parseLimit(req.query.skip, 0, 10000);
    const sort = mongoSort("eventos", req.query.sort);
    const rows = await db
      .collection("eventos")
      .find(notDeletedFilter(), { projection: { _id: 0 } })
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
      const bulk_batch_id_raw = body.bulk_batch_id;
      const bulk_batch_id =
        typeof bulk_batch_id_raw === "string" && bulk_batch_id_raw.trim()
          ? bulk_batch_id_raw.trim().slice(0, 96)
          : null;
      const event_date = eventDateFromBody(body);
      const body_json = JSON.stringify(body);
      const id = await nextSeq(db, "eventos");
      await db.collection("eventos").insertOne({
        id,
        owner_user_id: req.user.id,
        event_date,
        body_json,
        bulk_batch_id,
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
      delete body.bulk_batch_id;
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
        action: "data.eventos.delete_scheduled",
        details: { resource_id: id },
        ip: clientIp(req),
      });
      const marked = await markRowSoftDeleted(db, "eventos", { id }, req.user.id);
      if (!marked.ok) {
        res.status(404).json({ message: "not_found" });
        return;
      }
      res.status(204).end();
    },
  );

  r.get("/materiais", async (req, res) => {
    const limit = parseLimit(req.query.limit, 50, 500);
    const skip = parseLimit(req.query.skip, 0, 10000);
    const sort = mongoSort("materiais", req.query.sort);
    const rows = await db
      .collection("materiais")
      .find(notDeletedFilter(), { projection: { _id: 0 } })
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .toArray();
    res.json(rows.map(rowToRecord));
  });

  r.post(
    "/materiais",
    requireAuth,
    requireMenu(db, "recursos", "create"),
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
    requireMenu(db, "recursos", "edit"),
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
    requireMenu(db, "recursos", "delete"),
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
        action: "data.materiais.delete_scheduled",
        details: { resource_id: id },
        ip: clientIp(req),
      });
      const marked = await markRowSoftDeleted(db, "materiais", { id }, req.user.id);
      if (!marked.ok) {
        res.status(404).json({ message: "not_found" });
        return;
      }
      res.status(204).end();
    },
  );

  r.get("/fotos-galeria", async (req, res) => {
    const limit = parseLimit(req.query.limit, 100, 500);
    const skip = parseLimit(req.query.skip, 0, 10000);
    const sort = mongoSort("fotos_galeria", req.query.sort);
    const rows = await db
      .collection("fotos_galeria")
      .find(notDeletedFilter(), { projection: { _id: 0 } })
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
        action: "data.fotos_galeria.delete_scheduled",
        details: { resource_id: id },
        ip: clientIp(req),
      });
      const marked = await markRowSoftDeleted(db, "fotos_galeria", { id }, req.user.id);
      if (!marked.ok) {
        res.status(404).json({ message: "not_found" });
        return;
      }
      res.status(204).end();
    },
  );

  return r;
}
