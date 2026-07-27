export function normalizeTagKey(raw) {
  return String(raw || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export const POST_DEMO_EXAMPLE_TAG = "exemplo";
export const POST_EXAMPLES_SEED_TAG = "post_examples_v1";

/** Post gerado pelo seed de demonstração (`tags: exemplo` ou `_seed_tag`). */
export function isPostDemoExample(post) {
  const raw = post && typeof post === "object" ? post : {};
  if (raw._seed_tag === POST_EXAMPLES_SEED_TAG) return true;
  const p = normalizePost(post);
  if (p._seed_tag === POST_EXAMPLES_SEED_TAG) return true;
  const tags = Array.isArray(p.tags) ? p.tags : [];
  return tags.some((t) => normalizeTagKey(t) === POST_DEMO_EXAMPLE_TAG);
}

export function dedupeTagsPreserveOrder(list) {
  const seen = new Set();
  const out = [];
  for (const t of Array.isArray(list) ? list : []) {
    const label = String(t || "").trim();
    if (!label) continue;
    const key = normalizeTagKey(label);
    if (!key) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(label);
  }
  return out;
}

export function getYouTubeId(url) {
  if (!url) return null;
  const m = String(url).match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/,
  );
  return m ? m[1] : null;
}

/** Anexo é imagem ou vídeo (para carrossel / galeria misturados). */
export function isVisualAttachmentMime(mime) {
  return (
    typeof mime === "string" &&
    (mime.startsWith("image/") || mime.startsWith("video/"))
  );
}

/**
 * Slides na ordem dos anexos: só `image/*` e `video/*`.
 * @param {unknown[]} anexos
 * @returns {Array<{ kind: 'image' | 'video', url: string } | { kind: 'youtube', videoId: string, url?: string }>}
 */
export function buildSlidesFromAnexos(anexos) {
  const items = Array.isArray(anexos) ? anexos : [];
  const slides = [];
  for (const a of items) {
    if (!a?.url || typeof a.mime !== "string") continue;
    const name = String(a.name || "").trim();
    if (a.mime.startsWith("image/")) {
      slides.push({ kind: "image", url: a.url, ...(name ? { name } : {}) });
    } else if (a.mime.startsWith("video/")) {
      slides.push({ kind: "video", url: a.url, ...(name ? { name } : {}) });
    }
  }
  return slides;
}

/**
 * URLs da secção → slides (mime via anexos; sem match ⇒ imagem).
 * @param {string[]} urls
 * @param {unknown[]} anexos
 */
export function urlsToSlides(urls, anexos) {
  const list = Array.isArray(urls) ? urls.filter(Boolean) : [];
  const ax = Array.isArray(anexos) ? anexos : [];
  return list.map((url) => {
    const a = ax.find((x) => x && x.url === url);
    const name = String(a?.name || "").trim();
    if (a?.mime?.startsWith("video/")) {
      return { kind: "video", url, ...(name ? { name } : {}) };
    }
    return { kind: "image", url, ...(name ? { name } : {}) };
  });
}

/** URLs YouTube externas: `video_urls[]` ou legado `video_url` (string). */
export function normalizeVideoUrlsFromPost(post) {
  const raw = post?.video_urls;
  if (Array.isArray(raw)) {
    return raw.map((u) => String(u || "").trim()).filter(Boolean);
  }
  const single = String(post?.video_url || "").trim();
  return single ? [single] : [];
}

/** Acrescenta slides YouTube (várias URLs) depois dos anexos. */
export function appendYoutubeSlidesFromUrls(slides, urls) {
  let base = Array.isArray(slides) ? [...slides] : [];
  const list = Array.isArray(urls) ? urls : [];
  for (const raw of list) {
    const trimmed = String(raw || "").trim();
    const id = getYouTubeId(trimmed);
    if (!id) continue;
    base.push({ kind: "youtube", videoId: id, url: trimmed, name: "YouTube" });
  }
  return base;
}

/**
 * Legenda do modal de visualização (nome do ficheiro ou nome derivado do URL).
 * @param {{ kind?: string; url?: string; name?: string; videoId?: string } | null | undefined} slide
 */
export function getSlideCaptionLabel(slide) {
  if (!slide || typeof slide !== "object") return "";
  const explicit = String(slide.name || "").trim();
  if (explicit) return explicit;
  if (slide.kind === "youtube") {
    return String(slide.url || "").trim() || "YouTube";
  }
  const url = String(slide.url || "").trim();
  if (!url) return "";
  try {
    const u = new URL(url);
    const leaf = decodeURIComponent(
      u.pathname.split("/").filter(Boolean).pop() || "",
    );
    if (leaf) return leaf;
  } catch {
    const leaf = url.split("/").filter(Boolean).pop();
    if (leaf) {
      try {
        return decodeURIComponent(leaf);
      } catch {
        return leaf;
      }
    }
  }
  return url;
}

/** Acrescenta um slide YouTube (legado: campo único `video_url`). */
export function appendYoutubeSlideIfPresent(slides, videoUrl) {
  const s = String(videoUrl || "").trim();
  return appendYoutubeSlidesFromUrls(slides, s ? [s] : []);
}

/** URLs de imagem e vídeo nos anexos (ordem preservada). */
export function collectVisualMediaUrlsFromAnexos(anexos) {
  const items = Array.isArray(anexos) ? anexos : [];
  const urls = [];
  for (const a of items) {
    if (a?.url && isVisualAttachmentMime(a.mime)) urls.push(a.url);
  }
  return urls;
}

/**
 * Secções da galeria agrupada (cadastro no post): só título + URLs.
 * `data_dia` é opcional e legado (posts antigos).
 * `musica_ambiente`: quando `audio_ambiente_escopo === 'por_secao'`, false desliga música nesta secção.
 * @typedef {{ titulo: string, imagens_urls: string[], data_dia?: string, musica_ambiente?: boolean }} SecaoGaleriaRow
 */

/**
 * @param {unknown} raw
 * @returns {SecaoGaleriaRow[]}
 */
export function normalizeDiasGaleria(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map((row) => ({
    titulo: String(row?.titulo ?? "").trim(),
    imagens_urls: Array.isArray(row?.imagens_urls)
      ? [...new Set(row.imagens_urls.filter(Boolean).map(String))]
      : [],
    data_dia: String(row?.data_dia ?? "")
      .trim()
      .slice(0, 10),
    musica_ambiente: row?.musica_ambiente === false ? false : true,
  }));
}

/** Ano numérico da data de publicação (`data_publicacao` / `created_date`), ou `null`. */
export function getPostPublicationYear(post) {
  const raw = String(
    post?.data_publicacao ?? post?.created_date ?? "",
  ).trim();
  if (!raw) return null;
  const y = Number.parseInt(raw.slice(0, 4), 10);
  return Number.isFinite(y) && y >= 1900 && y <= 2100 ? y : null;
}

/** Data de publicação formatada como dia/mês (ex.: 15/03). */
export function formatPostPublicationDayMonth(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(typeof iso === "string" ? iso : iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    });
  } catch {
    return "—";
  }
}

