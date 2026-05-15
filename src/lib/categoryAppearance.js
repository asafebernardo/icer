/**
 * Aparência de categorias de eventos — alinhada a `src/index.css` (--category-*).
 * Importar estes mapas em vez de repetir `bg-blue-600`, etc.
 */

/** Barra superior / chip forte */
export const CATEGORY_BAR_CLASS = {
  culto: "bg-category-culto",
  estudo: "bg-category-estudo",
  jovens: "bg-category-jovens",
  mulheres: "bg-category-mulheres",
  homens: "bg-category-homens",
  criancas: "bg-category-criancas",
  especial: "bg-category-especial",
  conferencia: "bg-category-conferencia",
};

/** Etiquetas em fundo claro (listas, filtros) */
/** Badges compactos (sem borda; ex.: modal de detalhe) */
export const CATEGORY_BADGE_QUIET_CLASS = {
  culto: "bg-category-culto/15 text-category-culto",
  estudo: "bg-category-estudo/15 text-category-estudo",
  jovens: "bg-category-jovens/15 text-category-jovens",
  mulheres: "bg-category-mulheres/15 text-category-mulheres",
  homens: "bg-category-homens/15 text-category-homens",
  criancas: "bg-category-criancas/15 text-category-criancas",
  especial: "bg-category-especial/15 text-category-especial",
  conferencia: "bg-category-conferencia/15 text-category-conferencia",
};

export const CATEGORY_SOFT_BADGE_CLASS = {
  culto:
    "border border-category-culto/30 bg-category-culto/10 text-category-culto",
  estudo:
    "border border-category-estudo/30 bg-category-estudo/10 text-category-estudo",
  jovens:
    "border border-category-jovens/30 bg-category-jovens/10 text-category-jovens",
  mulheres:
    "border border-category-mulheres/30 bg-category-mulheres/10 text-category-mulheres",
  homens:
    "border border-category-homens/30 bg-category-homens/10 text-category-homens",
  criancas:
    "border border-category-criancas/30 bg-category-criancas/10 text-category-criancas",
  especial:
    "border border-category-especial/30 bg-category-especial/10 text-category-especial",
  conferencia:
    "border border-category-conferencia/30 bg-category-conferencia/10 text-category-conferencia",
};

/** Cor principal em hex (degradês, JS) — espelho aproximado das variáveis HSL */
export const CATEGORY_ACCENT_HEX = {
  culto: "#3d5d92",
  estudo: "#2a7d8f",
  jovens: "#6b4f9e",
  mulheres: "#b84d86",
  homens: "#d9662b",
  criancas: "#c9a227",
  especial: "#d92b2b",
  conferencia: "#4f5aa8",
};

/** Presets de cor de barra (admin) → mesma família que as categorias */
export const EVENT_BAR_PRESET_CLASS = {
  blue: "bg-category-culto",
  green: "bg-category-estudo",
  purple: "bg-category-jovens",
  pink: "bg-category-mulheres",
  orange: "bg-category-homens",
  yellow: "bg-category-criancas",
  red: "bg-category-especial",
  indigo: "bg-category-conferencia",
  teal: "bg-category-estudo",
  cyan: "bg-accent",
  slate: "bg-muted-foreground",
};

export const EVENT_BAR_PRESET_HEX = {
  blue: CATEGORY_ACCENT_HEX.culto,
  green: CATEGORY_ACCENT_HEX.estudo,
  purple: CATEGORY_ACCENT_HEX.jovens,
  pink: CATEGORY_ACCENT_HEX.mulheres,
  orange: CATEGORY_ACCENT_HEX.homens,
  yellow: CATEGORY_ACCENT_HEX.criancas,
  red: CATEGORY_ACCENT_HEX.especial,
  indigo: CATEGORY_ACCENT_HEX.conferencia,
  teal: "#2a7d8f",
  cyan: "#0d87b8",
  slate: "#64748b",
};
