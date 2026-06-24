import { nowIso } from "./security.js";

/** Dias até eliminação definitiva após pedido de remoção. */
export const SOFT_DELETE_RETENTION_DAYS = 30;
export const SOFT_DELETE_RETENTION_MS =
  SOFT_DELETE_RETENTION_DAYS * 24 * 60 * 60 * 1000;

/** Coleções com exclusão suave (eliminação definitiva após retenção). */
export const SOFT_DELETE_COLLECTIONS = Object.freeze([
  "posts",
  "eventos",
  "materiais",
  "fotos_galeria",
  "users",
  "files",
  "permission_groups",
  "event_bulk_schedule_templates_v1",
]);

/**
 * @param {unknown} row
 */
export function isDeletedRow(row) {
  const v = row?.deleted_at;
  return v != null && String(v).trim() !== "";
}

/** Filtro Mongo: registo ainda não marcado para exclusão. */
export function notDeletedFilter() {
  return {
    $or: [
      { deleted_at: { $exists: false } },
      { deleted_at: null },
      { deleted_at: "" },
    ],
  };
}

/** Filtro Mongo: prontos para eliminação definitiva. */
export function purgeDueFilter(now = nowIso()) {
  return {
    purge_after: { $lte: now, $ne: null, $exists: true },
  };
}

/**
 * @param {number | null | undefined} actorUserId
 */
export function softDeleteFields(actorUserId) {
  const now = new Date();
  const fields = {
    deleted_at: now.toISOString(),
    purge_after: new Date(now.getTime() + SOFT_DELETE_RETENTION_MS).toISOString(),
    deleted_by_user_id: null,
  };
  if (actorUserId != null && Number.isFinite(Number(actorUserId))) {
    fields.deleted_by_user_id = Number(actorUserId);
  }
  return fields;
}

export function restoreSoftDeleteFields() {
  return {
    deleted_at: null,
    purge_after: null,
    deleted_by_user_id: null,
  };
}

/**
 * Marca um registo para exclusão suave.
 * @param {import("mongodb").Db} db
 * @param {string} collection
 * @param {Record<string, unknown>} filter
 * @param {number | null | undefined} actorUserId
 */
export async function markRowSoftDeleted(db, collection, filter, actorUserId) {
  const row = await db.collection(collection).findOne(filter, { projection: { _id: 0, deleted_at: 1 } });
  if (!row || isDeletedRow(row)) return { ok: false };
  const fields = softDeleteFields(actorUserId);
  await db.collection(collection).updateOne(filter, { $set: fields });
  return { ok: true, purge_after: fields.purge_after, deleted_at: fields.deleted_at };
}

/**
 * Cancela exclusão pendente.
 * @param {import("mongodb").Db} db
 * @param {string} collection
 * @param {Record<string, unknown>} filter
 */
export async function restoreSoftDeletedRow(db, collection, filter) {
  const row = await db.collection(collection).findOne(filter, { projection: { _id: 0, deleted_at: 1 } });
  if (!row || !isDeletedRow(row)) return { ok: false };
  await db.collection(collection).updateOne(filter, { $set: restoreSoftDeleteFields() });
  return { ok: true };
}

/**
 * @param {Record<string, unknown>} row
 * @param {string} [fallback]
 */
export function softDeleteItemLabel(row, fallback = "—") {
  if (!row) return fallback;
  if (row.email) return String(row.email);
  if (row.original_name) return String(row.original_name);
  if (row.nome) return String(row.nome);
  if (row.slug) return String(row.slug);
  let extra = {};
  try {
    extra = JSON.parse(String(row.body_json || "{}"));
    if (!extra || typeof extra !== "object") extra = {};
  } catch {
    extra = {};
  }
  const t = extra.titulo || extra.title || extra.nome;
  if (t) return String(t);
  if (row.id != null) return `#${row.id}`;
  return fallback;
}

export const SOFT_DELETE_TYPE_LABELS = Object.freeze({
  posts: "Publicação",
  eventos: "Evento",
  materiais: "Material",
  fotos_galeria: "Foto da galeria",
  users: "Utilizador",
  files: "Arquivo",
  permission_groups: "Grupo de permissão",
  event_bulk_schedule_templates_v1: "Agendamento guardado",
});
