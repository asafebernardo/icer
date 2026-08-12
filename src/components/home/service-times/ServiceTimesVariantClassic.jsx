import { motion } from "framer-motion";

import BackgroundSlideshow from "@/components/shared/BackgroundSlideshow";
import HomeSectionBackdrop from "@/components/home/HomeSectionBackdrop";
import ServiceTimesEditChip from "@/components/home/service-times/ServiceTimesEditChip";
import { normalizeCardImages } from "@/components/home/service-times/serviceTimesModel";
import { homeSectionSolidContent } from "@/lib/homeSectionSolidClasses";
import { imageScrimBottom, imageScrimFlat } from "@/lib/imageScrimClasses";
import { cn } from "@/lib/utils";

/**
 * Layout anterior (grelha destaque + cards) — fácil reverter no seletor DEV.
 */
export default function ServiceTimesVariantClassic({
  standalone,
  sectionBgUrl,
  events,
  canEdit,
  onEdit,
  slideshow,
}) {
  const solidHeader = !sectionBgUrl;

  return (
    <HomeSectionBackdrop
      imageUrl={sectionBgUrl}
      className={cn(
        standalone
          ? "border-t border-border/60 py-10 sm:py-14 lg:py-20"
          : "py-16 sm:py-20 lg:py-28",
      )}
    >
      <div className="container-page min-w-0">
        <div
          className={cn(
            "mb-12 flex flex-col items-center text-center sm:mb-16",
            solidHeader && homeSectionSolidContent,
          )}
        >
          <span className="mb-3 text-sm font-semibold uppercase tracking-wider text-accent">
            {standalone ? "Cultos" : "Nossos cultos"}
          </span>
          <h2 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Horários de Funcionamento
          </h2>
          <div className="mt-4 h-1 w-16 rounded-full bg-accent/60" />
          <p className="mt-5 max-w-xl text-muted-foreground">
            Participe dos nossos encontros semanais. Há sempre um lugar para
            você.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
          {events.map((ev, index) => {
            const urls = normalizeCardImages(ev.raw);
            const hasImages = urls.length > 0;
            const isHighlight = ev.highlight;

            return (
              <motion.div
                key={ev.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05, duration: 0.45 }}
                className={cn(
                  "relative flex w-full flex-col overflow-hidden rounded-sm border shadow-card",
                  isHighlight
                    ? "min-h-[min(360px,44vh)] border-accent/40 ring-2 ring-accent/70 sm:col-span-2 sm:min-h-[min(420px,48vh)]"
                    : "min-h-[min(280px,34vh)] border-border/80 sm:min-h-[min(300px,36vh)]",
                )}
              >
                {canEdit ? (
                  <ServiceTimesEditChip
                    onClick={() => onEdit(ev.raw)}
                    onDark={hasImages || isHighlight}
                  />
                ) : null}

                {hasImages ? (
                  <>
                    <div className="absolute inset-0 z-0">
                      <BackgroundSlideshow
                        urls={urls}
                        rotateIntervalMs={slideshow.rotateIntervalMs}
                        transitionMs={slideshow.transitionMs}
                        transitionMode={slideshow.transitionMode}
                      />
                    </div>
                    <div className={imageScrimFlat} aria-hidden />
                    <div className={imageScrimBottom} aria-hidden />
                  </>
                ) : (
                  <>
                    <div
                      className={cn(
                        "absolute inset-0 z-0",
                        isHighlight
                          ? "bg-gradient-to-br from-primary to-primary-hover"
                          : "bg-gradient-to-br from-card to-muted/80",
                      )}
                      aria-hidden
                    />
                    <div
                      className={cn(
                        "pointer-events-none absolute bottom-0 left-0 right-0 z-[1] h-[55%] min-h-[140px] bg-gradient-to-t",
                        isHighlight
                          ? "from-black/35 via-black/15 to-transparent"
                          : "from-black/22 via-black/8 to-transparent",
                      )}
                      aria-hidden
                    />
                  </>
                )}

                <div
                  className={cn(
                    "relative z-20 mt-auto flex min-h-[140px] flex-1 flex-col justify-end",
                    isHighlight
                      ? "min-h-[min(180px,28vh)] px-6 py-6 sm:min-h-[200px] sm:px-10 sm:py-8"
                      : "px-5 py-5 sm:px-6 sm:py-6",
                    hasImages || isHighlight ? "text-white" : "text-foreground",
                  )}
                >
                  {isHighlight ? (
                    <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-white/85 sm:mb-3 sm:text-sm">
                      Destaque
                    </p>
                  ) : null}
                  <h3
                    className={cn(
                      "mb-2 font-display font-semibold leading-tight [text-shadow:0_1px_2px_rgba(0,0,0,0.45)]",
                      isHighlight
                        ? "text-2xl sm:text-3xl lg:text-4xl"
                        : "text-xl sm:text-2xl",
                      !hasImages && !isHighlight && "text-foreground [text-shadow:none]",
                    )}
                  >
                    {ev.title}
                  </h3>
                  <p
                    className={cn(
                      "mb-3 font-medium",
                      isHighlight ? "text-base sm:text-lg" : "text-sm",
                      hasImages || isHighlight
                        ? "text-white/92 [text-shadow:0_1px_2px_rgba(0,0,0,0.4)]"
                        : "text-accent",
                    )}
                  >
                    {ev.dateLabel}
                  </p>
                  {ev.description ? (
                    <p
                      className={cn(
                        "max-w-prose leading-relaxed",
                        isHighlight
                          ? "max-w-3xl text-base sm:text-[1.05rem]"
                          : "text-sm",
                        hasImages || isHighlight
                          ? "text-white/90 [text-shadow:0_1px_3px_rgba(0,0,0,0.55)]"
                          : "text-muted-foreground",
                      )}
                    >
                      {ev.description}
                    </p>
                  ) : null}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </HomeSectionBackdrop>
  );
}
