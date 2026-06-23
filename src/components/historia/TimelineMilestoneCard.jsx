import SafeImg from "@/components/shared/SafeImg";
import { cn } from "@/lib/utils";

/**
 * Cartão clicável de um marco da timeline.
 * @param {{
 *   item: import("@/lib/historiaTimelineExamples").HistoriaTimelineItem;
 *   onSelect: (item: import("@/lib/historiaTimelineExamples").HistoriaTimelineItem) => void;
 *   variant?: "vertical" | "horizontal";
 *   accentClass?: string;
 *   showYear?: boolean;
 *   className?: string;
 * }} props
 */
export default function TimelineMilestoneCard({
  item,
  onSelect,
  variant = "vertical",
  accentClass = "text-accent",
  showYear = true,
  className,
}) {
  const isHorizontal = variant === "horizontal";
  const images = item.images?.length ? item.images : [];
  const preview = images[0] ?? null;
  const extraCount = Math.max(0, images.length - 1);

  const previewEl = preview ? (
    isHorizontal ? (
      <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden bg-muted/40">
        <SafeImg
          src={preview.src}
          alt={preview.alt}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
        />
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-card/90 via-card/20 to-transparent"
          aria-hidden
        />
        {extraCount > 0 ? (
          <span className="absolute bottom-2 right-2 rounded-full border border-border/60 bg-background/90 px-2 py-0.5 text-[10px] font-medium text-foreground shadow-sm backdrop-blur-sm">
            +{extraCount} {extraCount === 1 ? "foto" : "fotos"}
          </span>
        ) : null}
      </div>
    ) : (
      <div className="relative aspect-[3/4] w-[3.75rem] shrink-0 overflow-hidden rounded-lg border border-border/60 bg-muted/40 shadow-sm sm:w-[4.25rem]">
        <SafeImg
          src={preview.src}
          alt={preview.alt}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]"
        />
        {extraCount > 0 ? (
          <span className="absolute bottom-1 right-1 rounded bg-background/95 px-1 py-px text-[9px] font-medium leading-none text-foreground shadow-sm">
            +{extraCount}
          </span>
        ) : null}
      </div>
    )
  ) : null;

  const body = (
    <div className={cn("flex min-w-0 flex-col", isHorizontal && "flex-1 text-center")}>
      {showYear ? (
        <time
          dateTime={item.year}
          className={cn(
            "font-display text-xs font-semibold uppercase tracking-[0.18em]",
            accentClass,
          )}
        >
          {item.year}
        </time>
      ) : null}
      <h3
        className={cn(
          "font-display font-semibold text-foreground",
          showYear ? "mt-1" : "",
          isHorizontal ? "text-sm leading-snug sm:text-base" : "text-base sm:text-lg",
        )}
      >
        {item.title}
      </h3>
      {item.description ? (
        <p
          className={cn(
            "mt-1.5 line-clamp-3 leading-relaxed text-muted-foreground",
            isHorizontal ? "flex-1 text-left text-xs sm:text-sm" : "text-sm",
          )}
        >
          {item.description}
        </p>
      ) : null}
      <span
        className={cn(
          "mt-2 inline-flex text-xs font-medium text-primary opacity-80 transition group-hover:opacity-100 group-focus-visible:opacity-100",
          isHorizontal && "w-full justify-center",
        )}
      >
        Ver detalhes →
      </span>
    </div>
  );

  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      className={cn(
        "group min-w-0 overflow-hidden rounded-2xl border border-border/80 bg-card/60 text-left shadow-soft backdrop-blur-sm transition",
        "hover:border-primary/45 hover:bg-card/90 hover:shadow-md",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        isHorizontal && "flex h-full w-full flex-col",
        preview
          ? isHorizontal
            ? "p-0"
            : "flex items-start gap-3 p-3 sm:gap-3.5 sm:p-3.5"
          : "p-4",
        className,
      )}
      aria-label={`Ver detalhes: ${item.title}, ${item.year}`}
    >
      {previewEl}
      <div className={cn(isHorizontal && preview && "p-4")}>{body}</div>
    </button>
  );
}
