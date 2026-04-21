/**
 * Cor da barra do card de evento (independente da categoria quando não for "auto").
 */

import {
  CATEGORY_BAR_CLASS,
  CATEGORY_ACCENT_HEX,
  EVENT_BAR_PRESET_CLASS,
  EVENT_BAR_PRESET_HEX,
} from "@/lib/categoryAppearance";

export const EVENT_CARD_COLOR_OPTIONS = [
  { value: "auto", label: "Igual à categoria" },
  { value: "blue", label: "Azul", tailwind: EVENT_BAR_PRESET_CLASS.blue },
  { value: "green", label: "Verde", tailwind: EVENT_BAR_PRESET_CLASS.green },
  { value: "purple", label: "Roxo", tailwind: EVENT_BAR_PRESET_CLASS.purple },
  { value: "pink", label: "Rosa", tailwind: EVENT_BAR_PRESET_CLASS.pink },
  { value: "orange", label: "Laranja", tailwind: EVENT_BAR_PRESET_CLASS.orange },
  { value: "yellow", label: "Amarelo", tailwind: EVENT_BAR_PRESET_CLASS.yellow },
  { value: "red", label: "Vermelho", tailwind: EVENT_BAR_PRESET_CLASS.red },
  { value: "indigo", label: "Índigo", tailwind: EVENT_BAR_PRESET_CLASS.indigo },
  { value: "teal", label: "Teal", tailwind: EVENT_BAR_PRESET_CLASS.teal },
  { value: "cyan", label: "Ciano", tailwind: EVENT_BAR_PRESET_CLASS.cyan },
  { value: "slate", label: "Cinza", tailwind: EVENT_BAR_PRESET_CLASS.slate },
];

const BAR_BY_PRESET = Object.fromEntries(
  EVENT_CARD_COLOR_OPTIONS.filter((o) => o.tailwind).map((o) => [o.value, o.tailwind]),
);

/**
 * @param {object} evento
 * @param {Record<string, string>} categoriaBg — mapa categoria → classe (ex.: CATEGORY_BAR_CLASS)
 */
export function eventCardBarClass(evento, categoriaBg) {
  const raw = evento?.cor_barra ?? evento?.cor_card;
  if (raw && raw !== "auto" && BAR_BY_PRESET[raw]) return BAR_BY_PRESET[raw];
  const cat = evento?.categoria;
  if (categoriaBg && cat && categoriaBg[cat]) return categoriaBg[cat];
  return "bg-primary";
}

const PRESET_HEX = { ...EVENT_BAR_PRESET_HEX };

const CATEGORIA_HEX = { ...CATEGORY_ACCENT_HEX };

/**
 * Cor principal do evento em hex (degradês, overlays).
 * @param {object} evento
 */
export function eventCardAccentHex(evento) {
  const raw = evento?.cor_barra ?? evento?.cor_card;
  if (raw && raw !== "auto" && PRESET_HEX[raw]) return PRESET_HEX[raw];
  const cat = evento?.categoria;
  if (cat && CATEGORIA_HEX[cat]) return CATEGORIA_HEX[cat];
  return CATEGORY_ACCENT_HEX.culto;
}
