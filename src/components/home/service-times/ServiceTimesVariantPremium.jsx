import BackgroundSlideshow from "@/components/shared/BackgroundSlideshow";
import ComoChegarButton from "@/components/home/service-times/ComoChegarButton";
import ServiceTimesEditChip from "@/components/home/service-times/ServiceTimesEditChip";
import { cn } from "@/lib/utils";

/**
 * Variação premium — foto grande com overlay e tipografia emocional.
 */
export default function ServiceTimesVariantPremium({
  standalone,
  events,
  canEdit,
  onEdit,
  mapsHref,
  slideshow,
  sectionBgUrl,
}) {
  const featured = events.find((e) => e.highlight) || events[0];
  const others = events.filter((e) => e.id !== featured?.id);
  const heroUrls =
    featured?.images?.length > 0
      ? featured.images
      : sectionBgUrl
        ? [sectionBgUrl]
        : [];

  return (
    <section className={cn(standalone ? "" : "")}>
      <div className="relative min-h-[min(72vh,40rem)] overflow-hidden bg-[#0B0D0F] text-white">
        {heroUrls.length > 0 ? (
          <div className="absolute inset-0">
            <BackgroundSlideshow
              urls={heroUrls}
              rotateIntervalMs={slideshow.rotateIntervalMs}
              transitionMs={slideshow.transitionMs}
              transitionMode={slideshow.transitionMode}
            />
          </div>
        ) : (
          <div className="absolute inset-0 bg-[#171A1E]" aria-hidden />
        )}
        <div
          className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/55 to-black/35"
          aria-hidden
        />

        <div className="container-page relative z-10 flex min-h-[min(72vh,40rem)] flex-col justify-end py-12 sm:py-16 lg:py-20">
          {featured && canEdit ? (
            <ServiceTimesEditChip
              onClick={() => onEdit(featured.raw)}
              onDark
            />
          ) : null}
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/70">
            {standalone ? "Cultos" : "Nossos cultos"}
          </p>
          <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#7FA6C9]">
            Próximo culto
          </p>
          <h2 className="mt-3 max-w-3xl font-display text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
            {featured?.title || "Horários de culto"}
          </h2>
          {featured?.dateLabel ? (
            <p className="mt-5 text-lg text-white/90 sm:text-xl">
              {featured.dateLabel}
            </p>
          ) : null}
          {featured?.location ? (
            <p className="mt-2 text-sm text-white/65">{featured.location}</p>
          ) : null}
          {featured?.description ? (
            <p className="mt-5 max-w-xl text-base leading-relaxed text-white/75">
              {featured.description}
            </p>
          ) : null}
          <div className="mt-8">
            <ComoChegarButton href={mapsHref} light />
          </div>
        </div>
      </div>

      {others.length > 0 ? (
        <div className="border-t border-[#171A1D]/8 bg-[#F5F5F3]">
          <div className="container-page py-10 sm:py-12">
            <p className="mb-6 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6B7075]">
              Outros horários
            </p>
            <ul className="grid grid-cols-1 gap-x-10 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
              {others.map((ev) => (
                <li key={ev.id} className="relative border-t border-[#171A1D]/10 pt-4">
                  {canEdit ? (
                    <ServiceTimesEditChip onClick={() => onEdit(ev.raw)} />
                  ) : null}
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6B7075]">
                    {ev.category}
                  </p>
                  <h3 className="mt-1 font-display text-lg font-semibold text-[#171A1D]">
                    {ev.title}
                  </h3>
                  <p className="mt-1 text-sm text-[#315A7D]">{ev.dateLabel}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </section>
  );
}
