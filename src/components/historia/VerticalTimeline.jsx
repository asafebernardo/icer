import { useState } from "react";
import { motion } from "framer-motion";

import HistoriaTimelineDetailDialog from "@/components/historia/HistoriaTimelineDetailDialog";
import TimelineMilestoneCard from "@/components/historia/TimelineMilestoneCard";
import { cn } from "@/lib/utils";

/**
 * Timeline vertical — linha à esquerda, marcos empilhados (mobile e desktop).
 * @param {{ items: import("@/lib/historiaTimelineExamples").HistoriaTimelineItem[]; className?: string }} props
 */
export default function VerticalTimeline({ items, className }) {
  const [selected, setSelected] = useState(null);

  if (!items?.length) return null;

  return (
    <>
      <ol className={cn("relative space-y-0", className)} aria-label="Linha do tempo vertical">
        {items.map((item, index) => (
          <motion.li
            key={`${item.year}-${item.title}`}
            initial={{ opacity: 0, x: -12 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.35, delay: index * 0.06 }}
            className="relative grid grid-cols-[auto_auto_1fr] items-center gap-x-2 pb-10 last:pb-0 sm:gap-x-3"
          >
            <time
              dateTime={item.year}
              className="w-[2.75rem] shrink-0 self-center text-right font-display text-[11px] font-semibold tabular-nums uppercase tracking-[0.12em] text-accent sm:w-[3rem] sm:text-xs sm:tracking-[0.16em]"
            >
              {item.year}
            </time>
            <div className="relative z-[1] flex self-stretch items-center justify-center">
              <span
                className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-gradient-to-b from-accent/50 via-border to-accent/30"
                aria-hidden
              />
              <span
                className="relative z-[1] flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-2 border-accent/80 bg-background shadow-[0_0_0_4px_hsl(var(--background))] sm:h-[30px] sm:w-[30px]"
                aria-hidden
              >
                <span className="h-2 w-2 rounded-full bg-accent sm:h-2.5 sm:w-2.5" />
              </span>
            </div>
            <TimelineMilestoneCard
              item={item}
              onSelect={setSelected}
              variant="vertical"
              showYear={false}
              className="w-full min-w-0 self-center"
            />
          </motion.li>
        ))}
      </ol>

      <HistoriaTimelineDetailDialog
        item={selected}
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      />
    </>
  );
}
