import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import HistoryDetails from "@/components/historia/history/HistoryDetails";
import HistoryProgress from "@/components/historia/history/HistoryProgress";
import HistoryTimeline from "@/components/historia/history/HistoryTimeline";
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
  const [imageIndex, setImageIndex] = useState(0);
  const detailsRef = useRef<HTMLElement>(null);

  const activeEvent = events[activeIndex];
  const total = events.length;

  const scrollToDetails = useCallback(() => {
    detailsRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, []);

  const goTo = useCallback(
    (index: number, opts?: { scrollDetails?: boolean }) => {
      const next = Math.max(0, Math.min(total - 1, index));
      setActiveIndex(next);
      setImageIndex(0);
      if (opts?.scrollDetails) {
        requestAnimationFrame(() => scrollToDetails());
      }
    },
    [total, scrollToDetails],
  );

  const goPrev = useCallback(
    () =>
      goTo(activeIndex - 1, {
        scrollDetails: window.matchMedia("(max-width: 767px)").matches,
      }),
    [activeIndex, goTo],
  );
  const goNext = useCallback(
    () =>
      goTo(activeIndex + 1, {
        scrollDetails: window.matchMedia("(max-width: 767px)").matches,
      }),
    [activeIndex, goTo],
  );

  const handleSelect = useCallback(
    (index: number) => {
      goTo(index, { scrollDetails: true });
    },
    [goTo],
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLElement &&
        (e.target.isContentEditable ||
          e.target.tagName === "INPUT" ||
          e.target.tagName === "TEXTAREA")
      ) {
        return;
      }

      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          goPrev();
          break;
        case "ArrowRight":
          e.preventDefault();
          goNext();
          break;
        case "Home":
          e.preventDefault();
          goTo(0);
          break;
        case "End":
          e.preventDefault();
          goTo(total - 1);
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goPrev, goNext, goTo, total]);

  if (!activeEvent) return null;

  return (
    <section
      className={cn("relative", className)}
      aria-label="Exposição histórica do Movimento dos Irmãos"
    >
      <p className="sr-only">
        Use as setas esquerda e direita para navegar entre eventos. Home e End
        vão ao primeiro e último evento.
      </p>
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(ellipse_70%_55%_at_50%_0%,rgba(59,130,246,0.05),transparent_72%)]"
        aria-hidden
      />

      <HistoryProgress current={activeIndex + 1} total={total} />

      <HistoryTimeline
        events={events}
        activeIndex={activeIndex}
        onSelect={handleSelect}
      />

      <section
        ref={detailsRef}
        id="historia-detalhes"
        className="mt-8 scroll-mt-24 sm:mt-10"
        aria-label="Detalhes do evento selecionado"
      >
        <HistoryDetails
          event={activeEvent}
          imageIndex={imageIndex}
          onImageIndexChange={setImageIndex}
          onPrev={goPrev}
          onNext={goNext}
          canPrev={activeIndex > 0}
          canNext={activeIndex < total - 1}
          current={activeIndex + 1}
          total={total}
        />
      </section>
    </section>
  );
}

export default memo(HistorySection);
