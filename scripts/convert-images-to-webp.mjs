/**
 * Converte imagens raster (JPG/PNG/…) para WebP.
 *
 * Uso local (assets estáticos em public/):
 *   npm run images:webp:public
 *
 * Servidor / produção (uploads + MongoDB):
 *   npm run images:webp:uploads
 *
 * Ambos:
 *   npm run images:webp
 *
 * Opções:
 *   --public    só public/
 *   --uploads   só server/uploads (ou ICER_UPLOAD_DIR)
 *   --all       public + uploads (predefinido se nenhum modo)
 *   --force     reconverte mesmo que o .webp seja mais recente
 *   --dry-run   lista o que faria, sem escrever
 */
import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

import { openDb, closeDb } from "../server/db.js";
import {
  convertImageFileToWebp,
  isConvertibleRasterMime,
  isConvertibleRasterPath,
  listConvertibleRasterFiles,
  loadSharp,
  replaceFileWithWebp,
  replaceNameExtensionToWebp,
  webpPathFor,
} from "../server/imageWebp.js";

const root = process.cwd();
dotenv.config({ path: path.join(root, ".env") });
dotenv.config({ path: path.join(root, ".env.local"), override: true });

const argv = new Set(process.argv.slice(2));
const force = argv.has("--force");
const dryRun = argv.has("--dry-run");
const explicitPublic = argv.has("--public");
const explicitUploads = argv.has("--uploads");
const runAll = argv.has("--all") || (!explicitPublic && !explicitUploads);
const runPublic = explicitPublic || runAll;
const runUploads = explicitUploads || runAll;

const uploadDir = process.env.ICER_UPLOAD_DIR
  ? path.resolve(process.env.ICER_UPLOAD_DIR)
  : path.resolve(root, "server", "uploads");

function resolveUploadedDiskPath(row, baseUploadDir) {
  const legacy =
    row?.storage_path != null ? String(row.storage_path).trim() : "";
  if (legacy && fs.existsSync(legacy)) return legacy;
  const base =
    legacy && path.basename(legacy) !== "." && path.basename(legacy) !== ".."
      ? path.basename(legacy)
      : "";
  if (!base) return null;
  const candidate = path.join(baseUploadDir, base);
  return fs.existsSync(candidate) ? candidate : null;
}

/**
 * @param {import("sharp").Sharp} sharp
 */
async function convertPublicAssets(sharp) {
  const publicDir = path.join(root, "public");
  const files = listConvertibleRasterFiles(publicDir);
  let converted = 0;
  let skipped = 0;
  let failed = 0;

  console.log(`[public] ${files.length} imagem(ns) em ${publicDir}`);

  for (const inputPath of files) {
    const outputPath = webpPathFor(inputPath);
    const relIn = path.relative(root, inputPath);
    const relOut = path.relative(root, outputPath);
    if (dryRun) {
      console.log(`  dry-run: ${relIn} → ${relOut}`);
      continue;
    }
    try {
      const result = await convertImageFileToWebp(sharp, inputPath, outputPath, {
        force,
      });
      if (result.skipped) {
        skipped += 1;
        console.log(`  skip: ${relOut}`);
      } else {
        converted += 1;
        const kb = (result.bytes / 1024).toFixed(1);
        console.log(`  ok: ${relIn} → ${relOut} (${kb} KB)`);
      }
    } catch (err) {
      failed += 1;
      console.error(`  erro: ${relIn}: ${err?.message || err}`);
    }
  }

  return { converted, skipped, failed, total: files.length };
}

/**
 * @param {import("mongodb").Db} db
 * @param {import("sharp").Sharp} sharp
 */
async function convertUploadAssets(db, sharp) {
  const rows = await db
    .collection("files")
    .find({}, { projection: { _id: 0 } })
    .toArray();

  let converted = 0;
  let skipped = 0;
  let failed = 0;
  let missing = 0;

  console.log(`[uploads] ${rows.length} registo(s) em files (${uploadDir})`);

  for (const row of rows) {
    if (!isConvertibleRasterMime(row.mime, row.original_name)) {
      skipped += 1;
      continue;
    }
    if (String(row.mime || "").toLowerCase() === "image/webp") {
      skipped += 1;
      continue;
    }

    const diskPath = resolveUploadedDiskPath(row, uploadDir);
    if (String(row.drive_file_id || "").trim() && !diskPath) {
      skipped += 1;
      console.log(`  skip id=${row.id}: já está no Google Drive`);
      continue;
    }
    if (!diskPath) {
      missing += 1;
      console.warn(`  missing id=${row.id}: ${row.original_name || row.storage_path}`);
      continue;
    }

    if (dryRun) {
      console.log(`  dry-run id=${row.id}: ${diskPath} → webp`);
      continue;
    }

    try {
      const webpPath = await replaceFileWithWebp(sharp, diskPath);
      const size = fs.statSync(webpPath).size;
      const nextName = replaceNameExtensionToWebp(row.original_name);
      await db.collection("files").updateOne(
        { id: row.id },
        {
          $set: {
            storage_path: webpPath,
            mime: "image/webp",
            size,
            original_name: nextName,
            webp_converted_at: new Date().toISOString(),
          },
        },
      );
      converted += 1;
      console.log(`  ok id=${row.id}: ${nextName} (${(size / 1024).toFixed(1)} KB)`);
    } catch (err) {
      failed += 1;
      console.error(`  erro id=${row.id}: ${err?.message || err}`);
    }
  }

  return { converted, skipped, failed, missing, total: rows.length };
}

const sharp = await loadSharp();
if (!sharp) {
  console.error("sharp não está instalado. Execute: npm install");
  process.exit(1);
}

/** @type {Record<string, unknown>} */
const summary = {};

if (runPublic) {
  summary.public = await convertPublicAssets(sharp);
}

if (runUploads) {
  let db;
  try {
    db = await openDb();
    summary.uploads = await convertUploadAssets(db, sharp);
  } finally {
    if (db) await closeDb();
  }
}

console.log("\nResumo:");
console.log(JSON.stringify(summary, null, 2));

const anyFailed =
  (summary.public?.failed ?? 0) > 0 || (summary.uploads?.failed ?? 0) > 0;
process.exit(anyFailed ? 1 : 0);
