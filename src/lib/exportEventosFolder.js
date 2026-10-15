import {
  POST_FEED_SECTION_LABELS,
  resolvePostCategoria,
} from "@/lib/postCategories";
import { getYouTubeId, normalizePost } from "@/lib/posts";
import { zipStore } from "@/lib/zipStore";

const ROOT_NAME = "ICER Eventos";

const README = `Cada pasta é um post de Eventos.

Dentro dela estão as imagens e o ficheiro dados.txt (título, data, categoria e texto).

No Google Fotos, crie um álbum e envie as imagens dessa pasta. O dados.txt fica no computador: o Google Fotos não publica esse texto como legenda.
`;

function plainText(value) {
  return String(value || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function formatPostDate(raw) {
  const s = String(raw || "").trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return s || "—";
}

function datePrefix(raw) {
  const m = String(raw || "").trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : "";
}

export function safeFolderSegment(value, fallback = "post") {
  const cleaned = String(value || "")
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[. ]+$/g, "");
  return (cleaned || fallback).slice(0, 80);
}

function categoryLabel(post) {
  const cat = resolvePostCategoria(post);
  if (!cat) return "";
  return POST_FEED_SECTION_LABELS[cat] || cat;
}

/** Imagens do post, sem repetir URL e sem vídeos do YouTube. */
export function listPostExportImages(post) {
  const p = normalizePost(post);
  /** @type {{ url: string, section: string }[]} */
  const out = [];
  const seen = new Set();
  const add = (url, section) => {
    const u = String(url || "").trim();
    if (!u || seen.has(u) || getYouTubeId(u)) return;
    seen.add(u);
    out.push({ url: u, section: String(section || "").trim() });
  };

  const anexos = Array.isArray(p.anexos) ? p.anexos : [];
  let fromAnexos = 0;
  for (const anexo of anexos) {
    if (
      anexo?.url &&
      typeof anexo.mime === "string" &&
      anexo.mime.startsWith("image/")
    ) {
      add(anexo.url, "");
      fromAnexos += 1;
    }
  }
  if (fromAnexos === 0) {
    for (const url of p.imagens_urls || []) add(url, "");
  }
  for (const day of p.dias_galeria || []) {
    const section = day.titulo || day.data_dia || "Secção";
    for (const url of day.imagens_urls || []) add(url, section);
  }
  if (p.imagem_destaque_url) add(p.imagem_destaque_url, "Destaque");
  return out;
}

export function buildPostFolderName(post, used) {
  const p = normalizePost(post);
  const prefix = datePrefix(p.data_publicacao);
  const title = safeFolderSegment(p.titulo, `post-${p.id || "sem-titulo"}`);
  const base = safeFolderSegment(prefix ? `${prefix} ${title}` : title, "post");
  let name = base;
  let n = 2;
  while (used.has(name.toLowerCase())) {
    const suffix = ` (${n})`;
    name = `${base.slice(0, Math.max(1, 80 - suffix.length))}${suffix}`;
    n += 1;
  }
  used.add(name.toLowerCase());
  return name;
}

function buildDadosText(post, imageLines) {
  const p = normalizePost(post);
  const lines = [
    `Título: ${p.titulo || "Sem título"}`,
    `Data: ${formatPostDate(p.data_publicacao)}`,
    `Categoria: ${categoryLabel(p) || "—"}`,
  ];
  if (String(p.autor || "").trim()) lines.push(`Autor: ${p.autor}`);
  lines.push("", "Texto:", plainText(p.descricao) || "—", "", "Imagens:");
  if (imageLines.length === 0) lines.push("- (nenhuma imagem)");
  else lines.push(...imageLines);
  return `${lines.join("\n")}\n`;
}

function extensionFor(blob, url) {
  const type = String(blob?.type || "").toLowerCase();
  if (type === "image/jpeg") return "jpg";
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  if (type === "image/gif") return "gif";
  if (type === "image/avif") return "avif";
  const match = String(url || "").match(/\.([a-z0-9]{2,5})(?:$|\?)/i);
  const ext = match ? match[1].toLowerCase() : "";
  if (["jpg", "jpeg", "png", "webp", "gif", "avif", "heic"].includes(ext)) {
    return ext === "jpeg" ? "jpg" : ext;
  }
  return "jpg";
}

async function fetchImage(url) {
  const response = await fetch(url, { credentials: "include" });
  if (!response.ok) throw new Error(String(response.status));
  const blob = await response.blob();
  if (blob.size === 0) throw new Error("vazio");
  return blob;
}

/**
 * @param {object[]} posts
 * @param {{ onProgress?: (info: { done: number, total: number, title: string }) => void }} [opts]
 */
async function preparePosts(posts, opts = {}) {
  const list = Array.isArray(posts) ? posts : [];
  const used = new Set();
  /** @type {{ folder: string, dados: string, images: { name: string, blob: Blob }[], missing: string[] }[]} */
  const prepared = [];
  for (let i = 0; i < list.length; i += 1) {
    const post = normalizePost(list[i]);
    const title = post.titulo || "Sem título";
    opts.onProgress?.({ done: i, total: list.length, title });
    const folder = buildPostFolderName(post, used);
    const sources = listPostExportImages(post);
    /** @type {{ name: string, blob: Blob }[]} */
    const images = [];
    /** @type {string[]} */
    const missing = [];
    const imageLines = [];
    for (let n = 0; n < sources.length; n += 1) {
      const source = sources[n];
      try {
        const blob = await fetchImage(source.url);
        const ext = extensionFor(blob, source.url);
        const name = `${String(n + 1).padStart(2, "0")}.${ext}`;
        images.push({ name, blob });
        imageLines.push(
          `- ${name}${source.section ? ` (${source.section})` : ""}`,
        );
      } catch {
        missing.push(source.url);
        imageLines.push(
          `- não foi possível guardar${source.section ? ` (${source.section})` : ""}`,
        );
      }
    }
    prepared.push({
      folder,
      dados: buildDadosText(post, imageLines),
      images,
      missing,
    });
  }
  return prepared;
}

async function writeFile(dirHandle, name, data) {
  const handle = await dirHandle.getFileHandle(name, { create: true });
  const writable = await handle.createWritable();
  await writable.write(data);
  await writable.close();
}

/**
 * Grava uma pasta por post dentro de «ICER Eventos».
 * @param {FileSystemDirectoryHandle} dirHandle
 * @param {object[]} posts
 * @param {{ onProgress?: (info: { done: number, total: number, title: string }) => void }} [opts]
 */
export async function saveEventosFolders(dirHandle, posts, opts = {}) {
  const prepared = await preparePosts(posts, opts);
  const root = await dirHandle.getDirectoryHandle(ROOT_NAME, { create: true });
  await writeFile(root, "leia-me.txt", README);
  let images = 0;
  for (const post of prepared) {
    const folder = await root.getDirectoryHandle(post.folder, { create: true });
    await writeFile(folder, "dados.txt", post.dados);
    for (const image of post.images) {
      await writeFile(folder, image.name, image.blob);
      images += 1;
    }
  }
  const missing = prepared.reduce((sum, post) => sum + post.missing.length, 0);
  return { posts: prepared.length, images, missing };
}

/**
 * Descarrega um ZIP com a mesma estrutura, quando o browser não deixa escolher uma pasta.
 * @param {object[]} posts
 * @param {{ onProgress?: (info: { done: number, total: number, title: string }) => void }} [opts]
 */
export async function downloadEventosZip(posts, opts = {}) {
  const prepared = await preparePosts(posts, opts);
  const encoder = new TextEncoder();
  /** @type {{ name: string, data: Uint8Array }[]} */
  const files = [{ name: `${ROOT_NAME}/leia-me.txt`, data: encoder.encode(README) }];
  let images = 0;
  let missing = 0;
  for (const post of prepared) {
    files.push({
      name: `${ROOT_NAME}/${post.folder}/dados.txt`,
      data: encoder.encode(post.dados),
    });
    for (const image of post.images) {
      const bytes = new Uint8Array(await image.blob.arrayBuffer());
      files.push({
        name: `${ROOT_NAME}/${post.folder}/${image.name}`,
        data: bytes,
      });
      images += 1;
    }
    missing += post.missing.length;
  }
  const blob = zipStore(files);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "icer-eventos-google-fotos.zip";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return { posts: prepared.length, images, missing };
}
