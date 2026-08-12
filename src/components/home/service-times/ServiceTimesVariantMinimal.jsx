import ComoChegarButton from "@/components/home/service-times/ComoChegarButton";
import ServiceTimesEditChip from "@/components/home/service-times/ServiceTimesEditChip";
import { cn } from "@/lib/utils";

/**
 * Variação minimalista — próximo culto em destaque, restantes compactos.
 */
export default function ServiceTimesVariantMinimal({
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
        "border-t border-black/5 bg-[#F4F4F2]",
        standalone ? "py-14 sm:py-20" : "py-16 sm:py-24",
      )}
    >
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <header className="mb-14 text-center sm:mb-16">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#315A7D]">
            {standalone ? "Cultos" : "Nossos cultos"}
          </p>
          <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight text-[#171A1D] sm:text-4xl">
            Horários de Funcionamento
          </h2>
          <p className="mx-auto mt-5 max-w-md text-[15px] leading-relaxed text-[#6B7075]">
            Encontros semanais para adorar, orar e crescer em comunidade.
          </p>
        </header>

        {featured ? (
          <article className="relative border-b border-[#171A1D]/10 pb-12 text-center">
            {canEdit ? (
              <ServiceTimesEditChip onClick={() => onEdit(featured.raw)} />
            ) : null}
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#315A7D]">
              Próximo culto
            </p>
            <h3 className="mt-4 font-display text-3xl font-semibold tracking-tight text-[#171A1D] sm:text-5xl">
              {featured.title}
            </h3>
            <p className="mt-4 text-lg text-[#315A7D] sm:text-xl">
              {featured.dateLabel}
            </p>
            {featured.location ? (
              <p className="mt-2 text-sm text-[#6B7075]">{featured.location}</p>
            ) : null}
            {featured.description ? (
              <p className="mx-auto mt-6 max-w-lg text-[15px] leading-relaxed text-[#6B7075]">
                {featured.description}
              </p>
            ) : null}
            <div className="mt-8 flex justify-center">
              <ComoChegarButton href={mapsHref} />
            </div>
          </article>
        ) : null}

        {others.length > 0 ? (
          <ul className="mt-10 divide-y divide-[#171A1D]/8">
            {others.map((ev) => (
              <li key={ev.id} className="relative py-5 sm:py-6">
                {canEdit ? (
                  <ServiceTimesEditChip onClick={() => onEdit(ev.raw)} />
                ) : null}
                <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6B7075]">
                      {ev.category}
                    </p>
                    <h4 className="mt-1 font-display text-lg font-semibold text-[#171A1D]">
                      {ev.title}
                    </h4>
                  </div>
                  <p className="shrink-0 text-sm text-[#315A7D] sm:text-right">
                    {ev.dateLabel}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
