import { memo, useCallback, useEffect, useRef } from "react";

import TimelineCard from "@/components/historia/history/TimelineCard";
import TimelineLine from "@/components/historia/history/TimelineLine";
import TimelineMarker from "@/components/historia/history/TimelineMarker";
import TimelineHorizontalScroll from "@/components/historia/timeline/TimelineHorizontalScroll";
import { formatEventYear, type TimelineEvent } from "@/components/historia/history/types";
import { cn } from "@/lib/utils";

interface HistoryTimelineProps {
  events: TimelineEvent[];
  activeIndex: number;
  onSelect: (index: number) => void;
  className?: string;
}

function HistoryTimeline({
  events,
  activeIndex,
  onSelect,
  className,
}: HistoryTimelineProps) {
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const el = cardRefs.current[activeIndex];
    el?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [activeIndex]);

  const handleSelect = useCallback(
    (index: number) => {
      onSelect(index);
    },
    [onSelect],
  );

  return (
    <div
      className={cn("relative", className)}
      role="tablist"
      aria-label="Índice da linha do tempo"
    >
      <TimelineHorizontalScroll ariaLabel="Navegar pelos eventos históricos">
        <div className="relative flex w-max gap-4 ps-[max(calc(50%-5.25rem),0.5rem)] pe-[max(calc(50%-5.25rem),0.5rem)]">
          <div className="pointer-events-none absolute inset-x-[max(calc(50%-5.25rem),0.5rem)] top-3 z-0">
            <TimelineLine
              activeIndex={activeIndex}
              total={events.length}
              className="relative"
            />
          </div>

          {events.map((event, index) => (
            <div
              key={event.id}
              ref={(el) => {
                cardRefs.current[index] = el;
              }}
              className="relative z-10 flex w-[168px] shrink-0 flex-col items-center"
            >
              <div className="flex h-6 items-center justify-center">
                <TimelineMarker
                  isActive={index === activeIndex}
                  isPast={index < activeIndex}
                  onClick={() => handleSelect(index)}
                  label={`${formatEventYear(event)} — ${event.category}`}
                />
              </div>

              <div className="mt-3 w-full">
                <TimelineCard
                  event={event}
                  isActive={index === activeIndex}
                  onSelect={() => handleSelect(index)}
                />
              </div>
            </div>
          ))}
        </div>
      </TimelineHorizontalScroll>
    </div>
  );
}

export default memo(HistoryTimeline);
