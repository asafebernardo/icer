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
 * }} opts
 */
export async function recordAudit(db, opts) {
  const {
    userId,
    actorUserId = userId,
    action,
    details = {},
    ip = null,
  } = opts;
  const id = await nextSeq(db, "audit_logs");
  await db.collection("audit_logs").insertOne({
    id,
    user_id: userId,
    actor_user_id: actorUserId ?? userId,
    action,
    details: details && typeof details === "object" ? details : {},
    ip: ip || null,
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
