import ComoChegarButton from "@/components/home/service-times/ComoChegarButton";
import ServiceTimesEditChip from "@/components/home/service-times/ServiceTimesEditChip";
import { cn } from "@/lib/utils";

/**
 * Variação moderna (candidata padrão) — card grande do próximo culto + cards menores.
 */
export default function ServiceTimesVariantModern({
  standalone,
  events,
  canEdit,
  onEdit,
  mapsHref,
}) {
  const featured = events.find((e) => e.highlight) || events[0];
  const others = events.filter((e) => e.id !== featured?.id);

  return (
    <section
      className={cn(
        "border-t border-[#171A1D]/6 bg-[#F5F5F3] text-[#171A1D]",
        standalone ? "py-12 sm:py-16 lg:py-20" : "py-16 sm:py-20 lg:py-24",
      )}
    >
      <div className="container-page min-w-0">
        <header className="mx-auto mb-10 max-w-2xl text-center sm:mb-14">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#315A7D]">
            {standalone ? "Cultos" : "Nossos cultos"}
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Nossos Cultos
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-[#6B7075]">
            Participe dos nossos encontros semanais. Há sempre um lugar para
            você.
          </p>
        </header>

        {featured ? (
          <article className="relative overflow-hidden rounded-md border border-[#171A1D]/8 bg-white p-6 shadow-[0_1px_2px_rgba(23,26,29,0.04)] sm:p-8 lg:p-10">
            {canEdit ? (
              <ServiceTimesEditChip onClick={() => onEdit(featured.raw)} />
            ) : null}
            <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0 max-w-2xl">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#315A7D]">
                  Próximo culto
                </p>
                <h3 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl lg:text-[2.75rem]">
                  {featured.title}
                </h3>
                <p className="mt-4 text-lg font-medium text-[#315A7D]">
                  {featured.dateLabel}
                </p>
                {featured.location ? (
                  <p className="mt-2 text-sm text-[#6B7075]">{featured.location}</p>
                ) : null}
                {featured.description ? (
                  <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-[#6B7075]">
                    {featured.description}
                  </p>
                ) : null}
              </div>
              <div className="shrink-0">
                <ComoChegarButton href={mapsHref} />
              </div>
            </div>
          </article>
        ) : null}

        {others.length > 0 ? (
          <div className="mt-4 grid grid-cols-1 gap-3 sm:mt-5 sm:grid-cols-2 lg:grid-cols-3">
            {others.map((ev) => (
              <article
                key={ev.id}
                className="relative rounded-md border border-[#171A1D]/8 bg-white p-5 shadow-[0_1px_2px_rgba(23,26,29,0.03)]"
              >
                {canEdit ? (
                  <ServiceTimesEditChip onClick={() => onEdit(ev.raw)} />
                ) : null}
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6B7075]">
                  {ev.category}
                </p>
                <h4 className="mt-2 font-display text-xl font-semibold tracking-tight">
                  {ev.title}
                </h4>
                <p className="mt-2 text-sm font-medium text-[#315A7D]">
                  {ev.dateLabel}
                </p>
                {ev.description ? (
                  <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-[#6B7075]">
                    {ev.description}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
