import { memo } from "react";
import { Link } from "react-router-dom";
import { MapPin } from "lucide-react";

import {
  CATEGORY_COLORS,
  formatEventYear,
  type TimelineEvent,
} from "@/components/historia/history/types";
import { cn } from "@/lib/utils";

interface HistoryEventCardProps {
  event: TimelineEvent;
  isActive?: boolean;
  className?: string;
}

function HistoryEventCard({
  event,
  isActive = false,
  className,
}: HistoryEventCardProps) {
  const colors = CATEGORY_COLORS[event.category];

  return (
    <article
      className={cn(
        "rounded-xl border bg-card p-3 shadow-sm transition-all duration-300",
        "sm:rounded-2xl sm:p-3.5 sm:shadow-md",
        isActive
          ? "border-primary/30 shadow-md shadow-primary/5"
          : "border-border hover:border-border/80 hover:shadow-md",
        className,
      )}
    >
      <header>
        <time
          dateTime={event.yearLabel ? undefined : String(event.year)}
          className="font-display text-lg font-bold tabular-nums tracking-[-0.03em] text-foreground sm:text-xl"
        >
          {formatEventYear(event)}
        </time>

        <h2 className="mt-0.5 font-display text-sm font-semibold leading-snug tracking-[-0.02em] text-foreground">
          {event.title}
        </h2>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span
            className="inline-flex rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] sm:text-[10px]"
            style={{ color: colors.accent, backgroundColor: colors.bg }}
          >
            {event.category}
          </span>
          {event.location ? (
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground sm:text-xs">
              <MapPin className="h-2.5 w-2.5 shrink-0 sm:h-3 sm:w-3" aria-hidden />
              {event.location}
            </span>
          ) : null}
        </div>
      </header>

      {event.summary ? (
        <p className="mt-2 line-clamp-3 text-[13px] leading-snug text-muted-foreground sm:text-sm sm:leading-[1.55]">
          {event.summary}
        </p>
      ) : null}

      <Link
        to={`/Historia/${event.id}`}
        className={cn(
          "mt-2 inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-3 py-1",
          "text-xs font-medium text-foreground transition-colors",
          "hover:border-primary/35 hover:bg-primary/10 hover:text-primary",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card",
        )}
      >
        Ver mais
      </Link>
    </article>
  );
}

export default memo(HistoryEventCard);
