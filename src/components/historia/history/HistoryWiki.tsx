import { memo, useMemo, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, MapPin } from "lucide-react";

import HistoryImage from "@/components/historia/history/HistoryImage";
import {
  getTimelineEventIndex,
  TIMELINE_EVENTS,
} from "@/components/historia/history/timelineData";
import {
  formatEventYear,
  type TimelineEvent,
} from "@/components/historia/history/types";
import { cn } from "@/lib/utils";

function collectReferences(events: TimelineEvent[]) {
  const seen = new Set<string>();
  const refs: string[] = [];
  for (const event of events) {
    for (const ref of event.references ?? []) {
      const key = ref.trim();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      refs.push(key);
    }
  }
  return refs;
}

function WikiShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <article
      className={cn(
        "rounded-sm border border-border bg-card px-4 py-6 shadow-sm sm:px-8 sm:py-8 lg:px-10",
        className,
      )}
    >
      {children}
    </article>
  );
}

function WikiInfobox({ event }: { event: TimelineEvent }) {
  const image = event.images[0];
  const caption = image
    ? (image.caption ?? image.alt)?.trim() || null
    : null;

  return (
    <aside
      className={cn(
        "mb-5 w-full overflow-hidden border border-border bg-muted/25",
        "sm:float-right sm:mb-4 sm:ml-6 sm:w-[min(100%,17.5rem)]",
      )}
    >
      <div className="border-b border-border bg-muted/40 px-3 py-2 text-center">
        <p className="text-sm font-semibold leading-snug text-foreground">
          {event.title}
        </p>
      </div>

      {image ? (
        <figure className="border-b border-border bg-background/40 p-2">
          <HistoryImage
            src={image.src}
            alt={image.alt}
            priority
            className="w-full bg-transparent"
            imgClassName="mx-auto h-auto max-h-56 w-full object-contain"
          />
          {caption ? (
            <figcaption className="mt-2 px-1 pb-1 text-center text-xs leading-relaxed text-muted-foreground">
              {caption}
            </figcaption>
          ) : null}
        </figure>
      ) : null}

      <dl className="divide-y divide-border text-sm">
        <div className="grid grid-cols-[6.5rem_1fr] gap-2 px-3 py-2">
          <dt className="text-muted-foreground">Período</dt>
          <dd className="font-medium text-foreground">
            <time dateTime={event.yearLabel ? undefined : String(event.year)}>
              {formatEventYear(event)}
            </time>
          </dd>
        </div>
        <div className="grid grid-cols-[6.5rem_1fr] gap-2 px-3 py-2">
          <dt className="text-muted-foreground">Categoria</dt>
          <dd className="font-medium text-foreground">{event.category}</dd>
        </div>
        {event.location ? (
          <div className="grid grid-cols-[6.5rem_1fr] gap-2 px-3 py-2">
            <dt className="text-muted-foreground">Local</dt>
            <dd className="font-medium text-foreground">
              <span className="inline-flex items-start gap-1">
                <MapPin
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground"
                  aria-hidden
                />
                {event.location}
              </span>
            </dd>
          </div>
        ) : null}
      </dl>
    </aside>
  );
}

