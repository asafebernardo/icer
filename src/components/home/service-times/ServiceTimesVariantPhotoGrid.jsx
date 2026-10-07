import { motion } from "framer-motion";
import { MapPin } from "lucide-react";

import BackgroundSlideshow from "@/components/shared/BackgroundSlideshow";
import ComoChegarButton from "@/components/home/service-times/ComoChegarButton";
import ServiceTimesEditChip from "@/components/home/service-times/ServiceTimesEditChip";
import { imageScrimBottom, imageScrimFlat } from "@/lib/imageScrimClasses";
import { cn } from "@/lib/utils";

function photosForEvent(ev) {
  if (!ev?.hasOwnImage) return [];
  return Array.isArray(ev.images) ? ev.images.filter(Boolean) : [];
}

function PhotoEventCard({
  ev,
  featured = false,
  canEdit,
  onEdit,
  mapsHref,
  slideshow,
}) {
  const photos = photosForEvent(ev);
  const hasPhotos = photos.length > 0;
  const maps = ev?.mapsHref || mapsHref;

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45 }}
      className={cn(
        "relative flex min-w-0 flex-col overflow-hidden border border-border/70 bg-muted",
        featured
          ? "min-h-[min(420px,58vh)] sm:col-span-2 sm:min-h-[min(460px,56vh)]"
          : "min-h-[min(280px,42vh)] sm:min-h-[300px]",
      )}
    >
      {canEdit ? (
        <ServiceTimesEditChip onClick={() => onEdit(ev.raw)} onDark={hasPhotos} />
      ) : null}

      {hasPhotos ? (
        <div className="absolute inset-0">
          <BackgroundSlideshow
            urls={photos}
            rotateIntervalMs={slideshow.rotateIntervalMs}
            transitionMs={slideshow.transitionMs}
            transitionMode={slideshow.transitionMode}
          />
        </div>
      ) : (
        <div
          className={cn(
            "absolute inset-0",
            featured
              ? "bg-gradient-to-br from-primary to-primary-hover"
              : "bg-gradient-to-br from-card to-muted",
          )}
          aria-hidden
        />
      )}

      {hasPhotos ? (
        <>
          <div className={imageScrimFlat} aria-hidden />
          <div className={imageScrimBottom} aria-hidden />
        </>
      ) : null}

      <div
        className={cn(
          "relative z-20 mt-auto flex flex-1 flex-col justify-end",
          featured ? "px-6 py-6 sm:px-10 sm:py-9" : "px-5 py-5 sm:px-6 sm:py-6",
          hasPhotos || featured ? "text-white" : "text-foreground",
        )}
      >
        <p
          className={cn(
            "text-[10px] font-semibold uppercase tracking-[0.2em]",
            hasPhotos || featured ? "text-white/75" : "text-muted-foreground",
          )}
        >
          {ev.category}
        </p>
        <h3
          className={cn(
            "mt-2 font-serif font-semibold leading-tight tracking-tight",
            featured ? "text-3xl sm:text-4xl lg:text-[2.6rem]" : "text-xl sm:text-2xl",
            hasPhotos || featured
              ? "[text-shadow:0_1px_2px_rgba(0,0,0,0.45)]"
              : "",
          )}
        >
          {ev.title}
        </h3>
        {ev.dateLabel ? (
          <p
            className={cn(
              "mt-2 font-medium",
              featured ? "text-base sm:text-lg" : "text-sm",
              hasPhotos || featured
                ? "text-white/90 [text-shadow:0_1px_2px_rgba(0,0,0,0.4)]"
                : "text-primary",
            )}
          >
            {ev.dateLabel}
          </p>
        ) : null}
        {featured && ev.location ? (
          <p className="mt-3 flex items-start gap-2 text-sm text-white/75">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>{ev.location}</span>
          </p>
        ) : null}
        {ev.description ? (
          <p
            className={cn(
              "mt-3 leading-relaxed",
              featured
                ? "max-w-2xl text-[15px] sm:text-base"
                : "line-clamp-2 text-sm",
              hasPhotos || featured ? "text-white/85" : "text-muted-foreground",
            )}
          >
            {ev.description}
          </p>
        ) : null}
        {featured ? (
          <div className="mt-6">
            <ComoChegarButton href={maps} light={hasPhotos || featured} />
          </div>
        ) : null}
      </div>
    </motion.article>
  );
}

export default function ServiceTimesVariantPhotoGrid({
  standalone,
  events,
  canEdit,
  onEdit,
  mapsHref,
  slideshow,
}) {
  const featured = events.find((ev) => ev.highlight) || events[0] || null;
  const others = events.filter((ev) => ev.id !== featured?.id);

  if (events.length === 0) {
    return (
      <section className="border-t border-border/40 bg-background py-16 text-foreground">
        <div className="container-page text-center">
          <p className="text-sm text-muted-foreground">
            Nenhum horário de culto publicado ainda.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      className={cn(
        "border-t border-border/40 bg-background text-foreground",
        standalone ? "py-10 sm:py-14" : "py-16 sm:py-20",
      )}
      aria-label="Cultos e encontros"
    >
      <div className="container-page">
        <header className="mx-auto mb-8 max-w-2xl text-center sm:mb-12">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            {standalone ? "Cultos" : "Nossos cultos"}
          </p>
          <h2 className="mt-3 font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
            Horários
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
            Todos os encontros da semana, cada um com a sua foto.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
          {featured ? (
            <PhotoEventCard
              ev={featured}
              featured
              canEdit={canEdit}
              onEdit={onEdit}
              mapsHref={mapsHref}
              slideshow={slideshow}
            />
          ) : null}
          {others.map((ev) => (
            <PhotoEventCard
              key={ev.id}
              ev={ev}
              canEdit={canEdit}
              onEdit={onEdit}
              mapsHref={mapsHref}
              slideshow={slideshow}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
