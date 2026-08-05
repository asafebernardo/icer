import {
  DEFAULT_POST_CATEGORIES,
  DEFAULT_POST_CATEGORIA_MOSAIC_THUMBS,
} from "@/lib/postCategoryDefaults";

/** Categorias de posts (alinhado a `entities/Post.json`). */
export const POST_CATEGORIAS = DEFAULT_POST_CATEGORIES;

/**
 * Categorias seleccionáveis ao criar/editar posts (exclui o hub «eventos»,
 * que não entra no mosaico/listagem de Eventos).
 */
export const POST_EDITOR_CATEGORIES = POST_CATEGORIAS.filter(
  (c) => c.value !== "eventos",
);

export const POST_CATEGORIA_LABELS = Object.fromEntries(
  POST_CATEGORIAS.map((c) => [c.value, c.label]),
);

/** Rótulos legados (posts antigos). */
const LEGACY_POST_CATEGORIA_LABELS = {
  devocional: "Devocional",
  aviso: "Avisos",
  testemunho: "Testemunhos",
  reflexao: "Reflexões",
  noticias: "Notícias",
};

Object.assign(POST_CATEGORIA_LABELS, LEGACY_POST_CATEGORIA_LABELS);

export const POST_CATEGORIA_ORDER = POST_CATEGORIAS.map((c) => c.value);

export const POST_CATEGORIA_VALUES = new Set(POST_CATEGORIA_ORDER);

/**
 * Slug de categoria válido para formulários e listagem (somente `categoria` explícito).
 * @param {unknown} value
 */
export function isValidPostCategoria(value) {
  const slug = String(value ?? "")
    .trim()
    .toLowerCase();
  return Boolean(slug && POST_CATEGORIA_VALUES.has(slug));
}

/**
 * Valor guardado para o campo categoria (vazio se inválido ou ausente).
 * @param {unknown} value
 */
export function normalizeStoredPostCategoria(value) {
  const slug = String(value ?? "")
    .trim()
    .toLowerCase();
  return isValidPostCategoria(slug) ? slug : "";
}

/**
 * Categoria que aparece no hub/listagem de Eventos (não o slug hub «eventos»).
 * @param {unknown} value
 */
export function normalizeListableEventosCategoria(value) {
  const slug = normalizeStoredPostCategoria(value);
  if (!slug || slug === "eventos") return "";
  return EVENTOS_CATEGORY_KEY_SET.has(slug) ? slug : "";
}

/** Categorias temáticas de culto (exclui hubs e categorias retiradas). */
export const WORSHIP_POST_CATEGORY_KEYS = new Set(
  POST_CATEGORIAS.filter(
    (c) => !["eventos"].includes(c.value),
  ).map((c) => c.value),
);

/** Slugs de encontros específicos (não sobrescrever pela regra genérica do título). */
export const SPECIFIC_ENCONTRO_CATEGORY_KEYS = new Set([
  "encontro_de_casais",
  "encontro_feminino",
  "encontro_masculino",
  "encontro_de_jovens",
]);

/** Categorias temáticas agrupadas em Eventos (exceto Informações). */
export const POST_MOSAIC_EVENTOS_CATEGORY_KEYS = [
  "culto_dominical",
  "ceia",
  "oracao",
  "batismo",
  "acao_de_gracas",
  "encontro_de_casais",
  "encontro_feminino",
  "encontro_masculino",
  "encontro_de_jovens",
  "dia_das_maes",
  "dia_das_pais",
  "natal",
  "pascoa",
  "conferencias",
  "clube_biblico",
  "estudos_biblicos",
];

/** Ordem das secções no mosaico raiz (Eventos). Aplicativos ficam no Home. */
export const POST_MOSAIC_TAG_GROUPS = [
  {
    id: "eventos",
    label: "Eventos",
    categories: POST_MOSAIC_EVENTOS_CATEGORY_KEYS,
    yearFirst: true,
  },
];

export const POST_FEED_SECTION_ORDER = POST_MOSAIC_TAG_GROUPS.flatMap(
  (group) => group.categories,
);

/** Subgrupos dentro de Eventos › ano (estrutura anterior do mosaico). */
export const POST_MOSAIC_EVENTOS_SUBGROUPS = [
  {
    id: "oficiais",
    label: "Oficiais",
    categories: ["culto_dominical", "ceia", "oracao"],
  },
  {
    id: "festividade",
    label: "Festividade",
    categories: [
      "acao_de_gracas",
      "dia_das_maes",
      "dia_das_pais",
      "natal",
      "pascoa",
    ],
  },
  {
    id: "encontros",
    label: "Encontros",
    categories: [
      "encontro_de_casais",
      "encontro_feminino",
      "encontro_masculino",
      "encontro_de_jovens",
    ],
  },
  {
    id: "especiais",
    label: "Especiais",
    categories: [
      "conferencias",
      "batismo",
      "clube_biblico",
      "estudos_biblicos",
    ],
  },
];

