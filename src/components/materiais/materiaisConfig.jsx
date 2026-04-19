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

export const materialCategorias = {
  liturgia: "Liturgia",
  louvor: "Louvor",
  estudo: "Estudo",
  infantil: "Infantil",
  administrativo: "Administrativo",
  divulgacao: "Divulgação",
};

/** Opções de ícone (Lucide) para cada categoria — id estável guardado em siteConfig. */
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

const DEFAULT_CATEGORIA_ICON_IDS = {
  liturgia: "church",
  louvor: "music",
  estudo: "book-open",
  infantil: "baby",
  administrativo: "briefcase",
  divulgacao: "megaphone",
};

/**
 * Mapa categoria → id de ícone, com defaults e validação.
 * @param {Record<string, unknown>} cfg — resultado de getSiteConfig()
 */
export function getMergedCategoriaIconIds(cfg = {}) {
  const raw = cfg.materialCategoriaIcons;
  const out = { ...DEFAULT_CATEGORIA_ICON_IDS };
  if (!raw || typeof raw !== "object") return out;
  for (const key of Object.keys(materialCategorias)) {
    const v = raw[key];
    if (typeof v === "string" && ICON_BY_ID[v]) {
      out[key] = v;
    }
  }
  return out;
}

/** Componente Lucide para um id de ícone (ou Tag). */
export function categoriaIconComponent(iconId) {
  return ICON_BY_ID[iconId] || Tag;
}
