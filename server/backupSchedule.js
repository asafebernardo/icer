import fs from "node:fs";
import path from "node:path";
import { nowIso } from "./security.js";
import { recordAudit } from "./auditLog.js";
import { writeSiteBackupZipToFile } from "./siteBackup.js";
import { getGoogleIntegrationSafe } from "./adminGoogleIntegration.js";
import { getAuthorizedDriveClient } from "./googleOAuth.js";

const KEY = "icer_backup_schedule_v1";

function clampInt(n, min, max, fallback) {
  const x = Number.parseInt(String(n), 10);
  if (!Number.isFinite(x)) return fallback;
  return Math.min(max, Math.max(min, x));
}

export function sanitizeBackupSchedule(raw) {
  const src = raw && typeof raw === "object" ? raw : {};
  return {
    enabled: src.enabled === true,
    weekday: clampInt(src.weekday, 0, 6, 1),
    hour: clampInt(src.hour, 0, 23, 3),
    minute: clampInt(src.minute, 0, 59, 0),
    last_run_at: typeof src.last_run_at === "string" ? src.last_run_at : null,
    last_run_ok: src.last_run_ok === true ? true : src.last_run_ok === false ? false : null,
    last_run_message:
      typeof src.last_run_message === "string"
        ? String(src.last_run_message).slice(0, 500)
        : null,
  };
}

export async function getBackupSchedule(db) {
  const row = await db.collection("app_kv").findOne({ key: KEY }, { projection: { _id: 0, value: 1 } });
  const v = row?.value && typeof row.value === "object" ? row.value : {};
  return sanitizeBackupSchedule(v);
}

export async function saveBackupSchedule(db, patch) {
  const cur = await getBackupSchedule(db);
  const next = sanitizeBackupSchedule({ ...cur, ...patch });
  await db.collection("app_kv").updateOne(
    { key: KEY },
    { $set: { key: KEY, value: next, updated_at: nowIso() } },
    { upsert: true },
  );
  return next;
}

function resolveUploadedDiskPath(uploadDir, row) {
  const legacy = row?.storage_path != null ? String(row.storage_path).trim() : "";
  if (legacy && fs.existsSync(legacy)) return legacy;
  const base =
    legacy && path.basename(legacy) !== "." && path.basename(legacy) !== ".."
      ? path.basename(legacy)
      : "";
  if (!base) return null;
  const candidate = path.join(uploadDir, base);
  return fs.existsSync(candidate) ? candidate : null;
}

function publicBaseForGoogle() {
  return String(process.env.ICER_PUBLIC_BASE_URL || "")
    .trim()
    .replace(/\/+$/, "");
}

/**
 * Gera ZIP e, se configurado, envia para o Drive (mesma lógica que POST backup/upload-google).
 * @returns {{ ok: boolean; message?: string; drive_uploaded?: boolean }}
 */
export async function executeScheduledSiteBackup(db, uploadDir) {
  const stamp = new Date().toISOString().replaceAll(":", "-").replace(/\.\d{3}Z$/, "Z");
  const filename = `icer-site-backup-${stamp}.zip`;
  const fsP = await import("node:fs/promises");
  const os = await import("node:os");
  const tmp = await fsP.mkdtemp(path.join(os.tmpdir(), "icer-"));
  const outPath = path.join(tmp, filename);
  try {
    await writeSiteBackupZipToFile(outPath, db, uploadDir, (row) =>
      resolveUploadedDiskPath(uploadDir, row),
    );

    let drive_uploaded = false;
    const cfgSafe = await getGoogleIntegrationSafe(db);
    if (
      cfgSafe.enabled === true &&
      cfgSafe.auto_upload_backups === true &&
      cfgSafe.drive_export_folder_id
    ) {
      const base = publicBaseForGoogle();
      if (base) {
        const row = await db
          .collection("app_kv")
          .findOne({ key: "google_integration_v1" }, { projection: { _id: 0, value: 1 } });
        const real = row?.value && typeof row.value === "object" ? row.value : {};
        const client_id = String(real.client_id || "").trim();
        const client_secret = String(real.client_secret || "").trim();
        const redirectUri = `${base}/api/auth/google/callback`;
        const auth = await getAuthorizedDriveClient(db, { client_id, client_secret }, redirectUri);
        if (auth.ok) {
          const fsMod = await import("node:fs");
          const media = {
            mimeType: "application/zip",
            body: fsMod.createReadStream(outPath),
          };
          const meta = {
            name: filename,
            parents: [cfgSafe.drive_export_folder_id],
          };
          const up = await auth.drive.files.create({
            requestBody: meta,
            media,
            fields: "id,name,createdTime",
          });
          drive_uploaded = true;
          await recordAudit(db, {
            userId: null,
            actorUserId: null,
            action: "admin.backup_schedule_google",
            details: { drive_file_id: up.data.id, name: up.data.name },
            ip: null,
          });
        }
      }
    }

    await recordAudit(db, {
      userId: null,
      actorUserId: null,
      action: "admin.backup_schedule_run",
      details: { filename, drive_uploaded },
      ip: null,
    });
    return { ok: true, drive_uploaded };
  } catch (e) {
    const message = String(e?.message || e || "backup_failed").slice(0, 500);
    await recordAudit(db, {
      userId: null,
      actorUserId: null,
      action: "admin.backup_schedule_failed",
      details: { message },
      ip: null,
    });
    return { ok: false, message };
  } finally {
    try {
      await fsP.rm(tmp, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
}

/**
 * Se o relógio local do servidor coincide com o agendamento e ainda não correu neste minuto.
 */
export async function tickBackupScheduleIfDue(db, uploadDir) {
  const sch = await getBackupSchedule(db);
  if (!sch.enabled) return;

  const now = new Date();
  if (now.getDay() !== sch.weekday) return;
  if (now.getHours() !== sch.hour) return;
  if (now.getMinutes() !== sch.minute) return;

  const startOfMinute = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    now.getHours(),
    now.getMinutes(),
    0,
    0,
  ).getTime();
  if (sch.last_run_at) {
    const prev = new Date(sch.last_run_at).getTime();
    if (Number.isFinite(prev) && prev >= startOfMinute) return;
  }

  const result = await executeScheduledSiteBackup(db, uploadDir);
  await saveBackupSchedule(db, {
    last_run_at: nowIso(),
    last_run_ok: result.ok,
    last_run_message: result.ok
      ? result.drive_uploaded
        ? "Backup concluído e enviado ao Drive."
        : "Backup concluído (ZIP gerado)."
      : result.message || "Falha",
  });
}

export function startBackupScheduleLoop(db, { uploadDir }) {
  const dir = String(uploadDir || "").trim() || path.resolve("server", "uploads");
  const tick = () => {
    void tickBackupScheduleIfDue(db, dir).catch((e) => {
      // eslint-disable-next-line no-console
      console.error("[ICER] backup schedule tick", e);
    });
  };
  tick();
  return setInterval(tick, 60_000);
}
