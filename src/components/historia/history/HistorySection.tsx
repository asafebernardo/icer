import { memo, useState } from "react";

import HistoryProgress from "@/components/historia/history/HistoryProgress";
import HistoryVerticalTimeline from "@/components/historia/history/HistoryVerticalTimeline";
import { TIMELINE_EVENTS } from "@/components/historia/history/timelineData";
import type { TimelineEvent } from "@/components/historia/history/types";
import { cn } from "@/lib/utils";

interface HistorySectionProps {
  events?: TimelineEvent[];
  className?: string;
}

function HistorySection({
  events = TIMELINE_EVENTS,
  className,
}: HistorySectionProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const total = events.length;

  if (events.length === 0) return null;

  return (
    <section
      className={cn("relative pb-8 sm:pb-12", className)}
      aria-label="Exposição histórica do Movimento dos Irmãos"
    >
      <p className="sr-only">
        Clique em Ver mais para ler o conteúdo completo de cada evento.
      </p>

      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(ellipse_70%_55%_at_50%_0%,hsl(var(--primary)/0.08),transparent_72%)]"
        aria-hidden
      />

      <HistoryProgress current={activeIndex + 1} total={total} className="mb-4 sm:mb-5" />

      <HistoryVerticalTimeline
        events={events}
        activeIndex={activeIndex}
        onActiveIndexChange={setActiveIndex}
      />
    </section>
  );
}

export default memo(HistorySection);
