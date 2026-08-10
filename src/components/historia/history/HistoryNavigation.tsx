import { memo, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils";

interface HistoryNavigationProps {
  onPrev: () => void;
  onNext: () => void;
  canPrev: boolean;
  canNext: boolean;
  current: number;
  total: number;
  className?: string;
}

function NavButton({
  onClick,
  disabled,
  label,
  children,
  className,
}: {
  onClick: () => void;
  disabled: boolean;
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      whileTap={disabled ? undefined : { scale: 0.98 }}
      className={cn(
        "group relative inline-flex items-center gap-2 overflow-hidden rounded-full",
        "border border-border bg-muted/50 px-4 py-2.5",
        "text-sm font-medium text-muted-foreground",
        "transition-colors duration-200 hover:border-border/80 hover:bg-muted hover:text-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:pointer-events-none disabled:opacity-25",
        className,
      )}
    >
      <span
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_var(--x,50%)_var(--y,50%),hsl(var(--primary)/0.1),transparent_65%)] opacity-0 transition-opacity group-hover:opacity-100"
        aria-hidden
      />
      {children}
    </motion.button>
  );
}

function HistoryNavigation({
  onPrev,
  onNext,
  canPrev,
  canNext,
  current,
  total,
  className,
}: HistoryNavigationProps) {
  return (
    <nav
      aria-label="Navegação entre eventos"
      className={cn(
        "flex flex-col items-stretch gap-4 border-t border-border pt-8 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <NavButton
        onClick={onPrev}
        disabled={!canPrev}
        label="Evento anterior"
      >
        <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden />
        <span className="hidden sm:inline">Evento anterior</span>
        <span className="sm:hidden">Anterior</span>
      </NavButton>

      <p
        className="order-first text-center text-sm text-muted-foreground sm:order-none"
        aria-live="polite"
      >
        Evento{" "}
        <span className="font-medium tabular-nums text-foreground">{current}</span>
        {" de "}
        <span className="font-medium tabular-nums text-foreground">{total}</span>
      </p>

      <NavButton
        onClick={onNext}
        disabled={!canNext}
        label="Próximo evento"
        className="sm:ml-auto"
      >
        <span className="hidden sm:inline">Próximo evento</span>
        <span className="sm:hidden">Próximo</span>
        <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
      </NavButton>
    </nav>
  );
}

export default memo(HistoryNavigation);
