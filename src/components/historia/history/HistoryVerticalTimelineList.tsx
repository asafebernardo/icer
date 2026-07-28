import { memo, type RefObject } from "react";

import {
  CATEGORY_COLORS,
  formatEventYear,
  type TimelineEvent,
} from "@/components/historia/history/types";
import { cn } from "@/lib/utils";

interface HistoryVerticalTimelineListProps {
  events: TimelineEvent[];
  activeIndex: number;
  onSelect: (index: number) => void;
  activeItemRef?: RefObject<HTMLLIElement | null>;
  className?: string;
}

function HistoryVerticalTimelineList({
  events,
  activeIndex,
  onSelect,
  activeItemRef,
  className,
}: HistoryVerticalTimelineListProps) {
  const progressHeight =
    events.length <= 1 ? "100%" : `${(activeIndex / (events.length - 1)) * 100}%`;

  return (
    <div className={cn("relative px-1", className)}>
      <div
        className="pointer-events-none absolute bottom-3 left-[13px] top-3 w-px bg-white/[0.08]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute left-[13px] top-3 w-px bg-gradient-to-b from-[#3B82F6]/50 via-[#3B82F6]/85 to-[#60A5FA]/70 transition-[height] duration-500"
        style={{ height: progressHeight }}
        aria-hidden
      />

      <ul className="relative space-y-0" role="list">
        {events.map((event, index) => {
          const itemColors = CATEGORY_COLORS[event.category];
          const isActive = index === activeIndex;
          const isPast = index < activeIndex;

          return (
            <li
              key={event.id}
              ref={isActive ? activeItemRef : undefined}
              className="relative flex gap-3 pb-5 last:pb-1"
            >
              <div className="relative z-[1] flex w-7 shrink-0 justify-center pt-1">
                <span
                  className={cn(
                    "rounded-full border transition-all duration-300",
                    isActive
                      ? "h-3.5 w-3.5 border-[#3B82F6] bg-[#3B82F6] shadow-[0_0_12px_rgba(59,130,246,0.45)]"
                      : isPast
                        ? "h-2.5 w-2.5 border-[#3B82F6]/45 bg-[#3B82F6]/30"
                        : "h-2 w-2 border-white/20 bg-[#14161B]",
                  )}
                  aria-hidden
                />
              </div>

              <button
                type="button"
                onClick={() => onSelect(index)}
                aria-current={isActive ? "true" : undefined}
                className={cn(
                  "min-w-0 flex-1 pb-1 text-left transition-opacity",
                  isActive ? "opacity-100" : "opacity-75 hover:opacity-100",
                )}
              >
                <time
                  dateTime={event.yearLabel ? undefined : String(event.year)}
                  className={cn(
                    "block font-display text-lg font-bold tabular-nums tracking-tight",
                    isActive ? "text-[#F8FAFC]" : "text-[#94A3B8]",
                  )}
                >
                  {formatEventYear(event)}
                </time>

                <span
                  className="mt-1.5 inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em]"
                  style={{
                    color: itemColors.accent,
                    backgroundColor: itemColors.bg,
                    ...(isActive
                      ? { boxShadow: `0 0 18px -8px ${itemColors.glow}` }
                      : {}),
                  }}
                >
                  {event.category}
                </span>

                <span
                  className={cn(
                    "mt-2 block text-sm leading-snug",
                    isActive ? "font-medium text-[#E2E8F0]" : "text-[#94A3B8]",
                  )}
                >
                  {event.title}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default memo(HistoryVerticalTimelineList);
