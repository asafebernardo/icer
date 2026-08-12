import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MapPin } from "lucide-react";

import BackgroundSlideshow from "@/components/shared/BackgroundSlideshow";
import ComoChegarButton from "@/components/home/service-times/ComoChegarButton";
import ServiceTimesEditChip from "@/components/home/service-times/ServiceTimesEditChip";
import { useTheme } from "@/lib/ThemeContext";
import usePrefersReducedMotion from "@/lib/usePrefersReducedMotion";
import { cn } from "@/lib/utils";

/** Fotos do culto ativo (todas as publicadas; senão a capa/placeholder). */
function photosForEvent(ev) {
  const list = Array.isArray(ev?.images) ? ev.images.filter(Boolean) : [];
  if (list.length > 0) return list;
  if (ev?.image) return [ev.image];
  return [];
}

/**
 * Editorial com carrossel aninhado:
 * 1) troca fotos do culto ativo (BackgroundSlideshow);
 * 2) ao acabar o ciclo de fotos (ou 1 foto), avança para o próximo culto.
 * Um único timer — sem conflito entre foto e evento.
 */
export default function ServiceTimesVariantEditorial({
  standalone,
  events,
  canEdit,
  onEdit,
  mapsHref,
  slideshow,
}) {
  const { isDark } = useTheme();
  const reduceMotion = usePrefersReducedMotion();
  const [eventIndex, setEventIndex] = useState(0);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  const eventIndexRef = useRef(0);
  const photoIndexRef = useRef(0);
  eventIndexRef.current = eventIndex;
  photoIndexRef.current = photoIndex;

  const eventKey = useMemo(
    () =>
      events
        .map((e) => `${e.id}:${(e.images || []).join(",")}`)
        .join("|"),
    [events],
  );

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    setEventIndex(0);
    setPhotoIndex(0);
  }, [eventKey]);

  useEffect(() => {
    if (events.length === 0) {
      setEventIndex(0);
      setPhotoIndex(0);
      return;
    }
    if (eventIndex > events.length - 1) {
      setEventIndex(events.length - 1);
      setPhotoIndex(0);
    }
  }, [events.length, eventIndex]);

  const safeEventIndex = events.length
    ? Math.max(0, Math.min(events.length - 1, eventIndex))
    : 0;
  const active = events[safeEventIndex] || null;
  const activePhotos = useMemo(
    () => photosForEvent(active),
    [active],
  );
  const safePhotoIndex = activePhotos.length
    ? Math.max(0, Math.min(activePhotos.length - 1, photoIndex))
    : 0;

  useEffect(() => {
    if (photoIndex > Math.max(0, activePhotos.length - 1)) {
      setPhotoIndex(0);
    }
  }, [activePhotos.length, photoIndex]);

  const selectEvent = useCallback((i) => {
    setEventIndex(i);
    setPhotoIndex(0);
  }, []);

  const rotateMs = isMobile
    ? Math.max(slideshow.rotateIntervalMs * 1.6, 6500)
    : slideshow.rotateIntervalMs;

  /** Um tick: próxima foto; se era a última, próximo culto + foto 0. */
  useEffect(() => {
    if (reduceMotion) return undefined;
    if (events.length === 0) return undefined;

    const needsTick =
      events.length > 1 ||
      photosForEvent(events[safeEventIndex]).length > 1;
    if (!needsTick) return undefined;

    const t = window.setInterval(() => {
      const ei = eventIndexRef.current;
      const ev = events[ei];
      if (!ev) return;
      const photos = photosForEvent(ev);
      const pi = photoIndexRef.current;

      if (photos.length > 1 && pi + 1 < photos.length) {
        setPhotoIndex(pi + 1);
        return;
      }

      // Fim do ciclo de fotos (ou culto com 1 foto) → próximo evento
      if (events.length > 1) {
        const nextEvent = (ei + 1) % events.length;
        setEventIndex(nextEvent);
        setPhotoIndex(0);
        return;
      }

      // Um só culto com várias fotos: reinicia o ciclo
      setPhotoIndex(0);
    }, rotateMs);

    return () => window.clearInterval(t);
  }, [events, rotateMs, reduceMotion, safeEventIndex, eventKey]);

  const durSec = slideshow.transitionMs / 1000;
  const whenLabel = [active?.date, active?.time].filter(Boolean).join(" · ");
  const maps = active?.mapsHref || mapsHref;

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
      className="border-t border-border/40 bg-background text-foreground"
      aria-roledescription="carousel"
      aria-label="Cultos e encontros"
    >
      <div className="grid min-h-[min(88vh,52rem)] lg:grid-cols-12">
        <div className="relative min-h-[min(48vh,22rem)] overflow-hidden bg-muted lg:col-span-7 lg:min-h-0">
          {activePhotos.length > 0 ? (
            <BackgroundSlideshow
              key={active?.id || safeEventIndex}
              urls={activePhotos}
              index={safePhotoIndex}
              onIndexChange={setPhotoIndex}
              autoplay={false}
              rotateIntervalMs={rotateMs}
              transitionMs={slideshow.transitionMs}
              transitionMode={slideshow.transitionMode}
            />
          ) : null}

          {/* Indicadores de foto (só se o culto ativo tiver várias) */}
          {activePhotos.length > 1 ? (
            <div
              className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 gap-1.5"
              aria-label="Fotos deste culto"
            >
              {activePhotos.map((_, i) => (
                <button
                  key={`photo-${active?.id}-${i}`}
                  type="button"
                  aria-label={`Foto ${i + 1} de ${activePhotos.length}`}
                  aria-current={i === safePhotoIndex ? "true" : undefined}
                  onClick={() => setPhotoIndex(i)}
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    i === safePhotoIndex
                      ? "w-5 bg-primary-foreground/90"
                      : "w-1.5 bg-primary-foreground/40 hover:bg-primary-foreground/60",
                  )}
                />
              ))}
            </div>
          ) : null}

          <div
            className={cn(
              "pointer-events-none absolute inset-0",
              "bg-gradient-to-t from-background via-background/30 to-transparent",
              "lg:bg-gradient-to-r lg:from-transparent lg:via-background/20 lg:to-background/90",
            )}
            aria-hidden
          />
        </div>

        <div className="relative flex flex-col justify-between bg-background px-5 py-8 sm:px-8 sm:py-10 lg:col-span-5 lg:px-10 lg:py-14 xl:px-14">
          {active && canEdit ? (
            <ServiceTimesEditChip
              onClick={() => onEdit(active.raw)}
              onDark={isDark}
            />
          ) : null}

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
              {standalone ? "Cultos" : "Nossos cultos"}
            </p>

            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={active?.id || safeEventIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{
                  duration: Math.min(durSec, 0.55),
                  ease: [0.4, 0, 0.2, 1],
                }}
                className="mt-6"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  {active?.category}
                </p>
                <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-[2.75rem] lg:leading-[1.1]">
                  {active?.title}
                </h2>

                {whenLabel ? (
                  <p className="mt-5 text-lg text-primary sm:text-xl">
                    {whenLabel}
                  </p>
                ) : active?.dateLabel ? (
                  <p className="mt-5 text-lg text-primary sm:text-xl">
                    {active.dateLabel}
                  </p>
                ) : null}

                {active?.location ? (
                  <p className="mt-3 flex items-start gap-2 text-sm leading-relaxed text-muted-foreground">
                    <MapPin
                      className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/80"
                      aria-hidden
                    />
                    <span>{active.location}</span>
                  </p>
                ) : null}

                {active?.description ? (
                  <p className="mt-5 max-w-md text-[15px] leading-relaxed text-muted-foreground">
                    {active.description}
                  </p>
                ) : null}

                <div className="mt-8">
                  <ComoChegarButton href={maps} />
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {events.length > 1 ? (
            <div
              className="mt-10 flex flex-wrap items-center gap-2 lg:mt-12"
              role="tablist"
              aria-label="Selecionar culto"
            >
              {events.map((ev, i) => {
                const selected = i === safeEventIndex;
                return (
                  <button
                    key={ev.id || `ev-${i}`}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    aria-label={`${ev.category}: ${ev.title}`}
                    onClick={() => selectEvent(i)}
                    className={cn(
                      "min-h-11 rounded-sm px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors",
                      selected
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground",
                    )}
                  >
                    <span className="block max-w-[9rem] truncate sm:max-w-none">
                      {ev.category}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>

      {events.length > 1 ? (
        <div className="flex justify-center gap-2 border-t border-border/50 px-4 py-4 lg:hidden">
          {events.map((ev, i) => (
            <button
              key={`dot-${ev.id || i}`}
              type="button"
              aria-label={`Ir para ${ev.title}`}
              aria-current={i === safeEventIndex ? "true" : undefined}
              onClick={() => selectEvent(i)}
              className={cn(
                "h-2.5 rounded-full transition-all",
                i === safeEventIndex
                  ? "w-7 bg-primary"
                  : "w-2.5 bg-muted-foreground/35 hover:bg-muted-foreground/55",
              )}
            />
          ))}
        </div>
      ) : null}

      {/* Todos os tipos de culto — sempre visíveis (além do destaque editorial) */}
      {events.length > 1 ? (
        <div className="border-t border-border/40 bg-background">
          <div className="container-page py-10 sm:py-12">
            <p className="mb-6 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Todos os horários
            </p>
            <ul className="grid grid-cols-1 gap-x-10 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((ev, i) => {
                const selected = i === safeEventIndex;
                return (
                  <li key={ev.id || `list-${i}`} className="relative">
                    {canEdit ? (
                      <ServiceTimesEditChip
                        onClick={() => onEdit(ev.raw)}
                        onDark={false}
                      />
                    ) : null}
                    <button
                      type="button"
                      onClick={() => selectEvent(i)}
                      className={cn(
                        "w-full border-t pt-4 text-left transition-colors",
                        selected
                          ? "border-primary"
                          : "border-border/70 hover:border-primary/50",
                      )}
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        {ev.category}
                      </p>
                      <h3
                        className={cn(
                          "mt-1 pr-16 font-display text-lg font-semibold",
                          selected ? "text-primary" : "text-foreground",
                        )}
                      >
                        {ev.title}
                      </h3>
                      <p className="mt-1 text-sm text-primary">{ev.dateLabel}</p>
                      {ev.description ? (
                        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                          {ev.description}
                        </p>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      ) : null}
    </section>
  );
}
