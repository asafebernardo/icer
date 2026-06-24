/** Opções partilhadas entre "Novo evento" e "Agendar em massa". */

export const EVENTO_CATEGORIAS = [
  { value: "culto", label: "Culto" },
  { value: "estudo", label: "Estudo" },
  { value: "jovens", label: "Jovens" },
  { value: "mulheres", label: "Mulheres" },
  { value: "homens", label: "Homens" },
  { value: "criancas", label: "Crianças" },
  { value: "especial", label: "Especial" },
  { value: "conferencia", label: "Conferência" },
];

export const EVENTO_CATEGORIA_VALUES = new Set(
  EVENTO_CATEGORIAS.map((c) => c.value),
);

export const EVENTO_CATEGORIA_LABELS = Object.fromEntries(
  EVENTO_CATEGORIAS.map((c) => [c.value, c.label]),
);

/** @param {unknown} value */
export function isValidEventoCategoria(value) {
  const slug = String(value ?? "")
    .trim()
    .toLowerCase();
  return Boolean(slug && EVENTO_CATEGORIA_VALUES.has(slug));
}

/** @param {unknown} value */
export function normalizeStoredEventoCategoria(value) {
  const slug = String(value ?? "")
    .trim()
    .toLowerCase();
  return isValidEventoCategoria(slug) ? slug : "";
}