/** Anos fixos no mosaico por categoria (exceto Notícias). */
export const POST_CATEGORY_YEAR_PRESET_FROM = 2022;
export const POST_CATEGORY_YEAR_PRESET_TO = 2026;

/** @returns {number[]} Anos em ordem decrescente (ex.: 2026 … 2022). */
export function getPostCategoryPresetYears(
  from = POST_CATEGORY_YEAR_PRESET_FROM,
  to = POST_CATEGORY_YEAR_PRESET_TO,
) {
  const start = Math.min(from, to);
  const end = Math.max(from, to);
  const years = [];
  for (let y = end; y >= start; y -= 1) years.push(y);
  return years;
}

export const POST_CATEGORY_PRESET_YEARS = getPostCategoryPresetYears();

/**
 * Agrupa publicações por ano (desc). Sem data → grupo `year: null`.
 * Com `presetYears`, garante um card por ano mesmo sem publicações.
 * @param {object[]} posts
 * @param {{ presetYears?: number[] }} [options]
 * @returns {Array<{ year: number | null, posts: object[] }>}
 */
export function groupPostsByPublicationYear(posts, options = {}) {
  const { presetYears } = options;
  const buckets = new Map();

  for (const raw of Array.isArray(posts) ? posts : []) {
    const year = getPostPublicationYear(normalizePost(raw));
    const key = year ?? "unknown";
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(raw);
  }

  const sortPosts = (items) => sortPostsByPublicationDate(items);

  if (Array.isArray(presetYears) && presetYears.length > 0) {
    const presetSet = new Set(presetYears);
    const result = presetYears.map((year) => ({
      year,
      posts: sortPosts(buckets.get(year) || []),
    }));

    for (const [key, items] of buckets.entries()) {
      if (key === "unknown") continue;
      const y = Number(key);
      if (!presetSet.has(y) && items.length > 0) {
        result.push({ year: y, posts: sortPosts(items) });
      }
    }

    result.sort((a, b) => {
      if (a.year == null) return 1;
      if (b.year == null) return -1;
      return b.year - a.year;
    });

    if (buckets.has("unknown") && buckets.get("unknown").length > 0) {
      result.push({ year: null, posts: sortPosts(buckets.get("unknown")) });
    }

    return result;
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => {
      if (a === "unknown") return 1;
      if (b === "unknown") return -1;
      return Number(b) - Number(a);
    })
    .map(([key, items]) => ({
      year: key === "unknown" ? null : Number(key),
      posts: sortPosts(items),
    }));
}