const EVENTOS_CATEGORY_KEY_SET = new Set(POST_MOSAIC_EVENTOS_CATEGORY_KEYS);

/** Tag visual por subgrupo (Oficiais, Festividade, …). */
export const POST_EVENTOS_SUBGROUP_TAG = Object.fromEntries(
  POST_MOSAIC_EVENTOS_SUBGROUPS.flatMap((subgroup) =>
    subgroup.categories.map((key) => [
      key,
      { id: subgroup.id, label: subgroup.label },
    ]),
  ),
);

/** Tag do mosaico por chave de categoria (legado Informações). */
export const POST_CATEGORIA_MOSAIC_TAG = {
  aplicativos: { id: "informacoes", label: "Informações" },
};

/** @param {string} groupId */
export function getPostMosaicGroup(groupId) {
  const id = String(groupId || "").trim().toLowerCase();
  return POST_MOSAIC_TAG_GROUPS.find((g) => g.id === id) ?? null;
}

/** @param {string} categoryKey */
export function getPostCategoryGroupId(categoryKey) {
  const key = String(categoryKey || "").trim().toLowerCase();
  if (EVENTOS_CATEGORY_KEY_SET.has(key)) return "eventos";
  return POST_CATEGORIA_MOSAIC_TAG[key]?.id ?? null;
}

/** @param {string} categoryKey */
export function getPostEventosSubgroup(categoryKey) {
  const key = String(categoryKey || "").trim().toLowerCase();
  return POST_EVENTOS_SUBGROUP_TAG[key] ?? null;
}

/** Categorias em que o clique no ano abre a lista de publicações (não o post principal). */
export const POST_CATEGORY_YEAR_LIST_KEYS = new Set([
  "culto_dominical",
  "ceia",
  "oracao",
  "encontro_de_casais",
  "encontro_feminino",
  "encontro_masculino",
  "encontro_de_jovens",
  "conferencias",
  "batismo",
  "clube_biblico",
  "estudos_biblicos",
]);

const ENCONTRO_CATEGORY_KEYS = new Set([
  "encontro_de_casais",
  "encontro_feminino",
  "encontro_masculino",
  "encontro_de_jovens",
]);

/** @param {string} groupId */
export function isEventosYearFirstGroup(groupId) {
  return String(groupId || "").trim().toLowerCase() === "eventos";
}

/** @param {string} categoryKey */
export function categoryUsesYearPostList(categoryKey) {
  const key = String(categoryKey || "").trim().toLowerCase();
  return POST_CATEGORY_YEAR_LIST_KEYS.has(key);
}

/** Encontros: lista por ano em cards embaçados com data dia/mês. */
export function categoryUsesBlurredDatePostCards(categoryKey) {
  return ENCONTRO_CATEGORY_KEYS.has(
    String(categoryKey || "").trim().toLowerCase(),
  );
}

/** @param {string} categoryKey */
export function categoryOpensPostDirectlyOnYearClick(categoryKey) {
  const key = String(categoryKey || "").trim().toLowerCase();
  return !categoryUsesYearPostList(key);
}

/** Rótulos para cabeçalhos de secção (plural quando aplicável). */
export const POST_FEED_SECTION_LABELS = Object.fromEntries(
  POST_CATEGORIAS.map((c) => [c.value, c.label]),
);
POST_FEED_SECTION_LABELS.outros = "Outros";

