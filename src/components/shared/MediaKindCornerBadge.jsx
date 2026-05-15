import { Image as ImageIcon, Video } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Ícone pequeno no canto da miniatura para distinguir imagem de vídeo.
 * @param {{ kind: "image" | "video", variant?: "default" | "onDark", size?: "sm" | "md", className?: string }} props
 */
export default function MediaKindCornerBadge({
  kind,
  variant = "default",
  size = "md",
  className,
}) {
  const Icon = kind === "video" ? Video : ImageIcon;
  const label = kind === "video" ? "Vídeo" : "Imagem";
  const compact = size === "sm";

  return (
    <span
      className={cn(
        "pointer-events-none absolute z-[25] flex items-center justify-center rounded-md border shadow-sm",
        compact ? "h-5 w-5 bottom-0.5 right-0.5" : "h-6 w-6 bottom-1 right-1",
        variant === "onDark"
          ? compact
            ? "bottom-1 left-1 border-white/25 bg-black/55 text-white"
            : "bottom-3 left-3 border-white/25 bg-black/55 text-white"
          : "border-border bg-background/95 text-muted-foreground",
        className,
      )}
      aria-hidden
      title={label}
    >
      <Icon
        className={cn("shrink-0", compact ? "h-3 w-3" : "h-3.5 w-3.5")}
        strokeWidth={2}
      />
    </span>
  );
}
