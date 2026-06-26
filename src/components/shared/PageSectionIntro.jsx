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
        <span className="eyebrow-premium mb-3 inline-block">
          {tag}
        </span>
      ) : null}
      <TitleTag className="heading-premium text-3xl sm:text-4xl lg:text-[2.5rem]">
        {title}
      </TitleTag>
      <div
        className="mx-auto mt-4 h-0.5 w-12 rounded-full bg-primary/50"
        aria-hidden
      />
      {description ? (
        <p className="prose-premium-lead mx-auto mt-5 max-w-xl text-foreground/70">
          {description}
        </p>
      ) : null}
    </header>
  );
}
