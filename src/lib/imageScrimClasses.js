/**
 * Véus escuros sobre imagens — mesmo critério visual em secções com foto
 * (cartões, cabeçalhos de página, versículo, canal, etc.).
 */

/** Cobertura leve em toda a área da imagem */
export const imageScrimFlat =
  "pointer-events-none absolute inset-0 z-[1] bg-black/20";

/**
 * Degradé na zona inferior (legibilidade de texto em baixo).
 * Altura alinhada aos cards de horários / canal.
 */
export const imageScrimBottom =
  "pointer-events-none absolute bottom-0 left-0 right-0 z-[2] h-[min(62%,220px)] min-h-[130px] bg-gradient-to-t from-black/85 via-black/50 to-transparent";

/** Cabeçalhos compactos (ex.: topo do modal de login com imagem) */
export const imageScrimBottomShort =
  "pointer-events-none absolute bottom-0 left-0 right-0 z-[2] h-[min(72%,120px)] min-h-[56px] bg-gradient-to-t from-black/85 via-black/55 to-transparent";
