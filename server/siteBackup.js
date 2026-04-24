import fs from "node:fs";
import path from "node:path";
import archiver from "archiver";
import { EJSON } from "bson";

/**
 * Coleções MongoDB incluídas no backup (formato ICER).
 * `sessions` é omitida — são dados transitórios; utilizadores voltam a iniciar sessão após restauro.
 */
export const BACKUP_MONGO_COLLECTIONS = [
  "_sequences",
  "users",
  "posts",
  "eventos",
  "materiais",
  "fotos_galeria",
  "contatos",
  "files",
  "app_kv",
  "user_invites",
  "audit_logs",
  "metric_home_views_by_ip_v1",
  "auth_login_failures_v1",
];

const BACKUP_VERSION = 1;

/**
 * @param {import("mongodb").Db} db
 * @param {string} uploadDir
 * @param {(row: object) => string | null} resolveUploadedDiskPath
 */
export async function getBackupSummary(db, uploadDir, resolveUploadedDiskPath) {
  const collections = {};
  for (const name of BACKUP_MONGO_COLLECTIONS) {
    try {
      collections[name] = await db.collection(name).countDocuments({});
    } catch {
      collections[name] = 0;
    }
  }
  const fileRows = await db.collection("files").find({}).project({ id: 1, storage_path: 1 }).toArray();
  let filesOnDisk = 0;
  let filesMissing = 0;
  for (const row of fileRows) {
    const disk = resolveUploadedDiskPath(row);
    if (disk && fs.existsSync(disk)) filesOnDisk += 1;
    else filesMissing += 1;
  }

  // Espaço do volume onde está `uploadDir` (útil para planeamento de storage).
  let disk_total_bytes = null;
  let disk_free_bytes = null;
  try {
    const st = await fs.promises.statfs(path.resolve(uploadDir));
    const total = Number(st.blocks) * Number(st.bsize);
    const free = Number(st.bavail) * Number(st.bsize);
    if (Number.isFinite(total) && total > 0) disk_total_bytes = total;
    if (Number.isFinite(free) && free >= 0) disk_free_bytes = free;
  } catch {
    // Em alguns ambientes/FS, statfs pode falhar — deixa nulo.
  }
  return {
    backup_version: BACKUP_VERSION,
    mongo_collections: collections,
    files_total: fileRows.length,
    files_on_disk: filesOnDisk,
    files_missing: filesMissing,
    upload_dir: path.resolve(uploadDir),
    disk_total_bytes,
    disk_free_bytes,
  };
}

/**
 * Gera ZIP na resposta HTTP: manifest, JSON por coleção (EJSON), ficheiros em `uploads/`.
 * @param {import("express").Response} res
 * @param {import("mongodb").Db} db
 * @param {string} uploadDir
 * @param {(row: object) => string | null} resolveUploadedDiskPath
 * @param {{ onArchiveEnd?: () => void }} [hooks]
 */
