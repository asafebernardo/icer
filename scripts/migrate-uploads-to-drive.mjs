/**
 * Envia ficheiros que ainda estão no disco do VPS para o Google Drive.
 *
 * Requer no .env:
 *   ICER_STORAGE=drive
 *   ICER_GOOGLE_DRIVE_FOLDER_ID=...
 *   credenciais da conta de serviço
 *
 * Uso:
 *   node scripts/migrate-uploads-to-drive.mjs
 *   node scripts/migrate-uploads-to-drive.mjs --dry-run
 *   node scripts/migrate-uploads-to-drive.mjs --delete-local
 */
import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

import { closeDb, openDb } from "../server/db.js";
import {
  assertDriveConfigured,
  isDriveStorageEnabled,
  uploadLocalFileToDrive,
} from "../server/driveStorage.js";

const root = process.cwd();
dotenv.config({ path: path.join(root, ".env") });
dotenv.config({ path: path.join(root, ".env.local"), override: true });

const argv = new Set(process.argv.slice(2));
const dryRun = argv.has("--dry-run");
const deleteLocal = argv.has("--delete-local");

const uploadDir = process.env.ICER_UPLOAD_DIR
  ? path.resolve(process.env.ICER_UPLOAD_DIR)
  : path.resolve(root, "server", "uploads");

function resolveUploadedDiskPath(row) {
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

if (!isDriveStorageEnabled()) {
  console.error("Defina ICER_STORAGE=drive no .env antes de migrar.");
  process.exit(1);
}

try {
  assertDriveConfigured();
} catch (err) {
  console.error(err?.message || err);
  process.exit(1);
}

const db = await openDb();
const rows = await db.collection("files").find({}).toArray();

let uploaded = 0;
let skipped = 0;
let missing = 0;
let failed = 0;

console.log(`[drive] ${rows.length} registo(s) em files (${uploadDir})`);

for (const row of rows) {
  if (String(row.drive_file_id || "").trim()) {
    skipped += 1;
    continue;
  }
  const diskPath = resolveUploadedDiskPath(row);
  if (!diskPath) {
    missing += 1;
    console.warn(`  missing id=${row.id}: ${row.original_name || row.storage_path}`);
    continue;
  }
  const name = `icer-${row.id}-${row.original_name || path.basename(diskPath)}`;
  if (dryRun) {
    console.log(`  dry-run id=${row.id}: ${diskPath} → ${name}`);
    continue;
  }
  try {
    const uploadedFile = await uploadLocalFileToDrive({
      filePath: diskPath,
      name,
      mimeType: row.mime || "application/octet-stream",
    });
    await db.collection("files").updateOne(
      { id: row.id },
      {
        $set: {
          storage: "drive",
          drive_file_id: uploadedFile.id,
          storage_path: deleteLocal ? null : diskPath,
          drive_migrated_at: new Date().toISOString(),
        },
      },
    );
    if (deleteLocal) {
      try {
        fs.unlinkSync(diskPath);
      } catch {
        /* ignore */
      }
    }
    uploaded += 1;
    console.log(`  ok id=${row.id}: ${uploadedFile.id}`);
  } catch (err) {
    failed += 1;
    console.error(`  erro id=${row.id}: ${err?.message || err}`);
  }
}

await closeDb();
console.log(
  `[drive] uploaded=${uploaded} skipped=${skipped} missing=${missing} failed=${failed}${dryRun ? " (dry-run)" : ""}`,
);
if (failed > 0) process.exit(1);