/** Indicador visual por categoria. */
export const POST_CATEGORIA_ACCENT = {
  culto_dominical: {
    dot: "bg-sky-400",
    glow: "from-sky-500/10 to-transparent",
    border: "group-hover:border-sky-500/25",
  },
  ceia: {
    dot: "bg-red-400",
    glow: "from-red-500/10 to-transparent",
    border: "group-hover:border-red-500/25",
  },
  oracao: {
    dot: "bg-violet-400",
    glow: "from-violet-500/10 to-transparent",
    border: "group-hover:border-violet-500/25",
  },
  batismo: {
    dot: "bg-cyan-400",
    glow: "from-cyan-500/10 to-transparent",
    border: "group-hover:border-cyan-500/25",
  },
  acao_de_gracas: {
    dot: "bg-amber-400",
    glow: "from-amber-500/10 to-transparent",
    border: "group-hover:border-amber-500/25",
  },
  encontro_de_casais: {
    dot: "bg-rose-400",
    glow: "from-rose-500/10 to-transparent",
    border: "group-hover:border-rose-500/25",
  },
  encontro_feminino: {
    dot: "bg-pink-400",
    glow: "from-pink-500/10 to-transparent",
    border: "group-hover:border-pink-500/25",
  },
  encontro_masculino: {
    dot: "bg-blue-400",
    glow: "from-blue-500/10 to-transparent",
    border: "group-hover:border-blue-500/25",
  },
  encontro_de_jovens: {
    dot: "bg-lime-400",
    glow: "from-lime-500/10 to-transparent",
    border: "group-hover:border-lime-500/25",
  },
  dia_das_maes: {
    dot: "bg-pink-400",
    glow: "from-pink-500/10 to-transparent",
    border: "group-hover:border-pink-500/25",
  },
  dia_das_pais: {
    dot: "bg-blue-400",
    glow: "from-blue-500/10 to-transparent",
    border: "group-hover:border-blue-500/25",
  },
  natal: {
    dot: "bg-emerald-400",
    glow: "from-emerald-500/10 to-transparent",
    border: "group-hover:border-emerald-500/25",
  },
  pascoa: {
    dot: "bg-indigo-400",
    glow: "from-indigo-500/10 to-transparent",
    border: "group-hover:border-indigo-500/25",
  },
  conferencias: {
    dot: "bg-purple-400",
    glow: "from-purple-500/10 to-transparent",
    border: "group-hover:border-purple-500/25",
  },
  clube_biblico: {
    dot: "bg-teal-400",
    glow: "from-teal-500/10 to-transparent",
    border: "group-hover:border-teal-500/25",
  },
  estudos_biblicos: {
    dot: "bg-sky-400",
    glow: "from-sky-500/10 to-transparent",
    border: "group-hover:border-sky-500/25",
  },
  eventos: {
    dot: "bg-fuchsia-400",
    glow: "from-fuchsia-500/10 to-transparent",
    border: "group-hover:border-fuchsia-500/25",
  },
  agenda: {
    dot: "bg-indigo-400",
    glow: "from-indigo-500/10 to-transparent",
    border: "group-hover:border-indigo-500/25",
  },
  aplicativos: {
    dot: "bg-emerald-400",
    glow: "from-emerald-500/10 to-transparent",
    border: "group-hover:border-emerald-500/25",
  },
  noticias: {
    dot: "bg-orange-400",
    glow: "from-orange-500/10 to-transparent",
    border: "group-hover:border-orange-500/25",
  },
  outros: {
    dot: "bg-slate-400",
    glow: "from-slate-500/10 to-transparent",
    border: "group-hover:border-slate-500/25",
  },
};

export const POST_CATEGORIA_MOSAIC_THUMBS = DEFAULT_POST_CATEGORIA_MOSAIC_THUMBS;

export const POST_CATEGORIA_EMOJI = {
  culto_dominical: "⛪",
  ceia: "🍷",
  oracao: "🙏",
  batismo: "💧",
  acao_de_gracas: "🙌",
  encontro_de_casais: "💑",
  encontro_feminino: "👩",
  encontro_masculino: "👨",
  encontro_de_jovens: "🧑‍🤝‍🧑",
  dia_das_maes: "💐",
  dia_das_pais: "👨‍👧",
  natal: "🎄",
  pascoa: "✝️",
  conferencias: "🎤",
  clube_biblico: "📖",
  estudos_biblicos: "📚",
  eventos: "📋",
  agenda: "📅",
  aplicativos: "📱",
  noticias: "📰",
  outros: "📄",
};

/**
 * Categoria explícita do post (`body_json.categoria`), se for um slug válido.
 * @param {object | null | undefined} post
 * @returns {string | null}
 */
export function resolvePostCategoria(post) {
  const slug = normalizeStoredPostCategoria(post?.categoria);
  return slug || null;
}

/**
 * Agrupa posts por categoria (ordem fixa); sem categoria → secção «Outros» no fim.
 * @param {object[]} posts
 * @returns {Array<{ key: string; label: string; items: object[] }>}
 */
export function groupPostsByCategoria(posts) {
  const buckets = new Map();

  for (const post of posts) {
    const cat = resolvePostCategoria(post);
    if (!cat || !WORSHIP_POST_CATEGORY_KEYS.has(cat)) {
      if (!buckets.has("outros")) buckets.set("outros", []);
      buckets.get("outros").push(post);
      continue;
    }
    if (!buckets.has(cat)) buckets.set(cat, []);
    buckets.get(cat).push(post);
  }

  const sections = POST_FEED_SECTION_ORDER.filter((key) => buckets.has(key)).map(
    (key) => ({
      key,
      label: POST_FEED_SECTION_LABELS[key] || POST_CATEGORIA_LABELS[key],
      items: buckets.get(key),
    }),
  );

  if (buckets.has("outros")) {
    sections.push({
      key: "outros",
      label: POST_FEED_SECTION_LABELS.outros || "Outros",
      items: buckets.get("outros"),
    });
  }

  return sections;
}

/**
 * Distribui secções alternadamente em duas colunas (desktop).
 * @param {ReturnType<typeof groupPostsByCategoria>} sections
 */
export function splitSectionsIntoColumns(sections) {
  const left = [];
  const right = [];
  for (let i = 0; i < sections.length; i += 1) {
    if (i % 2 === 0) left.push(sections[i]);
    else right.push(sections[i]);
  }
  return { left, right };
}