/** Ordena publicações da mais recente para a mais antiga. */
export function sortPostsByPublicationDate(posts) {
  return [...(Array.isArray(posts) ? posts : [])].sort((a, b) => {
    const da = String(normalizePost(a).data_publicacao || "");
    const db = String(normalizePost(b).data_publicacao || "");
    if (da === db) return 0;
    return da < db ? 1 : -1;
  });
}

/** Publicação principal de um ano (mais recente). */
export function getPrimaryPostForYear(posts) {
  return sortPostsByPublicationDate(posts)[0] ?? null;
}

/** Slug de ano na query `?ano=` (ex.: `2026`, `sem-data`). */
export function postYearToQueryValue(year) {
  return year == null ? "sem-data" : String(year);
}

/** @param {string | null | undefined} raw */
export function parsePostYearQueryValue(raw) {
  const v = String(raw ?? "").trim();
  if (!v) return undefined;
  if (v === "sem-data") return null;
  const y = Number.parseInt(v, 10);
  if (!Number.isFinite(y) || y < 1900 || y > 2100) return undefined;
  return y;
}

/** Categorias que usam mosaico por ano (exceto Informações / notícias). */
export function categoryUsesYearMosaic(catKey) {
  return String(catKey || "").trim().toLowerCase() !== "noticias";
}

export function normalizePost(post) {
  const imagens_urls = Array.isArray(post?.imagens_urls)
    ? post.imagens_urls.filter(Boolean)
    : post?.imagem_url
      ? [post.imagem_url]
      : [];

  const anexos = Array.isArray(post?.anexos)
    ? post.anexos.filter(Boolean)
    : Array.isArray(post?.attachments)
      ? post.attachments.filter(Boolean)
      : [];

  const video_urls = normalizeVideoUrlsFromPost(post);
  const video_url =
    video_urls.length > 0
      ? video_urls[0]
      : String(post?.video_url ?? "").trim();

  const tags =
    Array.isArray(post?.tags) && post.tags.length
      ? post.tags.filter(Boolean).map((t) => String(t))
      : post?.tag != null && String(post.tag).trim()
        ? [String(post.tag)]
        : [];

  const tipo =
    post?.tipo_conteudo === "video" || post?.tipo_conteudo === "imagens"
      ? post.tipo_conteudo
      : video_urls.length && !imagens_urls.length
        ? "video"
        : imagens_urls.length
          ? "imagens"
          : "imagens";

  const isDraft =
    post?.is_draft === true ||
    post?.status === "draft";

  const visibility =
    post?.visibility === "private" || post?.visibility === "unlisted"
      ? post.visibility
      : "public";

  return {
    ...(post && typeof post === "object" ? post : {}),
    titulo: post?.titulo || "",
    descricao: post?.descricao || post?.resumo || "",
    imagens_urls,
    anexos,
    video_urls,
    video_url,
    tipo_conteudo: tipo,
    data_publicacao: post?.data_publicacao || post?.created_date,
    tags,
    carousel_interval_sec: Math.min(
      60,
      Math.max(2, Number(post?.carousel_interval_sec) || 5),
    ),
    autor: post?.autor || "",
    imagem_destaque_url: String(post?.imagem_destaque_url ?? "").trim(),
    usar_galeria_por_dia: Boolean(post?.usar_galeria_por_dia),
    dias_galeria: normalizeDiasGaleria(post?.dias_galeria),
    audio_ambiente_url: String(post?.audio_ambiente_url ?? "").trim(),
    audio_ambiente_escopo:
      post?.audio_ambiente_escopo === "por_secao"
        ? "por_secao"
        : "todas_secoes",
    is_draft: Boolean(isDraft),
    status: isDraft ? "draft" : "published",
    visibility,
  };
}

/**
 * URLs que podem receber estrela (imagens e vídeos nos anexos).
 * @param {object | null | undefined} post
 * @returns {string[]}
 */
export function collectPostFeaturedEligibleUrls(post) {
  const p = normalizePost(post || {});
  const fromAnexos = collectVisualMediaUrlsFromAnexos(p.anexos);
  if (fromAnexos.length > 0) return fromAnexos;
  return Array.isArray(p.imagens_urls) ? p.imagens_urls.filter(Boolean) : [];
}

/**
 * Miniatura da lista: estrela explícita (foto ou vídeo), senão 1.ª imagem.
 * Vídeo de anexo sem estrela nunca é usado; YouTube só se não houver imagens.
 * @param {object | null | undefined} post
 * @returns {string | null}
 */
