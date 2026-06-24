import { useQuery } from "@tanstack/react-query";

import Agenda from "@/pages/Agenda";
import PostsHubHeader from "@/components/posts/PostsHubHeader";
import PostsNavBreadcrumb from "@/components/posts/PostsNavBreadcrumb";
import { FEED_MAX_W } from "@/components/posts/PostsPageHero";
import { formatPostCount } from "@/hooks/usePostCategoryCounts";
import { listEventosMerged } from "@/lib/eventosQuery";
import { cn } from "@/lib/utils";

export default function PostsAgendaHubPage() {
  const { data: eventos = [], isLoading } = useQuery({
    queryKey: ["eventos"],
    queryFn: listEventosMerged,
    staleTime: 30_000,
  });

  return (
    <div className="posts-hub min-h-screen">
      <div className="posts-hub__atmosphere" aria-hidden />

      <section
        className={cn(
          "posts-hub__shell container-page relative mx-auto w-full px-4 py-8 sm:px-6 sm:py-10",
          FEED_MAX_W,
        )}
      >
        <PostsHubHeader
          backTo="/Posts/grupo/informacoes"
          breadcrumb={
            <PostsNavBreadcrumb
              centered
              groupId="informacoes"
              categoryKey="agenda"
            />
          }
        />

        {!isLoading ? (
          <p className="mt-2 text-center text-xs font-medium tracking-wide text-[#64748B]">
            {formatPostCount(eventos.length)}
          </p>
        ) : null}

        <div className="mt-6 sm:mt-8">
          <Agenda embedded />
        </div>
      </section>
    </div>
  );
}
