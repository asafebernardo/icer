export function normalizeTagKey(raw) {
  return String(raw || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
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
    if (a.mime.startsWith("image/")) {
      slides.push({ kind: "image", url: a.url });
    } else if (a.mime.startsWith("video/")) {
      slides.push({ kind: "video", url: a.url });
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
    if (a?.mime?.startsWith("video/")) return { kind: "video", url };
    return { kind: "image", url };
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
    base.push({ kind: "youtube", videoId: id, url: trimmed });
  }
  return base;
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
  };
}

/**
 * URL para miniatura na lista de posts (YouTube, imagem de destaque ou primeira imagem).
 * @param {object | null | undefined} post
 * @returns {string | null}
 */
export function getPostCardThumbnailUrl(post) {
  const p = normalizePost(post || {});
  const ytUrls = normalizeVideoUrlsFromPost(p);
  for (const raw of ytUrls) {
    const id = getYouTubeId(String(raw).trim());
    if (id) return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
  }
  const urls = collectPostImageUrls(p);
  const featured = String(p.imagem_destaque_url || "").trim();
  if (featured && urls.includes(featured)) return featured;
  return urls[0] || null;
}

/**
 * Tipo de média mostrado na miniatura da lista (badge imagem/vídeo).
 * @returns {"image" | "video" | null}
 */
export function getPostListThumbMediaKind(post) {
  const p = normalizePost(post || {});
  const thumb = getPostCardThumbnailUrl(post);
  const ytUrls = normalizeVideoUrlsFromPost(p);
  if (thumb) {
    if (String(thumb).includes("img.youtube.com")) return "video";
    return "image";
  }
  if (ytUrls.some((u) => String(u).trim() && !getYouTubeId(u))) return "video";
  return null;
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
