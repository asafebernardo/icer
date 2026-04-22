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

  const video_url = post?.video_url || "";

  const tags =
    Array.isArray(post?.tags) && post.tags.length
      ? post.tags.filter(Boolean).map((t) => String(t))
      : post?.tag != null && String(post.tag).trim()
        ? [String(post.tag)]
        : [];

  const tipo =
    post?.tipo_conteudo === "video" || post?.tipo_conteudo === "imagens"
      ? post.tipo_conteudo
      : video_url && !imagens_urls.length
        ? "video"
        : imagens_urls.length
          ? "imagens"
          : "imagens";

  return {
    ...(post && typeof post === "object" ? post : {}),
    titulo: post?.titulo || "",
    descricao: post?.descricao || post?.resumo || "",
    imagens_urls,
    anexos,
    video_url,
    tipo_conteudo: tipo,
    data_publicacao: post?.data_publicacao || post?.created_date,
    tags,
    carousel_interval_sec: Math.min(
      60,
      Math.max(2, Number(post?.carousel_interval_sec) || 5),
    ),
    autor: post?.autor || "",
  };
}

