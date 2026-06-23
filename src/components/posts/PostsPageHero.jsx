import { Link } from "react-router-dom";
import { FileText, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const FEED_MAX_W = "max-w-[1120px]";

function YearPill({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "shrink-0 rounded-full border px-3.5 py-1 text-xs font-medium transition-all duration-150",
        active
          ? "border-[#38BDF8]/30 bg-[#38BDF8]/12 text-[#F1F5F9] shadow-[0_0_24px_-14px_rgba(56,189,248,0.5)]"
          : "border-white/[0.06] bg-[#08111F]/60 text-[#64748B] hover:border-white/10 hover:text-[#94A3B8]",
      )}
    >
      {children}
    </button>
  );
}

export default function PostsPageHero({
  selectedYear,
  onYearChange,
  availableYears,
  showDrafts,
  onToggleDrafts,
  canShowDrafts,
  canCreate,
}) {
  return (
    <header className={cn("posts-feed-header", FEED_MAX_W, "mx-auto w-full")}>
      <div className="px-4 py-5 sm:px-6 sm:py-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="mb-1 text-[10px] font-medium uppercase tracking-[0.18em] text-[#38BDF8]/75">
              Comunidade
            </p>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-[#F1F5F9] sm:text-[1.65rem]">
              Posts
            </h1>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {canShowDrafts ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={cn(
                  "h-8 border-white/[0.08] bg-[#08111F]/50 px-3 text-xs text-[#94A3B8]",
                  showDrafts && "border-[#38BDF8]/25 bg-[#38BDF8]/10 text-[#F1F5F9]",
                )}
                aria-pressed={showDrafts}
                onClick={onToggleDrafts}
              >
                <FileText className="mr-1.5 h-3.5 w-3.5" />
                Rascunhos
              </Button>
            ) : null}
            {canCreate ? (
              <Button size="sm" className="h-8 px-3 text-xs" asChild>
                <Link to="/Posts/nova">
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Novo
                </Link>
              </Button>
            ) : null}
          </div>
        </div>

        <div
          className="mt-4 flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="group"
          aria-label="Filtrar por ano"
        >
          <YearPill
            active={selectedYear === "all"}
            onClick={() => onYearChange("all")}
          >
            Todos
          </YearPill>
          {availableYears.map((year) => (
            <YearPill
              key={year}
              active={selectedYear === String(year)}
              onClick={() => onYearChange(String(year))}
            >
              {year}
            </YearPill>
          ))}
        </div>
      </div>
    </header>
  );
}

export { FEED_MAX_W };
