import { useEffect, useRef } from "react";

function placeThumb(scroller, thumb) {
  const { scrollTop, scrollHeight, clientHeight } = scroller;
  const overflow = scrollHeight - clientHeight;
  if (overflow <= 1) {
    thumb.style.opacity = "0";
    return;
  }
  const padTop = 10;
  const padBottom = 56;
  const track = Math.max(0, clientHeight - padTop - padBottom);
  const size = Math.max(36, Math.min(track, (clientHeight / scrollHeight) * track));
  const travel = Math.max(0, track - size);
  const top = padTop + (scrollTop / overflow) * travel;
  thumb.style.opacity = "1";
  thumb.style.height = `${size}px`;
  thumb.style.transform = `translateY(${top}px)`;
}

export default function SongScroll({ children }) {
  const scrollerRef = useRef(null);
  const thumbRef = useRef(null);

  useEffect(() => {
    const scroller = scrollerRef.current;
    const thumb = thumbRef.current;
    if (!scroller || !thumb) return undefined;

    const update = () => placeThumb(scroller, thumb);
    update();
    scroller.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(scroller);
    for (const child of scroller.children) observer.observe(child);
    return () => {
      scroller.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, [children]);

  return (
    <div className="relative min-h-0 flex-1">
      <div ref={scrollerRef} className="song-scroll h-full overflow-y-auto overscroll-contain pb-16">
        {children}
      </div>
      <div
        ref={thumbRef}
        aria-hidden
        className="pointer-events-none absolute right-1.5 top-0 w-1 rounded-full bg-cl-ink-soft/70 opacity-0"
      />
    </div>
  );
}
