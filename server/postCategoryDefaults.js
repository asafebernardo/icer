/** Categorias predefinidas de posts — alinhado ao frontend (`src/lib/postCategoryDefaults.js`). */
export const DEFAULT_POST_CATEGORIES = [
  { value: "noticias", label: "Notícias" },
  { value: "eventos", label: "Eventos" },
  { value: "agenda", label: "Agenda" },
  { value: "aplicativos", label: "Aplicativos" },
  { value: "culto_dominical", label: "Culto Dominical" },
  { value: "ceia", label: "Ceia" },
  { value: "oracao", label: "Oração" },
  { value: "clube_biblico", label: "Clube bíblico" },
  { value: "estudos_biblicos", label: "Estudos bíblicos" },
  { value: "acao_de_gracas", label: "Ação de graças" },
  { value: "dia_das_maes", label: "Dia das Mães" },
  { value: "dia_das_pais", label: "Dia dos Pais" },
  { value: "natal", label: "Natal" },
  { value: "pascoa", label: "Páscoa" },
  { value: "batismo", label: "Batismo" },
  { value: "encontro_de_casais", label: "Encontro de casais" },
  { value: "encontro_feminino", label: "Encontro Feminino" },
  { value: "encontro_masculino", label: "Encontro Masculino" },
  { value: "encontro_de_jovens", label: "Encontro de Jovens" },
  { value: "conferencias", label: "Conferências" },
];

export function sanitizePostCategorias(raw) {
  if (!Array.isArray(raw) || raw.length === 0) {
    return DEFAULT_POST_CATEGORIES.map((c, order) => ({ ...c, order }));
  }
  const allowed = new Set(DEFAULT_POST_CATEGORIES.map((c) => c.value));
  const labels = Object.fromEntries(
    DEFAULT_POST_CATEGORIES.map((c) => [c.value, c.label]),
  );
  const out = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const value = String(item.value || "").trim().toLowerCase();
    if (!allowed.has(value)) continue;
    const label = String(item.label || labels[value] || value)
      .trim()
      .slice(0, 80);
    const order = Number.isFinite(Number(item.order)) ? Number(item.order) : out.length;
    out.push({ value, label: label || labels[value], order });
  }
  if (out.length === 0) {
    return DEFAULT_POST_CATEGORIES.map((c, order) => ({ ...c, order }));
  }
  out.sort((a, b) => a.order - b.order);
  return out;
}
