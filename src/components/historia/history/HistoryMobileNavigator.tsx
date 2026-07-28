import { memo, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, List } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { TimelineEvent } from "@/components/historia/history/types";
import HistoryVerticalTimelineList from "@/components/historia/history/HistoryVerticalTimelineList";
import { cn } from "@/lib/utils";

interface HistoryMobileNavigatorProps {
  events: TimelineEvent[];
  activeIndex: number;
  onSelect: (index: number) => void;
  onPrev: () => void;
  onNext: () => void;
  canPrev: boolean;
  canNext: boolean;
  className?: string;
}

/** Mobile: setas anterior/próximo + «Ver todos» (timeline vertical no painel). */
function HistoryMobileNavigator({
  events,
  activeIndex,
  onSelect,
  onPrev,
  onNext,
  canPrev,
  canNext,
  className,
}: HistoryMobileNavigatorProps) {
  const [indexOpen, setIndexOpen] = useState(false);
  const activeItemRef = useRef<HTMLLIElement>(null);

  const handleSelect = (index: number) => {
    onSelect(index);
    setIndexOpen(false);
  };

  useEffect(() => {
    if (!indexOpen) return undefined;
    const frame = requestAnimationFrame(() => {
      activeItemRef.current?.scrollIntoView({ block: "center" });
    });
    return () => cancelAnimationFrame(frame);
  }, [indexOpen, activeIndex]);

  if (events.length === 0) return null;

  return (
    <>
      <div
        className={cn("mb-4 space-y-2 sm:hidden", className)}
        role="navigation"
        aria-label="Navegação entre eventos"
      >
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onPrev}
            disabled={!canPrev}
            aria-label="Evento anterior"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-[#94A3B8] transition-colors hover:border-white/[0.14] hover:text-[#E2E8F0] disabled:opacity-30"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden />
          </button>

          <p
            className="text-center text-xs tabular-nums text-[#64748B]"
            aria-live="polite"
          >
            <span className="font-medium text-[#E2E8F0]">{activeIndex + 1}</span>
            {" / "}
            {events.length}
          </p>

          <button
            type="button"
            onClick={onNext}
            disabled={!canNext}
            aria-label="Próximo evento"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-[#94A3B8] transition-colors hover:border-white/[0.14] hover:text-[#E2E8F0] disabled:opacity-30"
          >
            <ChevronRight className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <button
          type="button"
          onClick={() => setIndexOpen(true)}
          aria-label="Ver todos os eventos da linha do tempo"
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-[11px] font-medium text-[#64748B] transition-colors hover:text-[#94A3B8]"
        >
          <List className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Ver todos os eventos
        </button>
      </div>

      <Sheet open={indexOpen} onOpenChange={setIndexOpen}>
        <SheetContent
          side="bottom"
          className="z-[60] flex h-[min(85vh,40rem)] max-h-[85vh] flex-col gap-0 overflow-hidden rounded-t-2xl border-white/[0.08] bg-[#12141A] p-0 pb-[max(1rem,env(safe-area-inset-bottom))]"
        >
          <SheetHeader className="shrink-0 space-y-1 border-b border-white/[0.06] px-4 py-4 text-left">
            <SheetTitle className="text-base text-[#F1F5F9]">
              Linha do tempo
            </SheetTitle>
            <p className="text-xs text-[#64748B]">
              {events.length} eventos — deslize para ver todos
            </p>
          </SheetHeader>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 [-webkit-overflow-scrolling:touch]">
            <HistoryVerticalTimelineList
              events={events}
              activeIndex={activeIndex}
              onSelect={handleSelect}
              activeItemRef={activeItemRef}
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

export default memo(HistoryMobileNavigator);
