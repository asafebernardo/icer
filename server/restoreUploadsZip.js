import fs from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import unzipper from "unzipper";

import { isDeletedRow, restoreSoftDeleteFields } from "./softDelete.js";

const SKIP_BASENAMES = new Set([
  ".ds_store",
  "thumbs.db",
  "desktop.ini",
  "_cache",
  "_incoming",
]);

const MIME_BY_EXT = {
  avif: "image/avif",
  gif: "image/gif",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  png: "image/png",
  svg: "image/svg+xml",
  webp: "image/webp",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

/**
 * @param {string} destDir
 * @returns {Map<string, string>} basename em minúsculas → caminho absoluto
 */
export function indexRestoredUploadFiles(destDir) {
  const destRoot = path.resolve(destDir);
  /** @type {Map<string, string>} */
  const map = new Map();
  if (!fs.existsSync(destRoot)) return map;

  const walk = (dir) => {
    let names = [];
    try {
      names = fs.readdirSync(dir);
    } catch {
      return;
    }
    for (const name of names) {
      const lower = name.toLowerCase();
      if (!name || SKIP_BASENAMES.has(lower)) continue;
      const full = path.join(dir, name);
      let st;
      try {
        st = fs.statSync(full);
      } catch {
        continue;
      }
      if (st.isDirectory()) {
        walk(full);
        continue;
      }
      if (!st.isFile() || st.size <= 0) continue;
      map.set(lower, full);
    }
  };

  walk(destRoot);
  return map;
}

function fileStem(name) {
  const base = path.basename(String(name || "").trim());
  if (!base || base === "." || base === "..") return "";
  const i = base.lastIndexOf(".");
  return (i > 0 ? base.slice(0, i) : base).toLowerCase();
}

/** Compara «Culto de Jovens.jpg» com «culto-de-jovens.webp». */
export function normalizeRestoreNameKey(name) {
  return String(name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

const FILE_URL_RE = /\/api\/files\/(\d+)/g;

/**
 * Recolhe nomes ligados a cada `/api/files/:id` (anexo.name, título do post/evento, etc.).
 * @param {unknown} value
 * @param {Map<number, Set<string>>} [into]
 * @returns {Map<number, Set<string>>}
 */
export function collectFileNameHintsFromValue(value, into = new Map()) {
  const add = (id, name) => {
    const n = Number(id);
    if (!Number.isFinite(n) || n <= 0) return;
    const label = String(name || "").trim();
    if (!label || /^\d+$/.test(label)) return;
    let set = into.get(n);
    if (!set) {
      set = new Set();
      into.set(n, set);
    }
    set.add(label);
  };

  const visit = (node, inherited) => {
    if (node == null) return;
    if (typeof node === "string") {
      FILE_URL_RE.lastIndex = 0;
      let m;
      while ((m = FILE_URL_RE.exec(node))) {
        for (const name of inherited) add(m[1], name);
      }
      return;
    }
    if (typeof node !== "object") return;
    if (Array.isArray(node)) {
      for (const item of node) visit(item, inherited);
      return;
    }
    const names = [...inherited];
    for (const key of ["name", "original_name", "filename", "titulo", "title", "nome"]) {
      const v = node[key];
      if (typeof v === "string" && v.trim()) names.push(v.trim());
    }
    for (const v of Object.values(node)) visit(v, names);
  };

  visit(value, []);
  return into;
}

/**
 * @param {import("mongodb").Db} db
 * @returns {Promise<Map<number, Set<string>>>}
 */
export async function collectFileNameHintsFromDb(db) {
  const into = new Map();
  const collections = ["posts", "eventos", "materiais", "fotos_galeria"];
  for (const name of collections) {
    const rows = await db
      .collection(name)
      .find({}, { projection: { body_json: 1 } })
      .toArray();
    for (const row of rows) {
      let body = {};
      try {
        body = JSON.parse(String(row.body_json || "{}"));
      } catch {
        body = {};
      }
      collectFileNameHintsFromValue(body, into);
    }
  }
  const users = await db
    .collection("users")
    .find({ avatar_url: { $exists: true } }, { projection: { avatar_url: 1, full_name: 1 } })
    .toArray();
  for (const u of users) {
    collectFileNameHintsFromValue({ name: u.full_name, url: u.avatar_url }, into);
  }
  const kvRows = await db.collection("app_kv").find({}).project({ value: 1 }).toArray();
  for (const kv of kvRows) {
    collectFileNameHintsFromValue(kv.value, into);
  }
  return into;
}

function guessMimeFromName(name) {
  const ext = path.extname(String(name || "")).slice(1).toLowerCase();
  return MIME_BY_EXT[ext] || "application/octet-stream";
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
 * @param {Iterable<string>} [extraNames] nomes do post/evento (anexo.name, título)
 */
export function matchRestoredFile(row, onDisk, extraNames = []) {
  if (!(onDisk instanceof Map) || onDisk.size === 0) return null;
  const id = row?.id;
  if (id != null) {
    const prefix = `icer-${id}-`.toLowerCase();
    for (const [base, full] of onDisk) {
      if (base.startsWith(prefix)) return full;
    }
  }
  const candidates = [
    ...restoredNameCandidates(row),
    ...Array.from(extraNames || [], (n) => String(n || "").trim()).filter(Boolean),
  ];
  for (const name of candidates) {
    const base = path.basename(name);
    if (!base || base === "." || base === "..") continue;
    const hit = onDisk.get(base.toLowerCase());
    if (hit) return hit;
  }

  /** @type {Map<string, string[]>} */
  const byStem = new Map();
  /** @type {Map<string, string[]>} */
  const byNorm = new Map();
  for (const [base, full] of onDisk) {
    const stem = fileStem(base);
    if (stem.length >= 3) {
      const list = byStem.get(stem) || [];
      list.push(full);
      byStem.set(stem, list);
    }
    const norm = normalizeRestoreNameKey(stem || base);
    if (norm.length >= 6) {
      const list = byNorm.get(norm) || [];
      list.push(full);
      byNorm.set(norm, list);
    }
  }
  for (const name of candidates) {
    const stem = fileStem(name);
    if (stem.length >= 3) {
      const list = byStem.get(stem);
      if (list?.length === 1) return list[0];
    }
    const norm = normalizeRestoreNameKey(stem || name);
    if (norm.length >= 6) {
      const list = byNorm.get(norm);
      if (list?.length === 1) return list[0];
    }
  }
  return null;
}

/**
 * Actualiza `storage_path` dos registos `files` para os ficheiros extraídos.
 * Recupera também ficheiros marcados para exclusão se o ZIP os trouxer de volta.
 * @param {import("mongodb").Db} db
 * @param {string} destDir
 * @param {Map<number, Set<string>>} [hintsById]
 * @returns {Promise<{ rematched: number; restored: number; matchedPaths: string[] }>}
 */
export async function relinkRestoredUploads(db, destDir, hintsById = new Map()) {
  const onDisk = indexRestoredUploadFiles(destDir);
  if (onDisk.size === 0) return { rematched: 0, restored: 0, matchedPaths: [] };
  const rows = await db.collection("files").find({}).toArray();
  let rematched = 0;
  let restored = 0;
  /** @type {string[]} */
  const matchedPaths = [];
  for (const row of rows) {
    const extra = hintsById.get(Number(row.id)) || hintsById.get(row.id) || [];
    const found = matchRestoredFile(row, onDisk, extra);
    if (!found) continue;
    const current = String(row.storage_path || "").trim();
    const wasDeleted = isDeletedRow(row);
    const patch = {
      storage_path: found,
      storage: "disk",
      drive_file_id: null,
    };
    if (wasDeleted) {
      Object.assign(patch, restoreSoftDeleteFields());
    }
    if (current !== found || wasDeleted || row.storage !== "disk" || row.drive_file_id) {
      await db.collection("files").updateOne({ _id: row._id }, { $set: patch });
    }
    rematched += 1;
    if (wasDeleted) restored += 1;
    matchedPaths.push(path.resolve(found));
  }
  return { rematched, restored, matchedPaths };
}

/**
 * Cria registos para ficheiros do ZIP que não coincidem com nenhum `files` existente.
 * @param {import("mongodb").Db} db
 * @param {string} destDir
 * @param {{
 *   ownerUserId?: number | null;
 *   matchedPaths?: string[];
 *   nextId: () => Promise<number>;
 *   nowIso: () => string;
 * }} options
 */
export async function registerUnmatchedRestoredUploads(db, destDir, options) {
  const onDisk = indexRestoredUploadFiles(destDir);
  const used = new Set(
    (options.matchedPaths || []).map((p) => path.resolve(String(p))),
  );
  let created = 0;
  /** @type {Array<{ id: number; path: string; original_name: string; mime: string }>} */
  const rows = [];
  const publicRead =
    String(process.env.ICER_FILE_PUBLIC_READ || "true").toLowerCase() !== "false";
  for (const [, full] of onDisk) {
    const abs = path.resolve(full);
    if (used.has(abs)) continue;
    let st;
    try {
      st = fs.statSync(abs);
    } catch {
      continue;
    }
    if (!st.isFile() || st.size <= 0) continue;
    const originalName = path.basename(abs);
    const id = await options.nextId();
    const mime = guessMimeFromName(originalName);
    await db.collection("files").insertOne({
      id,
      owner_user_id: options.ownerUserId ?? null,
      original_name: originalName,
      mime,
      size: st.size,
      storage: "disk",
      storage_path: abs,
      drive_file_id: null,
      created_at: options.nowIso(),
      public: publicRead,
    });
    created += 1;
    used.add(abs);
    rows.push({ id, path: abs, original_name: originalName, mime });
  }
  return { created, rows };
}

/**
 * @param {import("mongodb").Db} db
 * @param {string} destDir
 * @param {{
 *   ownerUserId?: number | null;
 *   nextId: () => Promise<number>;
 *   nowIso: () => string;
 * }} options
 */
export async function applyRestoredUploads(db, destDir, options) {
  const hints = await collectFileNameHintsFromDb(db);
  const linked = await relinkRestoredUploads(db, destDir, hints);
  const extra = await registerUnmatchedRestoredUploads(db, destDir, {
    ownerUserId: options.ownerUserId,
    matchedPaths: linked.matchedPaths,
    nextId: options.nextId,
    nowIso: options.nowIso,
  });
  return {
    rematched: linked.rematched,
    restored: linked.restored,
    created: extra.created,
  };
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
    const rawPath = String(entry.path || "").replaceAll("\\", "/");
    const looksDir =
      entry.type === "Directory" || rawPath.endsWith("/") || rawPath.endsWith("\\");
    if (looksDir) {
      skipped += 1;
      continue;
    }
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
    let size = 0;
    try {
      size = fs.statSync(dest).size;
    } catch {
      size = 0;
    }
    if (size <= 0) {
      try {
        fs.unlinkSync(dest);
      } catch {
        /* ignore */
      }
      skipped += 1;
      continue;
    }
    written += 1;
  }

  return { written, skipped };
}
