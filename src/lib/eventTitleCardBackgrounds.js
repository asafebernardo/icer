/**
 * Imagens de fundo do cartão definidas no cadastro «Títulos sugeridos»
 * (`agenda_sugestoes.titulo_imagens_fundo`).
 */

/**
 * @param {object} evento
 * @param {unknown} map — título exacto → string[] | string
 * @returns {string[]}
 */
export function tituloImagensFundoUrls(evento, map) {
  /** Imagem própria do evento (formulário) substitui sempre o fundo do cadastro por título. */
  if (String(evento?.imagem_url ?? "").trim()) return [];
  const m = map && typeof map === "object" && !Array.isArray(map) ? map : {};
  const t = String(evento?.titulo ?? "").trim();
  if (!t) return [];
  const raw = m[t];
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return raw
      .map((u) => String(u ?? "").trim())
      .filter(Boolean);
  }
  const one = String(raw ?? "").trim();
  return one ? [one] : [];
}
