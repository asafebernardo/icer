import { resolvePostCategoria, WORSHIP_POST_CATEGORY_KEYS } from "@/lib/postCategories";

/** Post entra em Notícias se não tiver categoria de culto/evento temático. */
export function belongsToNoticiasFeed(post) {
  const cat = resolvePostCategoria(post);
  if (!cat) return true;
  if (cat === "noticias") return true;
  if (WORSHIP_POST_CATEGORY_KEYS.has(cat)) return false;
  return true;
}

/** Normaliza evento da agenda para o mosaico/feed de Notícias. */
export function eventoToFeedItem(evento) {
  const id = evento?.id;
  return {
    ...evento,
    id: `evento-${id}`,
    _feedKind: "evento",
    eventoId: id,
    data_publicacao: evento?.data || "",
    imagem_destaque_url: String(evento?.imagem_url ?? "").trim(),
    titulo: String(evento?.titulo ?? "").trim() || "Evento",
  };
}

export function isEventoFeedItem(item) {
  return item?._feedKind === "evento";
}

export function feedItemHref(item) {
  if (isEventoFeedItem(item)) {
    return `/Evento/${item.eventoId ?? String(item.id).replace(/^evento-/, "")}`;
  }
  return `/Post/${item.id}`;
}

export function feedItemYear(item) {
  const raw = String(item?.data_publicacao ?? item?.data ?? "").trim();
  if (!raw) return null;
  const y = Number.parseInt(raw.slice(0, 4), 10);
  return Number.isFinite(y) && y >= 1900 && y <= 2100 ? y : null;
}

export function feedItemThumbnail(item) {
  if (isEventoFeedItem(item)) {
    const url = String(item?.imagem_url ?? item?.imagem_destaque_url ?? "").trim();
    return url || null;
  }
  return null;
}
