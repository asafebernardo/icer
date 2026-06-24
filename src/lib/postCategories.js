import {
  DEFAULT_POST_CATEGORIES,
  DEFAULT_POST_CATEGORIA_MOSAIC_THUMBS,
} from "@/lib/postCategoryDefaults";

/** Categorias de posts (alinhado a `entities/Post.json`). */
export const POST_CATEGORIAS = DEFAULT_POST_CATEGORIES;

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

/** Categorias temáticas de culto (exclui Notícias e hub de Eventos). */
export const WORSHIP_POST_CATEGORY_KEYS = new Set(
  POST_CATEGORIAS.filter(
    (c) => !["noticias", "eventos"].includes(c.value),
  ).map((c) => c.value),
);

/** Ordem das secções no mosaico e feeds (grupos: Informações → Principais → Eventos). */
export const POST_MOSAIC_TAG_GROUPS = [
  {
    id: "informacoes",
    label: "Informações",
    categories: ["noticias", "eventos"],
  },
  {
    id: "principais",
    label: "Principais",
    categories: [
      "culto_dominical",
      "ceia",
      "oracao",
      "clube_biblico",
      "estudos_biblicos",
    ],
  },
  {
    id: "eventos",
    label: "Eventos",
    categories: [
      "acao_de_gracas",
      "dia_das_maes",
      "dia_das_pais",
      "natal",
      "pascoa",
      "batismo",
      "encontro_de_casais",
      "conferencias",
    ],
  },
];

export const POST_FEED_SECTION_ORDER = POST_MOSAIC_TAG_GROUPS.flatMap(
  (group) => group.categories,
);

/** Tag do mosaico por chave de categoria. */
export const POST_CATEGORIA_MOSAIC_TAG = Object.fromEntries(
  POST_MOSAIC_TAG_GROUPS.flatMap((group) =>
    group.categories.map((key) => [
      key,
      { id: group.id, label: group.label },
    ]),
  ),
);

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
  dia_das_maes: "💐",
  dia_das_pais: "👨‍👧",
  natal: "🎄",
  pascoa: "✝️",
  conferencias: "🎤",
  clube_biblico: "📖",
  estudos_biblicos: "📚",
  eventos: "📅",
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
      if (!buckets.has("noticias")) buckets.set("noticias", []);
      buckets.get("noticias").push(post);
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
