import { cn } from "@/lib/utils";

/**
 * Filtro por ano (chips + «Todos»).
 * @param {{
 *   years: number[];
 *   selectedYears: Set<number | null>;
 *   onToggleYear: (year: number) => void;
 *   onSelectAll: () => void;
 *   className?: string;
 * }} props
 */
export default function PostsYearFilterBar({
  years,
  selectedYears,
  onToggleYear,
  onSelectAll,
  className,
}) {
  const allSelected = years.length > 0 && selectedYears.size === years.length;

  if (years.length === 0) return null;

  return (
    <div className={cn("posts-eventos-filters mb-8", className)}>
      <div>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Anos
          </span>
          <button
            type="button"
            onClick={onSelectAll}
            aria-pressed={allSelected}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              allSelected
                ? "border-accent/40 bg-accent/20 text-accent"
                : "border-white/10 bg-background/40 text-muted-foreground hover:border-accent/30 hover:text-foreground",
            )}
          >
            Todos
          </button>
        </div>
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label="Filtrar por ano"
        >
          {years.map((year) => {
            const active = selectedYears.has(year);
            return (
              <button
                key={year}
                type="button"
                onClick={() => onToggleYear(year)}
                aria-pressed={active}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "border-accent/40 bg-accent/20 text-accent"
                    : "border-white/10 bg-background/40 text-muted-foreground hover:border-accent/30 hover:text-foreground",
                )}
              >
                {year}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
