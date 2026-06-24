import { FEED_MAX_W } from "@/components/posts/PostsPageHero";
import { cn } from "@/lib/utils";

export default function Historia() {
  return (
    <div className="posts-hub min-h-screen">
      <div className="posts-hub__atmosphere" aria-hidden />

      <section
        className={cn(
          "posts-hub__shell container-page relative mx-auto w-full px-4 py-8 sm:px-6 sm:py-10",
          FEED_MAX_W,
        )}
      >
        <h1 className="sr-only">História</h1>

        <div
          className={cn(
            "mx-auto max-w-lg rounded-2xl border border-border/60",
            "bg-card/40 px-6 py-10 text-center backdrop-blur-sm",
          )}
        >
          <p className="font-display text-lg font-semibold text-foreground sm:text-xl">
            Página em desenvolvimento
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            A timeline da história da ICER Chapecó estará disponível em breve.
          </p>
        </div>
      </section>
    </div>
  );
}
