import { memo, useEffect, useMemo, useRef } from "react";

import HistoryEventCard from "@/components/historia/history/HistoryEventCard";
import {
  CATEGORY_COLORS,
  type TimelineEvent,
} from "@/components/historia/history/types";
import { cn } from "@/lib/utils";

interface HistoryVerticalTimelineProps {
  events: TimelineEvent[];
  activeIndex: number;
  onActiveIndexChange?: (index: number) => void;
  className?: string;
}

/** Alterna esquerda/direita por ano; eventos do mesmo ano ficam no mesmo lado. */
function buildYearSideMap(events: TimelineEvent[]): boolean[] {
  const sides: boolean[] = [];
  const yearToSide = new Map<number, boolean>();
  let nextIsLeft = true;

  for (const event of events) {
    const existing = yearToSide.get(event.year);
    if (existing !== undefined) {
      sides.push(existing);
    } else {
      yearToSide.set(event.year, nextIsLeft);
      sides.push(nextIsLeft);
      nextIsLeft = !nextIsLeft;
    }
  }

  return sides;
}

function TimelineMarker({
  isActive,
  isPast,
  glow,
  size = "default",
}: {
  isActive: boolean;
  isPast: boolean;
  glow?: string;
  size?: "default" | "sm";
}) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-full border transition-all duration-300",
        size === "sm"
          ? isActive
            ? "h-2.5 w-2.5 border-primary bg-primary"
            : isPast
              ? "h-2 w-2 border-primary/45 bg-primary/30"
              : "h-1.5 w-1.5 border-border bg-muted"
          : isActive
            ? "h-3 w-3 border-primary bg-primary shadow-[0_0_10px_hsl(var(--primary)/0.35)]"
            : isPast
              ? "h-2.5 w-2.5 border-primary/45 bg-primary/30"
              : "h-2 w-2 border-border bg-card",
      )}
      style={isActive && glow ? { boxShadow: `0 0 12px -2px ${glow}` } : undefined}
      aria-hidden
    />
  );
}

function HistoryVerticalTimeline({
  events,
  activeIndex,
  onActiveIndexChange,
  className,
}: HistoryVerticalTimelineProps) {
  const itemRefs = useRef<(HTMLElement | null)[]>([]);
  const eventSides = useMemo(() => buildYearSideMap(events), [events]);

  useEffect(() => {
    if (!onActiveIndexChange) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visible.length === 0) return;

        const id = visible[0]?.target.getAttribute("data-index");
        if (id != null) {
          onActiveIndexChange(Number(id));
        }
      },
      {
        root: null,
        rootMargin: "-20% 0px -55% 0px",
        threshold: [0, 0.25, 0.5, 0.75, 1],
      },
    );

    itemRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [events.length, onActiveIndexChange]);

  return (
    <div className={cn("relative", className)}>
      {/* Linha vertical — mobile (lateral) */}
      <div
        className="pointer-events-none absolute bottom-0 left-[11px] top-0 w-px bg-border sm:hidden"
        aria-hidden
      />

      {/* Linha vertical — desktop (central) */}
      <div
        className="pointer-events-none absolute inset-y-0 left-1/2 hidden w-px -translate-x-1/2 bg-border sm:block"
        aria-hidden
      />

      <ol className="relative flex flex-col" role="list">
        {events.map((event, index) => {
          const itemColors = CATEGORY_COLORS[event.category];
          const isActive = index === activeIndex;
          const isPast = index < activeIndex;
          const isLeft = eventSides[index] ?? index % 2 === 0;
          const isLast = index === events.length - 1;

          return (
            <li
              key={event.id}
              ref={(el) => {
                itemRefs.current[index] = el;
              }}
              id={`historia-event-${event.id}`}
              data-index={index}
              className={cn(
                "relative scroll-mt-24",
                !isLast && "pb-2 sm:pb-2.5",
              )}
            >
              {/* Mobile: coluna única */}
              <div className="flex min-w-0 items-start gap-2.5 sm:hidden">
                <div className="flex w-[22px] shrink-0 justify-center pt-3">
                  <TimelineMarker
                    isActive={isActive}
                    isPast={isPast}
                    glow={itemColors.glow}
                    size="sm"
                  />
                </div>
                <HistoryEventCard
                  event={event}
                  isActive={isActive}
                  className="min-w-0 flex-1"
                />
              </div>

              {/* Desktop: alternância esquerda/direita, marcador central inline */}
              <div className="hidden sm:grid sm:grid-cols-[1fr_auto_1fr] sm:items-start sm:gap-x-2">
                <div className="flex justify-end pr-2">
                  {isLeft ? (
                    <HistoryEventCard
                      event={event}
                      isActive={isActive}
                      className="w-full max-w-[20rem] lg:max-w-[22rem]"
                    />
                  ) : null}
                </div>

                <div className="flex w-4 shrink-0 justify-center pt-3">
                  <TimelineMarker
                    isActive={isActive}
                    isPast={isPast}
                    glow={itemColors.glow}
                  />
                </div>

                <div className="flex justify-start pl-2">
                  {!isLeft ? (
                    <HistoryEventCard
                      event={event}
                      isActive={isActive}
                      className="w-full max-w-[20rem] lg:max-w-[22rem]"
                    />
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export default memo(HistoryVerticalTimeline);
