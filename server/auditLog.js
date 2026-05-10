import { nowIso } from "./security.js";
import { nextSeq } from "./sequences.js";

/** @param {import("express").Request} req */
export function clientIp(req) {
  const xf = req.headers["x-forwarded-for"];
  if (typeof xf === "string" && xf.length) {
    return xf.split(",")[0].trim().slice(0, 128);
  }
  const ip = req.ip || req.socket?.remoteAddress;
  return ip ? String(ip).slice(0, 128) : null;
}

/**
 * @param {import("mongodb").Db} db
 * @param {{
 *   userId: number | null;
 *   actorUserId?: number | null;
 *   action: string;
 *   details?: Record<string, unknown>;
 *   ip?: string | null;
 *   originUrl?: string | null;
 *   route?: string | null;
 *   userAgent?: string | null;
 * }} opts
 */
export async function recordAudit(db, opts) {
  const {
    userId,
    actorUserId = userId,
    action,
    details = {},
    ip = null,
    originUrl = null,
    route = null,
    userAgent = null,
  } = opts;
  const id = await nextSeq(db, "audit_logs");
  await db.collection("audit_logs").insertOne({
    id,
    user_id: userId,
    actor_user_id: actorUserId ?? userId,
    action,
    details: details && typeof details === "object" ? details : {},
    ip: ip || null,
    origin_url: originUrl || null,
    route: route || null,
    user_agent: userAgent || null,
    created_at: nowIso(),
  });
}

/**
 * @param {import("mongodb").Db} db
 * @param {number} userId
 * @param {{ limit?: number; skip?: number }} [opts]
 */
export async function listAuditLogsForUser(db, userId, opts = {}) {
  const limit = Math.min(Math.max(Number(opts.limit) || 50, 1), 200);
  const skip = Math.max(Number(opts.skip) || 0, 0);
  const rows = await db
    .collection("audit_logs")
    .find(
      { user_id: userId },
      { projection: { _id: 0 } },
    )
    .sort({ created_at: -1 })
    .skip(skip)
    .limit(limit)
    .toArray();
  return rows;
}

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Lista global de auditoria (admin), com filtros opcionais e total para paginação.
 * @param {import("mongodb").Db} db
 * @param {{
 *   limit?: number;
 *   skip?: number;
 *   action?: string;
 *   userId?: number;
 *   userIdNull?: boolean;
 *   actorUserId?: number;
 *   ip?: string;
 * }} [opts]
 */
export async function listAuditLogsGlobal(db, opts = {}) {
  const limit = Math.min(Math.max(Number(opts.limit) || 50, 1), 200);
  const skip = Math.max(Number(opts.skip) || 0, 0);
  /** @type {import("mongodb").Document} */
  const filter = {};

  const action = typeof opts.action === "string" ? opts.action.trim() : "";
  if (action.length > 0) {
    filter.action = { $regex: escapeRegex(action), $options: "i" };
  }

  if (opts.userIdNull === true) {
    filter.user_id = null;
  } else if (opts.userId != null && Number.isFinite(opts.userId)) {
    filter.user_id = opts.userId;
  }

  if (opts.actorUserId != null && Number.isFinite(opts.actorUserId)) {
    filter.actor_user_id = opts.actorUserId;
  }

  const ip = typeof opts.ip === "string" ? opts.ip.trim() : "";
  if (ip.length > 0) {
    filter.ip = { $regex: escapeRegex(ip), $options: "i" };
  }

  const col = db.collection("audit_logs");
  const [rows, total] = await Promise.all([
    col
      .find(filter, { projection: { _id: 0 } })
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    col.countDocuments(filter),
  ]);
  return { rows, total };
}

export const AUDIT_LOG_RETENTION_KEY = "audit_log_retention_policy_v1";

/** @typedef {"never" | "30" | "60" | "90"} AuditLogRetentionPolicy */

/**
 * @param {unknown} raw
 * @returns {AuditLogRetentionPolicy}
 */
export function normalizeAuditLogRetentionPolicy(raw) {
  const s = String(raw ?? "").trim().toLowerCase();
  if (s === "30" || s === "60" || s === "90") return s;
  return "never";
}

/**
 * @param {import("mongodb").Db} db
 * @returns {Promise<AuditLogRetentionPolicy>}
 */
export async function getAuditLogRetentionPolicy(db) {
  const row = await db.collection("app_kv").findOne({ key: AUDIT_LOG_RETENTION_KEY });
  return normalizeAuditLogRetentionPolicy(row?.value);
}

/**
 * @param {import("mongodb").Db} db
 * @param {unknown} policy
 * @returns {Promise<AuditLogRetentionPolicy>}
 */
export async function setAuditLogRetentionPolicy(db, policy) {
  const p = normalizeAuditLogRetentionPolicy(policy);
  await db.collection("app_kv").updateOne(
    { key: AUDIT_LOG_RETENTION_KEY },
    {
      $set: {
        key: AUDIT_LOG_RETENTION_KEY,
        value: p,
        updated_at: nowIso(),
      },
    },
    { upsert: true },
  );
  return p;
}

/**
 * @param {AuditLogRetentionPolicy} policy
 * @returns {number | null} milissegundos de idade máxima, ou null = sem limite
 */
export function retentionPolicyToMaxAgeMs(policy) {
  if (policy === "never") return null;
  const days = Number(policy);
  if (!Number.isFinite(days) || days <= 0) return null;
  return days * 24 * 60 * 60 * 1000;
}

/**
 * Remove linhas de auditoria mais antigas que a política atual (exceto "never").
 * @param {import("mongodb").Db} db
 * @returns {Promise<{ deleted: number }>}
 */
export async function purgeAuditLogsByPolicy(db) {
  const policy = await getAuditLogRetentionPolicy(db);
  const maxAge = retentionPolicyToMaxAgeMs(policy);
  if (maxAge == null) return { deleted: 0 };
  const cutoff = new Date(Date.now() - maxAge).toISOString();
  const result = await db.collection("audit_logs").deleteMany({
    created_at: { $lt: cutoff },
  });
  return { deleted: result.deletedCount || 0 };
}
