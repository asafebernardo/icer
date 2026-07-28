import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

interface TimelineHorizontalScrollProps {
  children: ReactNode;
  className?: string;
  trackClassName?: string;
  ariaLabel?: string;
}

function TimelineHorizontalScroll({
  children,
  className,
  trackClassName,
  ariaLabel = "Linha do tempo horizontal",
}: TimelineHorizontalScrollProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ active: false, startX: 0, scrollLeft: 0 });
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateHints = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return undefined;

    updateHints();
    el.addEventListener("scroll", updateHints, { passive: true });
    const ro = new ResizeObserver(updateHints);
    ro.observe(el);

    return () => {
      el.removeEventListener("scroll", updateHints);
      ro.disconnect();
    };
  }, [updateHints, children]);

  const scrollBy = useCallback((direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const step = Math.max(el.clientWidth * 0.65, 280);
    el.scrollBy({
      left: direction === "left" ? -step : step,
      behavior: "smooth",
    });
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.target instanceof Element && e.target.closest("button")) return;
    const el = scrollRef.current;
    if (!el || e.button !== 0) return;
    dragRef.current = {
      active: true,
      startX: e.clientX,
      scrollLeft: el.scrollLeft,
    };
    el.setPointerCapture(e.pointerId);
    el.classList.add("is-dragging");
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    if (!el || !dragRef.current.active) return;
    const dx = e.clientX - dragRef.current.startX;
    el.scrollLeft = dragRef.current.scrollLeft - dx;
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    if (!el) return;
    dragRef.current.active = false;
    el.classList.remove("is-dragging");
    try {
      el.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    updateHints();
  }, [updateHints]);

  const onWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    if (!el) return;
    const delta =
      Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (delta === 0) return;
    e.preventDefault();
    el.scrollLeft += delta;
    updateHints();
  }, [updateHints]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        scrollBy("left");
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        scrollBy("right");
      }
    },
    [scrollBy],
  );

  return (
    <div className={cn("relative", className)}>
      <span
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-[#0B0B0F] via-[#0B0B0F]/80 to-transparent sm:w-16"
        aria-hidden
      />
      <span
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-[#0B0B0F] via-[#0B0B0F]/80 to-transparent sm:w-16"
        aria-hidden
      />

      <button
        type="button"
        onClick={() => scrollBy("left")}
        disabled={!canScrollLeft}
        aria-label="Ver eventos anteriores"
        className={cn(
          "absolute left-1 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full",
          "border border-white/[0.1] bg-[#16181D]/90 text-[#B5B5B5] shadow-lg backdrop-blur-md",
          "transition hover:border-[#3B82F6]/40 hover:text-white",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]/50",
          "disabled:pointer-events-none disabled:opacity-0",
          "sm:left-2",
        )}
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      <button
        type="button"
        onClick={() => scrollBy("right")}
        disabled={!canScrollRight}
        aria-label="Ver eventos seguintes"
        className={cn(
          "absolute right-1 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full",
          "border border-white/[0.1] bg-[#16181D]/90 text-[#B5B5B5] shadow-lg backdrop-blur-md",
          "transition hover:border-[#3B82F6]/40 hover:text-white",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]/50",
          "disabled:pointer-events-none disabled:opacity-0",
          "sm:right-2",
        )}
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      <div
        ref={scrollRef}
        className={cn(
          "overflow-x-auto px-8 pb-1 sm:px-12",
          "cursor-grab active:cursor-grabbing",
          "[&.is-dragging]:scroll-auto [&.is-dragging]:select-none",
          "[-ms-overflow-style:none] [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.15)_transparent]",
          "[&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/15",
          trackClassName,
        )}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
        onKeyDown={onKeyDown}
        role="region"
        aria-label={ariaLabel}
        tabIndex={0}
      >
        {children}
      </div>

      <p className="mt-2 text-center text-[10px] tracking-wide text-[#64748B]/70">
        Arraste ou use as setas para navegar
      </p>
    </div>
  );
}

export default memo(TimelineHorizontalScroll);
