import { useEffect, useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TOOLTIP_HIDE_AFTER_MS,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/** Bolha alinhada ao doc de redes; largura mínima cresce com o número. */
const metricsBtnClass =
  "inline-flex min-h-[52px] min-w-[52px] shrink-0 items-center justify-center rounded-full border-2 border-white/30 bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-700 px-2.5 text-white shadow-[0_6px_22px_rgba(79,70,229,0.45)] transition-transform duration-200 hover:scale-110 hover:brightness-110 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background";
const tooltipSurfaceClass =
  "max-w-[min(16rem,calc(100vw-5rem))] border border-border/80 bg-card/98 px-3 py-2.5 text-left text-xs font-normal leading-relaxed text-foreground shadow-lg backdrop-blur-md";

/**
 * Resumo de acessos à Home.
 * @param {{ variant?: "dock" | "footer" }} props
 */
export default function HomeViewsMetricsDock({ variant = "dock" }) {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/metrics/home-views-summary", {
          credentials: "include",
        });
        if (!r.ok) return;
        const data = await r.json();
        if (!cancelled) setSummary(data);
      } catch {
        // silencioso
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const n =
    summary && Number.isFinite(Number(summary.unique_ips))
      ? Number(summary.unique_ips)
      : null;
  if (n == null) return null;

  const formatted = n.toLocaleString("pt-BR");

  if (variant === "footer") {
    return (
      <p className="text-xs text-muted-foreground">
        {formatted} acessos únicos à página inicial
      </p>
    );
  }

  const digitCount = String(Math.trunc(Math.abs(n))).length;
  /** ~altura dos ícones do doc de redes (`h-[22px]`), ligeiramente menor com mais dígitos. */
  const sizeClass =
    digitCount >= 7 ? "text-[10px]" : digitCount >= 5 ? "text-[11px]" : "text-[13px]";
  return (
    <Tooltip delayDuration={200} hideAfterMs={TOOLTIP_HIDE_AFTER_MS}>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={metricsBtnClass}
          aria-label={`Acessos à página inicial. ${formatted} IPs únicos.`}
        >
          <span
            className={cn(
              "whitespace-nowrap font-semibold tabular-nums leading-none tracking-tight drop-shadow-[0_1px_1px_rgba(0,0,0,0.25)]",
              sizeClass,
            )}
          >
            {formatted}
          </span>
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="left"
        align="center"
        sideOffset={10}
        className={tooltipSurfaceClass}
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Acessos à Home
        </p>
        <p className="mt-2 flex items-baseline justify-between gap-4 text-sm">
          <span className="text-muted-foreground">IPs únicos</span>
          <span className="font-semibold tabular-nums text-foreground">{formatted}</span>
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
