/**
 * Cabeçalho da página História — mesmo padrão visual de PostsHubHeader.
 * @param {{ tag?: string; title?: string; description?: string; actions?: import("react").ReactNode }} props
 */
export default function HistoriaHubHeader({
  tag = "ICER Chapecó",
  title = "História",
  description = "Marcos da nossa jornada de fé — momentos que marcaram a comunidade em Chapecó e região.",
  actions = null,
}) {
  return (
    <header className="posts-hub-header">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 max-w-2xl">
          <p className="mb-1 text-[10px] font-medium uppercase tracking-[0.18em] text-[#38BDF8]/75">
            {tag}
          </p>
          <h1 className="font-display text-xl font-semibold tracking-tight text-[#F1F5F9] sm:text-[1.75rem]">
            {title}
          </h1>
          <p className="mt-1.5 text-sm leading-relaxed text-[#64748B] sm:mt-2 sm:text-[0.9375rem]">
            {description}
          </p>
        </div>

        {actions ? <div className="shrink-0 sm:pt-1">{actions}</div> : null}
      </div>
    </header>
  );
}