export function resolvePostListFeaturedUrl(post) {
  const p = normalizePost(post || {});
  const eligible = collectPostFeaturedEligibleUrls(p);
  const explicit = String(p.imagem_destaque_url || "").trim();
  if (explicit && eligible.includes(explicit)) return explicit;
  const items = Array.isArray(p.anexos) ? p.anexos : [];
  for (const a of items) {
    if (a?.url && typeof a.mime === "string" && a.mime.startsWith("image/")) {
      return a.url;
    }
  }
  const legacy = Array.isArray(p.imagens_urls) ? p.imagens_urls.filter(Boolean) : [];
  return legacy[0] || null;
}

/** @param {object | null | undefined} post @param {string} url */
export function getPostAttachmentMime(post, url) {
  const u = String(url || "").trim();
  if (!u) return "";
  const p = normalizePost(post || {});
  const a = (Array.isArray(p.anexos) ? p.anexos : []).find((x) => x?.url === u);
  return typeof a?.mime === "string" ? a.mime : "";
}

/**
 * URL para miniatura na lista de posts.
 * @param {object | null | undefined} post
 * @returns {string | null}
 */
export function getPostCardThumbnailUrl(post) {
  const p = normalizePost(post || {});
  const featured = resolvePostListFeaturedUrl(p);
  if (featured) {
    const ytId = getYouTubeId(featured);
    if (ytId) return `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
    return featured;
  }
  if (collectPostImageUrls(p).length === 0) {
    const ytUrls = normalizeVideoUrlsFromPost(p);
    for (const raw of ytUrls) {
      const id = getYouTubeId(String(raw).trim());
      if (id) return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
    }
  }
  return null;
}

/**
 * Miniatura do feed — só mídia enviada pelo autor (sem fallback da categoria).
 * @param {object | null | undefined} post
 */
export function getPostFeedThumbnailUrl(post) {
  return getPostCardThumbnailUrl(post);
}

/**
 * Tipo de média mostrado na miniatura da lista (badge imagem/vídeo).
 * @returns {"image" | "video" | null}
 */
export function getPostListThumbMediaKind(post) {
  const p = normalizePost(post || {});
  const featured = resolvePostListFeaturedUrl(p);
  if (!featured) {
    const ytUrls = normalizeVideoUrlsFromPost(p);
    if (
      collectPostImageUrls(p).length === 0 &&
      ytUrls.some((u) => getYouTubeId(String(u).trim()))
    ) {
      return "video";
    }
    return null;
  }
  if (String(featured).includes("img.youtube.com") || getYouTubeId(featured)) {
    return "video";
  }
  if (getPostAttachmentMime(p, featured).startsWith("video/")) return "video";
  return "image";
}

/** Evento global: `Postagens.jsx` abre o visualizador em grande ao escutar este nome. */
export const POST_IMAGE_PRESENTATION_EVENT = "icer-post-fullscreen-images";

/**
 * URLs de imagens do post: anexos `image/*` e, se não houver, `imagens_urls` legadas.
 * @param {object | null | undefined} post
 * @returns {string[]}
 */
export function collectPostImageUrls(post) {
  const p = normalizePost(post || {});
  const items = Array.isArray(p.anexos) ? p.anexos : [];
  const urls = [];
  for (const a of items) {
    if (
      a?.url &&
      typeof a.mime === "string" &&
      a.mime.startsWith("image/")
    ) {
      urls.push(a.url);
    }
  }
  if (urls.length > 0) return urls;
  return Array.isArray(p.imagens_urls) ? p.imagens_urls.filter(Boolean) : [];
}

/**
 * Apresentação em ecrã inteiro (imagens, vídeos e YouTube).
 * @param {Array<{ kind: string, url?: string, videoId?: string }>} slides
 * @param {number} [initialIndex]
 * @param {{ audioAmbienteUrl?: string, bgMusicAllowed?: boolean }} [opts]
 */
export function openPostMediaPresentation(slides, initialIndex = 0, opts = {}) {
  const list = Array.isArray(slides) ? slides.filter(Boolean) : [];
  if (!list.length) return;
  const idx = Number.isFinite(initialIndex)
    ? Math.max(0, Math.min(initialIndex, list.length - 1))
    : 0;
  const audioAmbienteUrl = String(opts?.audioAmbienteUrl ?? "").trim();
  const bgMusicAllowed = opts?.bgMusicAllowed !== false;
  window.dispatchEvent(
    new CustomEvent(POST_IMAGE_PRESENTATION_EVENT, {
      detail: {
        slides: list,
        initialIndex: idx,
        ...(audioAmbienteUrl ? { audioAmbienteUrl } : {}),
        bgMusicAllowed,
      },
    }),
  );
}

/**
 * Abre a apresentação só com URLs de imagem (retrocompatível).
 * @param {string[]} urls
 * @param {number} [initialIndex]
 */
export function openPostImagePresentation(urls, initialIndex = 0) {
  const list = Array.isArray(urls) ? urls.filter(Boolean) : [];
  openPostMediaPresentation(
    list.map((url) => ({ kind: "image", url })),
    initialIndex,
  );
}
