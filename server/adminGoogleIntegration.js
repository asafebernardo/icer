import { nowIso } from "./security.js";

const KEY = "google_integration_v1";

/** @returns {object} */
function defaultValue() {
  return {
    enabled: false,
    client_id: "",
    client_secret: "",
    drive_export_folder_id: "",
    auto_upload_backups: false,
    notes: "",
    updated_at: null,
  };
}

/**
 * @param {import("mongodb").Db} db
 */
export async function getGoogleIntegrationSafe(db) {
  const row = await db.collection("app_kv").findOne({ key: KEY }, { projection: { _id: 0, value: 1 } });
  const v = row?.value && typeof row.value === "object" ? { ...defaultValue(), ...row.value } : defaultValue();
  const secret = String(v.client_secret || "").trim();
  return {
    enabled: v.enabled === true,
    client_id: String(v.client_id || "").trim(),
    client_secret_set: secret.length > 0,
    drive_export_folder_id: String(v.drive_export_folder_id || "").trim(),
    auto_upload_backups: v.auto_upload_backups === true,
    notes: String(v.notes || "").trim(),
    updated_at: v.updated_at || null,
  };
}

/**
 * @param {import("mongodb").Db} db
 * @param {{
 *   enabled?: boolean;
 *   client_id?: string;
 *   client_secret?: string;
 *   clear_client_secret?: boolean;
 *   drive_export_folder_id?: string;
 *   notes?: string;
 * }} patch
 */
export async function mergeGoogleIntegration(db, patch) {
  const curRow = await db.collection("app_kv").findOne({ key: KEY }, { projection: { _id: 0, value: 1 } });
  const cur =
    curRow?.value && typeof curRow.value === "object"
      ? { ...defaultValue(), ...curRow.value }
      : defaultValue();

  const next = { ...cur };
  if (typeof patch.enabled === "boolean") next.enabled = patch.enabled;
  if (patch.client_id !== undefined) next.client_id = String(patch.client_id || "").trim();
  if (patch.drive_export_folder_id !== undefined) {
    next.drive_export_folder_id = String(patch.drive_export_folder_id || "").trim();
  }
  if (typeof patch.auto_upload_backups === "boolean") {
    next.auto_upload_backups = patch.auto_upload_backups;
  }
  if (patch.notes !== undefined) next.notes = String(patch.notes || "").trim();

  if (patch.clear_client_secret === true) {
    next.client_secret = "";
  } else if (patch.client_secret !== undefined) {
    const s = String(patch.client_secret || "").trim();
    if (s.length > 0) next.client_secret = s;
  }

  next.updated_at = nowIso();
  await db.collection("app_kv").updateOne(
    { key: KEY },
    { $set: { key: KEY, value: next, updated_at: next.updated_at } },
    { upsert: true },
  );
  return getGoogleIntegrationSafe(db);
}
