/**
 * Adaptadores de apresentação — não alteram o schema persistido dos cultos.
 * Compatível com `imageUrl`, `imageUrls` e cultos publicados sem imagem.
 */

/**
 * Placeholder SVG que segue o tom do fundo via fill neutro (cards sem foto).
 * O overlay/tema tratam o contraste no light/dark.
 */
export const SERVICE_TIMES_IMAGE_PLACEHOLDER =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 8 8"><rect fill="%23171A1E" width="8" height="8"/></svg>`,
  );

/**
 * @param {unknown} value
 * @returns {string}
 */
function cleanUrl(value) {
  const s = String(value ?? "").trim();
  return s || "";
}

/**
 * Normaliza imagens de um culto publicado (legado `imageUrl` ou `imageUrls[]`).
 * @param {object} card
 * @returns {string[]}
 */
export function normalizeCardImages(card) {
  const fromArray = Array.isArray(card?.imageUrls)
    ? card.imageUrls.map(cleanUrl).filter(Boolean)
    : [];
  if (fromArray.length > 0) return fromArray;
  const single = cleanUrl(card?.imageUrl);
  return single ? [single] : [];
}

/**
 * @param {object[]} list
 */
export function sortCardsDisplay(list) {
  return [...(Array.isArray(list) ? list : [])].sort((a, b) => {
    if (!!a?.highlight === !!b?.highlight) return 0;
    return a?.highlight ? -1 : 1;
  });
}

/**
 * Categoria de exibição derivada do id/título (sem novo campo na API).
 * @param {object} card
 */
export function deriveCategory(card) {
  const id = String(card?.id || "").toLowerCase();
  const title = String(card?.title || "").toLowerCase();
  const blob = `${id} ${title}`;
  if (/ora[cç]ao/.test(blob)) return "ORAÇÃO";
  if (/jovens/.test(blob)) return "JOVENS";
  if (/feminino|mulher/.test(blob)) return "MULHERES";
  if (/homens/.test(blob)) return "HOMENS";
  if (/casais/.test(blob)) return "CASAIS";
  if (/crian[cç]a/.test(blob)) return "CRIANÇAS";
  if (/culto|celebra/.test(blob)) return "CULTO";
  return "ENCONTRO";
}

/**
 * @param {string} dateLabel
 * @returns {{ date: string, time: string }}
 */
export function splitDateLabel(dateLabel) {
  const s = String(dateLabel || "").trim();
  if (!s) return { date: "", time: "" };
  const parts = s.split(/\s*[—–\-|·]\s*/);
  if (parts.length >= 2) {
    return { date: parts[0].trim(), time: parts.slice(1).join(" · ").trim() };
  }
  return { date: s, time: "" };
}

/**
 * Capa do culto: 1ª imagem do card, senão fundo da secção, senão placeholder.
 * @param {object} card
 * @param {string} [sectionBgUrl]
 */
export function resolveCoverImage(card, sectionBgUrl = "") {
  const images = normalizeCardImages(card);
  if (images[0]) return images[0];
  const section = cleanUrl(sectionBgUrl);
  if (section) return section;
  return SERVICE_TIMES_IMAGE_PLACEHOLDER;
}

/**
 * Forma de evento para as variantes (incl. editorial-events).
 * @param {object} card
 * @param {{ location?: string, mapsHref?: string, sectionBgUrl?: string }} [contact]
 */
export function cardToEventView(card, contact = {}) {
  const images = normalizeCardImages(card);
  const { date, time } = splitDateLabel(card?.dateLabel);
  const cover = resolveCoverImage(card, contact.sectionBgUrl);
  return {
    id: String(card?.id ?? ""),
    image: cover,
    images: images.length > 0 ? images : cover ? [cover] : [],
    hasOwnImage: images.length > 0,
    category: deriveCategory(card),
    title: String(card?.title || "").trim() || "Culto",
    date,
    time,
    dateLabel: String(card?.dateLabel || "").trim(),
    location: String(contact.location || "").trim(),
    mapsHref: String(contact.mapsHref || "").trim(),
    description: String(card?.description || "").trim(),
    highlight: !!card?.highlight,
    raw: card,
  };
}

/**
 * @param {object[]} cards
 * @param {{ location?: string, mapsHref?: string, sectionBgUrl?: string }} [contact]
 */
export function cardsToEventViews(cards, contact) {
  return sortCardsDisplay(cards)
    .filter((c) => c && (c.id != null || c.title))
    .map((c) => cardToEventView(c, contact));
}
