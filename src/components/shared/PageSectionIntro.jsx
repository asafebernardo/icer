import { cn } from "@/lib/utils";

/**
 * Cabeçalho centrado de secção (tag, título, traço e descrição) — alinhado a Cultos e Contato.
 */
export default function PageSectionIntro({
  tag,
  title,
  description,
  as: TitleTag = "h1",
  className,
}) {
  return (
    <header
      className={cn(
        "mx-auto mb-10 max-w-2xl text-center sm:mb-12",
        className,
      )}
    >
      {tag ? (
        <span className="mb-3 inline-block text-sm font-semibold uppercase tracking-wider text-accent">
          {tag}
        </span>
      ) : null}
      <TitleTag className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
        {title}
      </TitleTag>
      <div
        className="mx-auto mt-4 h-1 w-16 rounded-full bg-accent/60"
        aria-hidden
      />
      {description ? (
        <p className="mx-auto mt-5 max-w-xl text-muted-foreground">
          {description}
        </p>
      ) : null}
    </header>
  );
}
