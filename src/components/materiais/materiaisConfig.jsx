import {
  Baby,
  BookMarked,
  BookOpen,
  Briefcase,
  Church,
  Cross,
  FileText,
  Globe,
  HandHeart,
  Headphones,
  Heart,
  Image as ImageIcon,
  Lightbulb,
  Megaphone,
  Mic2,
  Music,
  Palette,
  ScrollText,
  Shield,
  Sparkles,
  Star,
  Tag,
  Users,
  Video,
} from "lucide-react";

export const tipoIcons = {
  pdf: FileText,
  audio: Music,
  video: Video,
  imagem: ImageIcon,
  documento: FileText,
  apresentacao: FileText,
};

/** Categorias pré-definidas (antes de `materialCategoriasDef` em siteConfig). Só migração. */
const LEGACY_MATERIAL_CATEGORIAS = {
  liturgia: "Liturgia",
  louvor: "Louvor",
  estudo: "Estudo",
  infantil: "Infantil",
  administrativo: "Administrativo",
  divulgacao: "Divulgação",
};

/** @deprecated Use getMaterialCategoriasList(getSiteConfig()) */
export const materialCategorias = LEGACY_MATERIAL_CATEGORIAS;

/** Id fixo da categoria padrão (não pode ser removida). */
export const SEM_CATEGORIA_ID = "sem_categoria";

/** Opções de ícone Lucide para o material (campo `icone_id`). */
export const CATEGORIA_ICON_OPTIONS = [
  { id: "church", Icon: Church, label: "Igreja" },
  { id: "cross", Icon: Cross, label: "Cruz" },
  { id: "book-open", Icon: BookOpen, label: "Livro" },
  { id: "book-marked", Icon: BookMarked, label: "Marcador" },
  { id: "scroll-text", Icon: ScrollText, label: "Pergaminho" },
  { id: "music", Icon: Music, label: "Música" },
  { id: "mic-2", Icon: Mic2, label: "Microfone" },
  { id: "headphones", Icon: Headphones, label: "Auscultadores" },
  { id: "video", Icon: Video, label: "Vídeo" },
  { id: "image", Icon: ImageIcon, label: "Imagem" },
  { id: "baby", Icon: Baby, label: "Infantil" },
  { id: "briefcase", Icon: Briefcase, label: "Pastas" },
  { id: "megaphone", Icon: Megaphone, label: "Megafone" },
  { id: "heart", Icon: Heart, label: "Coração" },
  { id: "star", Icon: Star, label: "Estrela" },
  { id: "users", Icon: Users, label: "Pessoas" },
  { id: "globe", Icon: Globe, label: "Globo" },
  { id: "sparkles", Icon: Sparkles, label: "Brilho" },
  { id: "palette", Icon: Palette, label: "Paleta" },
  { id: "shield", Icon: Shield, label: "Escudo" },
  { id: "file-text", Icon: FileText, label: "Documento" },
  { id: "hand-heart", Icon: HandHeart, label: "Mãos" },
  { id: "lightbulb", Icon: Lightbulb, label: "Ideia" },
];

const ICON_BY_ID = Object.fromEntries(
  CATEGORIA_ICON_OPTIONS.map((o) => [o.id, o.Icon]),
);

/** Componente Lucide para um id de ícone (ou Tag). */
export function categoriaIconComponent(iconId) {
  if (!iconId) return Tag;
  return ICON_BY_ID[iconId] || Tag;
}

export function isValidMaterialIconId(id) {
  return typeof id === "string" && Boolean(ICON_BY_ID[id]);
}

/**
 * @param {string} label
 * @returns {string}
 */
export function slugifyCategoryId(label) {
  const base = label
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return base || "categoria";
}

/**
 * @param {Array<{ id: string, label: string, locked?: boolean }>} arr
 */
export function normalizeMaterialCategoriasDef(arr) {
  const seen = new Set();
  const out = [];
  let hasSem = false;
  for (const row of arr) {
    if (!row || typeof row.id !== "string" || typeof row.label !== "string")
      continue;
    const id = row.id.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const locked = Boolean(row.locked) || id === SEM_CATEGORIA_ID;
    out.push({
      id,
      label: row.label.trim() || id,
      locked,
    });
    if (id === SEM_CATEGORIA_ID) hasSem = true;
  }
  if (!hasSem) {
    out.unshift({
      id: SEM_CATEGORIA_ID,
      label: "Sem categoria",
      locked: true,
    });
  }
  out.sort((a, b) => {
    if (a.id === SEM_CATEGORIA_ID) return -1;
    if (b.id === SEM_CATEGORIA_ID) return 1;
    return a.label.localeCompare(b.label, "pt");
  });
  return out;
}

/**
 * Lista de categorias (siteConfig.materialCategoriasDef ou migração a partir do legado).
 * @param {Record<string, unknown>} cfg
 */
export function getMaterialCategoriasList(cfg = {}) {
  const raw = cfg.materialCategoriasDef;
  if (Array.isArray(raw) && raw.length > 0) {
    return normalizeMaterialCategoriasDef(raw);
  }
  const migrated = [
    { id: SEM_CATEGORIA_ID, label: "Sem categoria", locked: true },
    ...Object.entries(LEGACY_MATERIAL_CATEGORIAS).map(([id, label]) => ({
      id,
      label,
    })),
  ];
  return normalizeMaterialCategoriasDef(migrated);
}

/**
 * @param {Record<string, unknown>} cfg
 * @returns {Record<string, string>}
 */
export function getMaterialCategoriaLabelMap(cfg = {}) {
  const list = getMaterialCategoriasList(cfg);
  return Object.fromEntries(list.map((x) => [x.id, x.label]));
}

/**
 * @param {Record<string, unknown>} cfg
 * @returns {Set<string>}
 */
export function getValidMaterialCategoryIds(cfg = {}) {
  return new Set(getMaterialCategoriasList(cfg).map((x) => x.id));
}

/**
 * Garante categoria válida ao gravar; desconhecidos → sem_categoria.
 */
export function normalizeMaterialCategoriaForSave(categoria, cfg) {
  const ids = getValidMaterialCategoryIds(cfg);
  const c = String(categoria ?? "").trim();
  if (ids.has(c)) return c;
  return SEM_CATEGORIA_ID;
}