export function pipeSiteBackupZip(
  res,
  db,
  uploadDir,
  resolveUploadedDiskPath,
  hooks = {},
) {
  const archive = archiver("zip", { zlib: { level: 6 } });

  return new Promise((resolve, reject) => {
    const done = () => resolve(undefined);
    const fail = (err) => reject(err);

    archive.on("error", (err) => {
      try {
        if (!res.headersSent) res.status(500);
      } catch {
        /* ignore */
      }
      fail(err);
    });
    archive.on("end", () => {
      hooks.onArchiveEnd?.();
      done();
    });

    archive.pipe(res);

    const manifest = {
      icer_backup_version: BACKUP_VERSION,
      created_at: new Date().toISOString(),
      description:
        "Backup padrão ICER: MongoDB (coleções listadas) + ficheiros referenciados na coleção files. Sessões não incluídas. Pronto para cópia manual ou integração futura (ex.: Google Drive).",
      mongo_collections: [...BACKUP_MONGO_COLLECTIONS],
      excludes_sessions: true,
    };
    archive.append(JSON.stringify(manifest, null, 2), { name: "manifest.json" });

    (async () => {
      try {
        for (const name of BACKUP_MONGO_COLLECTIONS) {
          const docs = await db.collection(name).find({}).toArray();
          const serialized = docs.map((d) => EJSON.serialize(d));
          archive.append(JSON.stringify(serialized), { name: `mongo/${name}.json` });
        }

        const fileRows = await db
          .collection("files")
          .find({})
          .project({ _id: 0 })
          .toArray();
        const missing = [];
        for (const row of fileRows) {
          const disk = resolveUploadedDiskPath(row);
          if (disk && fs.existsSync(disk)) {
            const base = path.basename(disk);
            archive.file(disk, { name: `uploads/${row.id}_${base}` });
          } else {
            missing.push({
              id: row.id,
              original_name: row.original_name,
              storage_path: row.storage_path,
            });
          }
        }
        if (missing.length > 0) {
          archive.append(JSON.stringify({ missing_files: missing }, null, 2), {
            name: "uploads/MISSING_FILES.json",
          });
        }

        archive.append(
          JSON.stringify(
            {
              note: "Caminhos em MISSING_FILES.json indicam metadados sem ficheiro no disco atual (ICER_UPLOAD_DIR).",
              upload_dir_resolved: path.resolve(uploadDir),
            },
            null,
            2,
          ),
          { name: "uploads/README.json" },
        );

        await archive.finalize();
      } catch (e) {
        archive.abort();
        fail(e);
      }
    })();
  });
}

/**
 * Gera backup ZIP num ficheiro temporário.
 * @param {string} outPath
 * @param {import("mongodb").Db} db
 * @param {string} uploadDir
 * @param {(row: object) => string | null} resolveUploadedDiskPath
 */
export function writeSiteBackupZipToFile(outPath, db, uploadDir, resolveUploadedDiskPath) {
  const archive = archiver("zip", { zlib: { level: 6 } });
  return new Promise((resolve, reject) => {
    const out = fs.createWriteStream(outPath);
    out.on("close", () => resolve(undefined));
    out.on("error", reject);
    archive.on("error", reject);
    archive.pipe(out);

    const manifest = {
      icer_backup_version: BACKUP_VERSION,
      created_at: new Date().toISOString(),
      description:
        "Backup padrão ICER: MongoDB (coleções listadas) + ficheiros referenciados na coleção files. Sessões não incluídas. Pronto para cópia manual ou integração futura (ex.: Google Drive).",
      mongo_collections: [...BACKUP_MONGO_COLLECTIONS],
      excludes_sessions: true,
    };
    archive.append(JSON.stringify(manifest, null, 2), { name: "manifest.json" });

    (async () => {
      try {
        for (const name of BACKUP_MONGO_COLLECTIONS) {
          const docs = await db.collection(name).find({}).toArray();
          const serialized = docs.map((d) => EJSON.serialize(d));
          archive.append(JSON.stringify(serialized), { name: `mongo/${name}.json` });
        }

        const fileRows = await db
          .collection("files")
          .find({})
          .project({ _id: 0 })
          .toArray();
        const missing = [];
        for (const row of fileRows) {
          const disk = resolveUploadedDiskPath(row);
          if (disk && fs.existsSync(disk)) {
            const base = path.basename(disk);
            archive.file(disk, { name: `uploads/${row.id}_${base}` });
          } else {
            missing.push({
              id: row.id,
              original_name: row.original_name,
              storage_path: row.storage_path,
            });
          }
        }
        if (missing.length > 0) {
          archive.append(JSON.stringify({ missing_files: missing }, null, 2), {
            name: "uploads/MISSING_FILES.json",
          });
        }

        archive.append(
          JSON.stringify(
            {
              note: "Caminhos em MISSING_FILES.json indicam metadados sem ficheiro no disco atual (ICER_UPLOAD_DIR).",
              upload_dir_resolved: path.resolve(uploadDir),
            },
            null,
            2,
          ),
          { name: "uploads/README.json" },
        );

        await archive.finalize();
      } catch (e) {
        archive.abort();
        reject(e);
      }
    })();
  });
}
