import fs from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import unzipper from "unzipper";

const SKIP_BASENAMES = new Set([
  ".ds_store",
  "thumbs.db",
  "desktop.ini",
  "_cache",
]);

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
