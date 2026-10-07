import fs from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import unzipper from "unzipper";

const SKIP_BASENAMES = new Set([
  ".ds_store",
  "thumbs.db",
  "desktop.ini",
  "_cache",
  "_incoming",
]);

/**
 * @param {string} destDir
 * @returns {Map<string, string>} basename em minúsculas → caminho absoluto
 */
export function indexRestoredUploadFiles(destDir) {
  const destRoot = path.resolve(destDir);
  /** @type {Map<string, string>} */
  const map = new Map();
  if (!fs.existsSync(destRoot)) return map;
  for (const name of fs.readdirSync(destRoot)) {
    const lower = name.toLowerCase();
    if (!name || SKIP_BASENAMES.has(lower)) continue;
    const full = path.join(destRoot, name);
    let st;
    try {
      st = fs.statSync(full);
    } catch {
      continue;
    }
    if (!st.isFile()) continue;
    map.set(lower, full);
  }
  return map;
}

/**
 * Nomes possíveis no ZIP / pasta restaurada para um registo `files`.
 * @param {Record<string, unknown>} row
 * @returns {string[]}
 */
export function restoredNameCandidates(row) {
  const names = [];
  const storageBase = path.basename(String(row?.storage_path || "").trim());
  const original = path.basename(String(row?.original_name || "").trim());
  const id = row?.id;
  if (storageBase && storageBase !== "." && storageBase !== "..") {
    names.push(storageBase);
  }
  if (original && original !== "." && original !== "..") {
    names.push(original);
  }
  if (id != null && String(id).trim() !== "") {
    names.push(`icer-${id}-${original}`);
    names.push(String(id));
  }
  return names.filter(Boolean);
}

/**
 * Encontra o ficheiro restaurado que corresponde a um registo Mongo.
 * @param {Record<string, unknown>} row
 * @param {Map<string, string>} onDisk
 */
export function matchRestoredFile(row, onDisk) {
  if (!(onDisk instanceof Map) || onDisk.size === 0) return null;
  const id = row?.id;
  if (id != null) {
    const prefix = `icer-${id}-`.toLowerCase();
    for (const [base, full] of onDisk) {
      if (base.startsWith(prefix)) return full;
    }
  }
  for (const name of restoredNameCandidates(row)) {
    const hit = onDisk.get(name.toLowerCase());
    if (hit) return hit;
  }
  return null;
}

/**
 * Actualiza `storage_path` dos registos `files` para os ficheiros extraídos.
 * @param {import("mongodb").Db} db
 * @param {string} destDir
 * @returns {Promise<{ rematched: number }>}
 */
export async function relinkRestoredUploads(db, destDir) {
  const onDisk = indexRestoredUploadFiles(destDir);
  if (onDisk.size === 0) return { rematched: 0 };
  const rows = await db
    .collection("files")
    .find({
      $or: [
        { deleted_at: { $exists: false } },
        { deleted_at: null },
        { deleted_at: "" },
      ],
    })
    .toArray();
  let rematched = 0;
  for (const row of rows) {
    const found = matchRestoredFile(row, onDisk);
    if (!found) continue;
    const current = String(row.storage_path || "").trim();
    if (current === found) continue;
    await db.collection("files").updateOne(
      { _id: row._id },
      { $set: { storage_path: found, storage: row.storage || "disk" } },
    );
    rematched += 1;
  }
  return { rematched };
}

/**
 * Extrai um ZIP para `destDir`, usando só o nome do ficheiro (sem pastas).
 * Assim o Mongo continua a encontrar os mesmos nomes que estavam no VPS antigo.
 *
 * @param {string} zipPath
 * @param {string} destDir
 * @returns {Promise<{ written: number; skipped: number }>}
 */
export async function extractUploadsZipToDir(zipPath, destDir) {
  const destRoot = path.resolve(destDir);
  fs.mkdirSync(destRoot, { recursive: true });
  const directory = await unzipper.Open.file(zipPath);
  let written = 0;
  let skipped = 0;

  for (const entry of directory.files) {
    if (entry.type === "Directory") {
      skipped += 1;
      continue;
    }
    const rawPath = String(entry.path || "").replaceAll("\\", "/");
    if (rawPath.startsWith("__MACOSX/") || rawPath.includes("/__MACOSX/")) {
      skipped += 1;
      continue;
    }
    const base = path.basename(rawPath);
    const lower = base.toLowerCase();
    if (!base || base === "." || base === ".." || SKIP_BASENAMES.has(lower)) {
      skipped += 1;
      continue;
    }
    const dest = path.resolve(destRoot, base);
    if (!dest.startsWith(destRoot + path.sep) && dest !== destRoot) {
      skipped += 1;
      continue;
    }
    await pipeline(entry.stream(), fs.createWriteStream(dest));
    written += 1;
  }

  return { written, skipped };
}
