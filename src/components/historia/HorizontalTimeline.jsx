import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

import HistoriaTimelineDetailDialog from "@/components/historia/HistoriaTimelineDetailDialog";
import TimelineMilestoneCard from "@/components/historia/TimelineMilestoneCard";
import { cn } from "@/lib/utils";

/** Setas decorativas (sem acção por enquanto). */
function TimelineScrollHintArrow({ direction, className }) {
  const Icon = direction === "left" ? ChevronLeft : ChevronRight;
  return (
    <span
      className={cn(
        "pointer-events-none absolute top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-border/80 bg-background/90 text-muted-foreground shadow-md backdrop-blur-sm",
        direction === "left" ? "left-1 sm:left-2" : "right-1 sm:right-2",
        className,
      )}
      aria-hidden
    >
      <Icon className="h-5 w-5 shrink-0 opacity-70" strokeWidth={2} />
    </span>
  );
}

/**
 * Timeline horizontal — marcos em fila com scroll em ecrãs estreitos.
 * @param {{ items: import("@/lib/historiaTimelineExamples").HistoriaTimelineItem[]; className?: string }} props
 */
export default function HorizontalTimeline({ items, className }) {
  const [selected, setSelected] = useState(null);

  if (!items?.length) return null;

  return (
    <>
      <div className={cn("relative", className)}>
        <span
          className="pointer-events-none absolute inset-y-0 left-0 z-[1] w-10 bg-gradient-to-r from-background via-background/80 to-transparent sm:w-14"
          aria-hidden
        />
        <span
          className="pointer-events-none absolute inset-y-0 right-0 z-[1] w-10 bg-gradient-to-l from-background via-background/80 to-transparent sm:w-14"
          aria-hidden
        />
        <TimelineScrollHintArrow direction="left" />
        <TimelineScrollHintArrow direction="right" />
        <div
          className="overflow-x-auto px-10 pb-2 sm:px-12 [-ms-overflow-style:none] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border"
          tabIndex={0}
          role="region"
          aria-label="Linha do tempo horizontal — deslize para ver todos os marcos"
        >
          <ol className="relative flex min-w-max gap-0 px-1 pt-2">
            <span
              className="pointer-events-none absolute left-8 right-8 top-[calc(2.25rem+18px)] hidden h-px bg-gradient-to-r from-transparent via-border to-transparent sm:block"
              aria-hidden
            />
            {items.map((item, index) => (
              <motion.li
                key={`${item.year}-${item.title}`}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-20px" }}
                transition={{ duration: 0.35, delay: index * 0.05 }}
                className="relative flex w-[min(16rem,calc(100vw-3rem))] shrink-0 flex-col items-center px-3 sm:w-[13.5rem]"
              >
                <div className="relative z-[1] mb-4 flex w-full flex-col items-center">
                  <time
                    dateTime={item.year}
                    className="mb-2 font-display text-xs font-semibold uppercase tracking-[0.18em] text-primary"
                  >
                    {item.year}
                  </time>
                  <div className="relative w-full">
                    <div className="flex justify-center">
                      <span
                        className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-primary/70 bg-background shadow-md"
                        aria-hidden
                      >
                        <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                      </span>
                    </div>
                    {index < items.length - 1 ? (
                      <span
                        className="absolute left-[calc(50%+1.125rem)] top-1/2 hidden h-px w-[calc(100%+1.5rem)] -translate-y-1/2 bg-border sm:block"
                        aria-hidden
                      />
                    ) : null}
                  </div>
                </div>
                <TimelineMilestoneCard
                  item={item}
                  onSelect={setSelected}
                  variant="horizontal"
                  accentClass="text-primary"
                  showYear={false}
                  className="w-full"
                />
              </motion.li>
            ))}
          </ol>
        </div>
        <p className="mt-3 text-center text-[11px] text-muted-foreground sm:hidden">
          Deslize horizontalmente para ver todos os marcos · toque para abrir detalhes
        </p>
      </div>

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