/** Página inicial da wiki: introdução + lista de artigos. */
export function HistoryWikiIndex({ className }: { className?: string }) {
  const first = TIMELINE_EVENTS[0];
  const last = TIMELINE_EVENTS[TIMELINE_EVENTS.length - 1];
  const references = useMemo(() => collectReferences(TIMELINE_EVENTS), []);

  return (
    <WikiShell className={className}>
      <header className="border-b border-border pb-5">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
          Wiki histórica
        </p>
        <h1 className="mt-2 font-wiki text-3xl font-normal tracking-tight text-foreground sm:text-4xl lg:text-[2.75rem] lg:leading-tight">
          Movimento dos Irmãos
        </h1>
        <p className="mt-3 max-w-3xl font-wiki text-[16px] leading-relaxed text-muted-foreground sm:text-[17px] sm:leading-relaxed">
          Enciclopédia em páginas separadas, com o conteúdo completo da timeline
          histórica.
        </p>
        {first && last ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Abrangência:{" "}
            <span className="font-medium text-foreground">
              {formatEventYear(first)}–{formatEventYear(last)}
            </span>
            {" · "}
            {TIMELINE_EVENTS.length} artigos
          </p>
        ) : null}
      </header>

      <div className="my-6 font-wiki text-[17px] leading-[1.8] text-foreground/90 sm:text-[18px] sm:leading-[1.85]">
        <p>
          O{" "}
          <strong className="font-semibold text-foreground">
            Movimento dos Irmãos
          </strong>{" "}
          (também conhecido como Irmãos Unidos ou Plymouth Brethren) surgiu no
          século XIX a partir de reuniões de estudo bíblico e comunhão simples
          entre cristãos. Escolha um artigo abaixo para ler cada momento da
          história.
        </p>
      </div>

      <nav aria-label="Artigos da wiki" className="border border-border bg-muted/15">
        <div className="border-b border-border px-4 py-3 sm:px-5">
          <p className="text-sm font-semibold text-foreground">Artigos</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Em ordem cronológica
          </p>
        </div>
        <ul className="divide-y divide-border/70">
          {TIMELINE_EVENTS.map((event) => (
            <li key={event.id}>
              <Link
                to={`/Historia/wiki/${event.id}`}
                className="flex gap-3 px-4 py-3 text-sm transition-colors hover:bg-muted/35 sm:gap-4 sm:px-5"
              >
                <span className="w-14 shrink-0 tabular-nums text-muted-foreground sm:w-16">
                  {formatEventYear(event)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block leading-snug text-foreground">
                    {event.title}
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-muted-foreground line-clamp-2">
                    {event.summary}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {references.length > 0 ? (
        <section className="mt-10 border-t border-border pt-8">
          <h2 className="border-b border-border pb-1.5 font-wiki text-2xl font-normal tracking-tight text-foreground sm:text-[1.65rem]">
            Referências
          </h2>
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
            {references.map((ref) => (
              <li key={ref} className="pl-1">
                {ref}
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </WikiShell>
  );
}

/** Artigo individual no estilo wiki. */
export function HistoryWikiArticle({
  event,
  className,
}: {
  event: TimelineEvent;
  className?: string;
}) {
  const paragraphs = event.content.split(/\n\n+/).filter(Boolean);
  const index = getTimelineEventIndex(event.id);
  const prev = index > 0 ? TIMELINE_EVENTS[index - 1] : null;
  const next =
    index >= 0 && index < TIMELINE_EVENTS.length - 1
      ? TIMELINE_EVENTS[index + 1]
      : null;
  const eventRefs = (event.references ?? []).map((r) => r.trim()).filter(Boolean);

  return (
    <WikiShell className={className}>
      <p className="text-xs text-muted-foreground">
        <Link
          to="/Historia/wiki"
          className="hover:text-foreground hover:underline"
        >
          Wiki
        </Link>
        <span className="mx-1.5 text-border">/</span>
        <span className="text-foreground/80">{event.title}</span>
      </p>

      <header className="mt-3 border-b border-border pb-4">
        <h1 className="font-wiki text-3xl font-normal tracking-tight text-foreground sm:text-4xl lg:text-[2.5rem] lg:leading-tight">
          {event.title}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          <time dateTime={event.yearLabel ? undefined : String(event.year)}>
            {formatEventYear(event)}
          </time>
          <span className="mx-2 text-border">·</span>
          {event.category}
          {event.location ? (
            <>
              <span className="mx-2 text-border">·</span>
              {event.location}
            </>
          ) : null}
        </p>
      </header>

      <div className="mt-5 sm:mt-6">
        <WikiInfobox event={event} />

        <p className="mb-4 font-wiki text-[16px] font-medium leading-relaxed text-foreground sm:text-[17px]">
          {event.summary}
        </p>

        <div className="space-y-4 font-wiki text-[17px] leading-[1.8] text-foreground/90 sm:text-[18px] sm:leading-[1.85]">
          {paragraphs.map((paragraph, i) => (
            <p key={`${event.id}-p${i}`}>{paragraph}</p>
          ))}
        </div>

        {event.images.length > 1 ? (
          <div className="clear-both mt-6 grid gap-3 border-t border-border pt-5 sm:grid-cols-2">
            {event.images.slice(1).map((image) => (
              <figure
                key={image.src}
                className="overflow-hidden border border-border bg-muted/20 p-2"
              >
                <HistoryImage
                  src={image.src}
                  alt={image.alt}
                  className="w-full bg-transparent"
                  imgClassName="mx-auto h-auto max-h-48 w-full object-contain"
                />
                <figcaption className="mt-2 text-center text-xs text-muted-foreground">
                  {(image.caption ?? image.alt)?.trim()}
                </figcaption>
              </figure>
            ))}
          </div>
        ) : (
          <div className="clear-both" />
        )}

        {eventRefs.length > 0 ? (
          <section className="mt-8 border-t border-border pt-6">
            <h2 className="font-wiki text-xl font-normal text-foreground">
              Referências
            </h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
              {eventRefs.map((ref) => (
                <li key={ref} className="pl-1">
                  {ref}
                </li>
              ))}
            </ol>
          </section>
        ) : null}
      </div>

      <nav
        aria-label="Navegação entre artigos"
        className="mt-10 grid gap-3 border-t border-border pt-6 sm:grid-cols-2"
      >
        {prev ? (
          <Link
            to={`/Historia/wiki/${prev.id}`}
            className="flex items-start gap-2 rounded-sm border border-border bg-muted/15 px-3 py-3 text-sm transition-colors hover:bg-muted/35"
          >
            <ChevronLeft className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className="min-w-0">
              <span className="block text-xs text-muted-foreground">Anterior</span>
              <span className="mt-0.5 block leading-snug text-foreground">
                {formatEventYear(prev)} · {prev.title}
              </span>
            </span>
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            to={`/Historia/wiki/${next.id}`}
            className="flex items-start justify-end gap-2 rounded-sm border border-border bg-muted/15 px-3 py-3 text-right text-sm transition-colors hover:bg-muted/35 sm:col-start-2"
          >
            <span className="min-w-0">
              <span className="block text-xs text-muted-foreground">Próximo</span>
              <span className="mt-0.5 block leading-snug text-foreground">
                {formatEventYear(next)} · {next.title}
              </span>
            </span>
            <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          </Link>
        ) : null}
      </nav>
    </WikiShell>
  );
}

export default memo(HistoryWikiIndex);
