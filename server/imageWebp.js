import fs from "node:fs";
import path from "node:path";

export const WEBP_QUALITY = (() => {
  const n = Number(process.env.ICER_WEBP_QUALITY);
  return Number.isFinite(n) && n >= 1 && n <= 100 ? Math.floor(n) : 82;
})();

const CONVERTIBLE_EXT = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".tif",
  ".tiff",
  ".bmp",
]);

/**
 * @param {string} filePath
 */
export function isConvertibleRasterPath(filePath) {
  const ext = path.extname(String(filePath || "")).toLowerCase();
  if (ext === ".webp") return false;
  return CONVERTIBLE_EXT.has(ext);
}

/**
 * @param {string} [mime]
 * @param {string} [name]
 */
export function isConvertibleRasterMime(mime, name = "") {
  const m = String(mime || "").toLowerCase();
  if (!m.startsWith("image/")) return false;
  if (/svg|gif|webp/.test(m)) return false;
  const ext = path.extname(String(name || "")).toLowerCase();
  if (ext === ".svg" || ext === ".gif" || ext === ".webp") return false;
  if (CONVERTIBLE_EXT.has(ext)) return true;
  return /jpeg|jpg|png|tiff|bmp/.test(m);
}

/**
 * @param {string} sourcePath
 */
export function webpPathFor(sourcePath) {
  const parsed = path.parse(sourcePath);
  return path.join(parsed.dir, `${parsed.name}.webp`);
}

/**
 * @returns {Promise<import("sharp").Sharp | null>}
 */
export async function loadSharp() {
  try {
    const mod = await import("sharp");
    return mod.default || mod;
  } catch {
    return null;
  }
}

/**
 * @param {import("sharp").Sharp} sharp
 * @param {string} inputPath
 * @param {string} outputPath
 * @param {{ quality?: number; force?: boolean }} [opts]
 */
export async function convertImageFileToWebp(
  sharp,
  inputPath,
  outputPath,
  opts = {},
) {
  if (!sharp) throw new Error("sharp indisponível");
  if (!fs.existsSync(inputPath)) {
    throw new Error(`ficheiro não encontrado: ${inputPath}`);
  }
  const quality = opts.quality ?? WEBP_QUALITY;
  const force = opts.force === true;
  if (!force && fs.existsSync(outputPath)) {
    const srcM = fs.statSync(inputPath).mtimeMs;
    const outM = fs.statSync(outputPath).mtimeMs;
    if (outM >= srcM) {
      return { skipped: true, outputPath, bytes: fs.statSync(outputPath).size };
    }
  }
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  await sharp(inputPath, { failOn: "none" })
    .webp({ quality, effort: 4 })
    .toFile(outputPath);
  const bytes = fs.statSync(outputPath).size;
  return { skipped: false, outputPath, bytes };
}

/**
 * Converte para `.webp` no mesmo directório e remove o original (se diferente).
 *
 * @param {import("sharp").Sharp} sharp
 * @param {string} inputPath
 * @param {{ quality?: number }} [opts]
 * @returns {Promise<string>} caminho final `.webp`
 */
export async function replaceFileWithWebp(sharp, inputPath, opts = {}) {
  const outputPath = webpPathFor(inputPath);
  await convertImageFileToWebp(sharp, inputPath, outputPath, {
    ...opts,
    force: true,
  });
  if (path.resolve(inputPath) !== path.resolve(outputPath) && fs.existsSync(inputPath)) {
    fs.unlinkSync(inputPath);
  }
  return outputPath;
}

/**
 * @param {string} originalName
 */
export function replaceNameExtensionToWebp(originalName) {
  const raw = String(originalName || "file").trim() || "file";
  const parsed = path.parse(raw);
  const base = parsed.name || "file";
  return `${base}.webp`;
}

/**
 * Percorre recursivamente `dir` e devolve ficheiros raster convertíveis.
 *
 * @param {string} dir
 * @param {string[]} [acc]
 */
export function listConvertibleRasterFiles(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "_cache" || entry.name === "node_modules") continue;
      listConvertibleRasterFiles(full, acc);
      continue;
    }
    if (entry.isFile() && isConvertibleRasterPath(full)) {
      acc.push(full);
    }
  }
  return acc;
}
