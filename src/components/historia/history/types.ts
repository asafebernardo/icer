export type TimelineCategory =
  | "Fundação"
  | "Missão"
  | "Expansão"
  | "Publicação"
  | "Divisão"
  | "Brasil"
  | "Alemanha";

export interface TimelineImage {
  src: string;
  alt: string;
  /** Legenda exibida abaixo da imagem; se omitida, usa alt */
  caption?: string;
}

export interface TimelineEvent {
  id: string;
  year: number;
  /** Rótulo alternativo (ex.: "Hoje") em vez do número */
  yearLabel?: string;
  title: string;
  category: TimelineCategory;
  summary: string;
  content: string;
  images: TimelineImage[];
  location?: string;
  references?: string[];
}

export const CATEGORY_COLORS: Record<
  TimelineCategory,
  { accent: string; glow: string; bg: string }
> = {
  Fundação: {
    accent: "#F59E0B",
    glow: "rgba(245,158,11,0.35)",
    bg: "rgba(245,158,11,0.12)",
  },
  Missão: {
    accent: "#3B82F6",
    glow: "rgba(59,130,246,0.35)",
    bg: "rgba(59,130,246,0.12)",
  },
  Expansão: {
    accent: "#10B981",
    glow: "rgba(16,185,129,0.35)",
    bg: "rgba(16,185,129,0.12)",
  },
  Publicação: {
    accent: "#8B5CF6",
    glow: "rgba(139,92,246,0.35)",
    bg: "rgba(139,92,246,0.12)",
  },
  Divisão: {
    accent: "#EF4444",
    glow: "rgba(239,68,68,0.35)",
    bg: "rgba(239,68,68,0.12)",
  },
  Brasil: {
    accent: "#22C55E",
    glow: "rgba(34,197,94,0.35)",
    bg: "rgba(34,197,94,0.12)",
  },
  Alemanha: {
    accent: "#EAB308",
    glow: "rgba(234,179,8,0.35)",
    bg: "rgba(234,179,8,0.12)",
  },
};

export function formatEventYear(event: TimelineEvent): string {
  return event.yearLabel ?? String(event.year);
}
