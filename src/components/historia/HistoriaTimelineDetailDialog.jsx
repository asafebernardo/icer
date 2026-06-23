import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import SafeImg from "@/components/shared/SafeImg";
import { cn } from "@/lib/utils";

/**
 * @param {{
 *   item: import("@/lib/historiaTimelineExamples").HistoriaTimelineItem | null;
 *   open: boolean;
 *   onOpenChange: (open: boolean) => void;
 * }} props
 */
export default function HistoriaTimelineDetailDialog({ item, open, onOpenChange }) {
  const images = item?.images?.length ? item.images : [];
  const [imageIndex, setImageIndex] = useState(0);

  useEffect(() => {
    setImageIndex(0);
  }, [item?.year, item?.title]);

  const activeImage = images[imageIndex] ?? null;
  const hasMultiple = images.length > 1;

  const handleOpenChange = (next) => {
    if (!next) setImageIndex(0);
    onOpenChange(next);
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[min(92vh,900px)] max-w-[min(calc(100vw-1.5rem),40rem)] gap-0 overflow-hidden p-0 sm:rounded-2xl">
        {images.length > 0 ? (
          <div className="relative shrink-0 border-b border-border/80 bg-muted/20">
            <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted/40">
              <SafeImg
                key={activeImage?.src}
                src={activeImage.src}
                alt={activeImage.alt}
                className="h-full w-full object-cover"
              />
              <div
                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent"
                aria-hidden
              />
            </div>
            {hasMultiple ? (
              <>
                <button
                  type="button"
                  className="absolute left-3 top-1/2 z-[1] flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-border/80 bg-background/90 text-foreground shadow-md transition hover:bg-background"
                  aria-label="Imagem anterior"
                  onClick={() =>
                    setImageIndex((i) => (i - 1 + images.length) % images.length)
                  }
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  className="absolute right-3 top-1/2 z-[1] flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-border/80 bg-background/90 text-foreground shadow-md transition hover:bg-background"
                  aria-label="Imagem seguinte"
                  onClick={() => setImageIndex((i) => (i + 1) % images.length)}
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
                <div className="absolute bottom-3 left-1/2 z-[1] flex -translate-x-1/2 gap-1.5">
                  {images.map((img, idx) => (
                    <button
                      key={img.src}
                      type="button"
                      aria-label={`Ver imagem ${idx + 1}`}
                      aria-current={idx === imageIndex ? "true" : undefined}
                      className={cn(
                        "h-2 w-2 rounded-full transition-all",
                        idx === imageIndex
                          ? "w-5 bg-primary"
                          : "bg-primary/35 hover:bg-primary/55",
                      )}
                      onClick={() => setImageIndex(idx)}
                    />
                  ))}
                </div>
              </>
            ) : null}
            {activeImage?.caption ? (
              <p className="border-t border-border/60 px-4 py-2.5 text-xs leading-relaxed text-muted-foreground">
                {activeImage.caption}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="max-h-[min(50vh,420px)] overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
          <DialogHeader className="space-y-2 text-left">
            <time
              dateTime={item.year}
              className="font-display text-xs font-semibold uppercase tracking-[0.18em] text-accent"
            >
              {item.year}
            </time>
            <DialogTitle className="font-display text-xl leading-snug sm:text-2xl">
              {item.title}
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
              {item.description}
            </DialogDescription>
          </DialogHeader>

          {item.body ? (
            <p className="mt-4 text-sm leading-relaxed text-foreground/90">{item.body}</p>
          ) : null}

          {item.highlights?.length ? (
            <div className="mt-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Destaques
              </p>
              <ul className="mt-2 space-y-2">
                {item.highlights.map((line) => (
                  <li
                    key={line}
                    className="flex gap-2 text-sm leading-relaxed text-foreground/85"
                  >
                    <span
                      className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent"
                      aria-hidden
                    />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {hasMultiple ? (
            <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
              {images.map((img, idx) => (
                <button
                  key={`${img.src}-${idx}`}
                  type="button"
                  aria-label={img.alt}
                  aria-current={idx === imageIndex ? "true" : undefined}
                  className={cn(
                    "relative h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 transition",
                    idx === imageIndex
                      ? "border-primary ring-2 ring-primary/30"
                      : "border-border/70 opacity-80 hover:opacity-100",
                  )}
                  onClick={() => setImageIndex(idx)}
                >
                  <SafeImg src={img.src} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
