import VerticalTimeline from "@/components/historia/VerticalTimeline";
import HorizontalTimeline from "@/components/historia/HorizontalTimeline";
import HistoriaHubHeader from "@/components/historia/HistoriaHubHeader";
import { FEED_MAX_W } from "@/components/posts/PostsPageHero";
import { HISTORIA_TIMELINE_EXAMPLE } from "@/lib/historiaTimelineExamples";
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
        <HistoriaHubHeader />

        <div className="mt-6 space-y-14 sm:mt-8 sm:space-y-16">
          <div>
            <header className="mb-8 max-w-2xl">
              <h2 className="font-display text-xl font-semibold text-foreground sm:text-2xl">
                Timeline vertical
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Ideal para narrativa longa: leitura natural de cima para baixo, com
                destaque por cartão.
              </p>
            </header>
            <VerticalTimeline items={HISTORIA_TIMELINE_EXAMPLE} />
          </div>

          <div>
            <header className="mb-8 max-w-2xl">
              <h2 className="font-display text-xl font-semibold text-foreground sm:text-2xl">
                Timeline horizontal
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Visão panorâmica dos marcos; em telemóvel desliza-se para o lado para
                ver todos os anos.
              </p>
            </header>
            <HorizontalTimeline items={HISTORIA_TIMELINE_EXAMPLE} />
          </div>
        </div>
      </section>
    </div>
  );
}
