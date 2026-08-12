import { Pencil } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * @param {{ onClick: () => void, onDark?: boolean }} props
 */
export default function ServiceTimesEditChip({ onClick, onDark = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "absolute top-3 right-3 z-30 inline-flex items-center gap-1.5 rounded-sm border px-3 py-1.5 text-xs font-medium backdrop-blur-sm",
        onDark
          ? "border-white/25 bg-black/45 text-white hover:bg-black/55"
          : "border-border bg-background/90 text-foreground hover:bg-muted",
      )}
      aria-label="Editar"
    >
      <Pencil className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">Editar</span>
    </button>
  );
}
