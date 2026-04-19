/**
 * Cor da barra do card de evento (independente da categoria quando não for "auto").
 */

export const EVENT_CARD_COLOR_OPTIONS = [
  { value: "auto", label: "Igual à categoria" },
  { value: "blue", label: "Azul", tailwind: "bg-blue-600" },
  { value: "green", label: "Verde", tailwind: "bg-green-600" },
  { value: "purple", label: "Roxo", tailwind: "bg-purple-600" },
  { value: "pink", label: "Rosa", tailwind: "bg-pink-500" },
  { value: "orange", label: "Laranja", tailwind: "bg-orange-500" },
  { value: "yellow", label: "Amarelo", tailwind: "bg-yellow-500" },
  { value: "red", label: "Vermelho", tailwind: "bg-red-600" },
  { value: "indigo", label: "Índigo", tailwind: "bg-indigo-600" },
  { value: "teal", label: "Teal", tailwind: "bg-teal-600" },
  { value: "cyan", label: "Ciano", tailwind: "bg-cyan-600" },
  { value: "slate", label: "Cinza", tailwind: "bg-slate-600" },
];

const BAR_BY_PRESET = Object.fromEntries(
  EVENT_CARD_COLOR_OPTIONS.filter((o) => o.tailwind).map((o) => [o.value, o.tailwind]),
);

/**
 * @param {object} evento
 * @param {Record<string, string>} categoriaBg - mapa categoria -> classe Tailwind (ex.: Eventos)
 */
export function eventCardBarClass(evento, categoriaBg) {
  const raw = evento?.cor_barra ?? evento?.cor_card;
  if (raw && raw !== "auto" && BAR_BY_PRESET[raw]) return BAR_BY_PRESET[raw];
  const cat = evento?.categoria;
  if (categoriaBg && cat && categoriaBg[cat]) return categoriaBg[cat];
  return "bg-primary";
}

/** Hex aproximado (Tailwind 500/600) para degradês inline */
const PRESET_HEX = {
  blue: "#2563eb",
  green: "#16a34a",
  purple: "#9333ea",
  pink: "#ec4899",
  orange: "#ea580c",
  yellow: "#ca8a04",
  red: "#dc2626",
  indigo: "#4f46e5",
  teal: "#0d9488",
  cyan: "#0891b2",
  slate: "#475569",
};

const CATEGORIA_HEX = {
  culto: "#2563eb",
  estudo: "#16a34a",
  jovens: "#9333ea",
  mulheres: "#ec4899",
  homens: "#ea580c",
  criancas: "#ca8a04",
  especial: "#dc2626",
  conferencia: "#4f46e5",
};

/**
 * Cor principal do evento em hex (degradês, overlays).
 * @param {object} evento
 */
export function eventCardAccentHex(evento) {
  const raw = evento?.cor_barra ?? evento?.cor_card;
  if (raw && raw !== "auto" && PRESET_HEX[raw]) return PRESET_HEX[raw];
  const cat = evento?.categoria;
  if (cat && CATEGORIA_HEX[cat]) return CATEGORIA_HEX[cat];
  return "#6366f1";
}
