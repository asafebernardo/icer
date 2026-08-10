import { memo, useState } from "react";
import { ZoomIn } from "lucide-react";

import HistoryGallery from "@/components/historia/history/HistoryGallery";
import HistoryImage from "@/components/historia/history/HistoryImage";
import HistoryImageLightbox from "@/components/historia/history/HistoryImageLightbox";
import {
  CATEGORY_COLORS,
  formatEventYear,
  type TimelineEvent,
} from "@/components/historia/history/types";
import { cn } from "@/lib/utils";

interface HistoryEventDetailProps {
  event: TimelineEvent;
  className?: string;
}

function getImageCaption(image: TimelineEvent["images"][number] | undefined) {
  if (!image) return null;
  const text = (image.caption ?? image.alt)?.trim();
  return text || null;
}

function HistoryEventDetail({ event, className }: HistoryEventDetailProps) {
  const [imageIndex, setImageIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const colors = CATEGORY_COLORS[event.category];
  const activeImage = event.images[imageIndex] ?? event.images[0];
  const caption = getImageCaption(activeImage);
  const paragraphs = event.content.split(/\n\n+/).filter(Boolean);

  return (
    <article className={cn(className)} aria-labelledby="historia-evento-titulo">
      <header className="border-b border-border pb-5 sm:pb-6">
        <time
          dateTime={event.yearLabel ? undefined : String(event.year)}
          className="font-display text-3xl font-bold tracking-[-0.03em] text-foreground sm:text-4xl lg:text-5xl"
        >
          {formatEventYear(event)}
        </time>
        <h1
          id="historia-evento-titulo"
          className="mt-2 font-display text-xl font-semibold leading-[1.25] tracking-[-0.02em] text-foreground sm:mt-3 sm:text-2xl lg:text-3xl"
        >
          {event.title}
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <span
            className="inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]"
            style={{ color: colors.accent, backgroundColor: colors.bg }}
          >
            {event.category}
          </span>
          {event.location ? (
            <span className="text-sm text-muted-foreground">{event.location}</span>
          ) : null}
        </div>
      </header>

      <div className="pt-5 sm:pt-6 lg:pt-8">
        {activeImage ? (
          <section
            className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
            aria-label="Imagem e conteúdo do evento"
          >
            <figure className="border-b border-border bg-muted/20">
              <button
                type="button"
                onClick={() => setLightboxOpen(true)}
                className="group relative block w-full cursor-zoom-in text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                aria-label={`Ver imagem ampliada: ${activeImage.alt}`}
              >
                <HistoryImage
                  src={activeImage.src}
                  alt={activeImage.alt}
                  priority
                  className="mx-auto w-full max-w-lg px-3 py-2 sm:max-w-xl sm:px-4 sm:py-3"
                  imgClassName="mx-auto h-auto w-full max-h-[140px] object-contain sm:max-h-[180px] md:max-h-[200px]"
                />
                <span className="pointer-events-none absolute inset-x-3 bottom-3 flex justify-end sm:inset-x-5 sm:bottom-5">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-background/90 px-3 py-1.5 text-xs font-medium text-foreground shadow-sm backdrop-blur-sm transition-opacity opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-visible:opacity-100">
                    <ZoomIn className="h-3.5 w-3.5" aria-hidden />
                    Ver ampliada
                  </span>
                </span>
              </button>

              {caption ? (
                <figcaption className="border-t border-border/60 px-4 py-2.5 text-sm leading-relaxed text-muted-foreground sm:px-5 sm:py-3">
                  {caption}
                </figcaption>
              ) : null}

              {event.images.length > 1 ? (
                <div className="border-t border-border/60 px-4 py-3 sm:px-5 sm:py-4">
                  <HistoryGallery
                    images={event.images}
                    activeIndex={imageIndex}
                    onSelect={setImageIndex}
                  />
                </div>
              ) : null}
            </figure>

            <div className="space-y-4 px-4 py-5 sm:space-y-5 sm:px-6 sm:py-6 lg:px-8 lg:py-7">
              {paragraphs.map((paragraph) => (
                <p
                  key={paragraph.slice(0, 48)}
                  className="text-base leading-[1.75] text-foreground/90 sm:text-[17px] sm:leading-[1.85]"
                >
                  {paragraph}
                </p>
              ))}
            </div>
          </section>
        ) : (
          <div className="space-y-4 sm:space-y-5">
            {paragraphs.map((paragraph) => (
              <p
                key={paragraph.slice(0, 48)}
                className="text-base leading-[1.75] text-foreground/90 sm:text-[17px] sm:leading-[1.85]"
              >
                {paragraph}
              </p>
            ))}
          </div>
        )}

        {event.references?.length ? (
          <div className="mt-6 border-t border-border pt-5 sm:mt-8 sm:pt-6">
            <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Referências
            </p>
            <ul className="space-y-2 text-sm leading-relaxed text-muted-foreground">
              {event.references.map((ref) => (
                <li key={ref}>{ref}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      {activeImage ? (
        <HistoryImageLightbox
          image={activeImage}
          caption={caption}
          open={lightboxOpen}
          onOpenChange={setLightboxOpen}
        />
      ) : null}
    </article>
  );
}

export default memo(HistoryEventDetail);
