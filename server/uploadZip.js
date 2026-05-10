import fs from "node:fs";
import path from "node:path";
import archiver from "archiver";
import AdmZip from "adm-zip";

/**
 * @param {string} baseDir
 * @param {string} targetPath
 */
export function isPathInsideDir(baseDir, targetPath) {
  const base = path.resolve(baseDir);
  const target = path.resolve(targetPath);
  const rel = path.relative(base, target);
  if (rel === "") return true;
  return !rel.startsWith("..") && !path.isAbsolute(rel);
}

/**
 * Extrai um ZIP para `uploadDir`, ignorando entradas inseguras (zip slip).
 * @param {string} zipPath — ficheiro ZIP no disco
 * @param {string} uploadDir — pasta de uploads (destino)
 * @returns {{ written: number; skipped: number; entries: number }}
 */
export function extractUploadZipFromFile(zipPath, uploadDir) {
  const uploadResolved = path.resolve(uploadDir);
  const zip = new AdmZip(zipPath);
  const entries = zip.getEntries();
  let written = 0;
  let skipped = 0;

  for (const entry of entries) {
    if (entry.isDirectory) continue;
    let name = String(entry.entryName || "")
      .replace(/\\/g, "/")
      .replace(/^\/+/, "");
    if (!name || name.includes("..")) {
      skipped += 1;
      continue;
    }
    const dest = path.resolve(uploadResolved, name);
    if (!isPathInsideDir(uploadResolved, dest)) {
      skipped += 1;
      continue;
    }
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, entry.getData());
    written += 1;
  }

  return {
    written,
    skipped,
    entries: entries.filter((e) => !e.isDirectory).length,
  };
}

/**
 * Envia um ZIP com o conteúdo de `uploadDir` (ficheiros no nível raiz do arquivo).
 * @param {string} uploadDir
 * @param {import("express").Response} res
 * @returns {Promise<void>}
 */
export function pipeUploadDirToZipResponse(uploadDir, res) {
  const safeName = `icer-uploads-${Date.now()}.zip`.replace(/[^\w.\-]/g, "_");
  res.setHeader("Content-Type", "application/zip");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(safeName)}`,
  );
  res.setHeader("Cache-Control", "no-store");

  const archive = archiver("zip", { zlib: { level: 6 } });

  return new Promise((resolve, reject) => {
    archive.on("error", reject);
    archive.on("warning", (err) => {
      if (err.code !== "ENOENT") reject(err);
    });
    res.on("error", reject);
    archive.pipe(res);

    try {
      if (fs.existsSync(uploadDir)) {
        const st = fs.statSync(uploadDir);
        if (st.isDirectory()) {
          archive.directory(uploadDir, false);
        }
      }
    } catch (e) {
      reject(e);
      return;
    }

    archive.finalize().then(resolve).catch(reject);
  });
}
