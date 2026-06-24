import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";

import Agenda from "@/pages/Agenda";
import { Button } from "@/components/ui/button";
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
        <div className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 shrink-0 gap-1.5 px-2 text-[#94A3B8] hover:text-[#F8FAFC]"
              asChild
            >
              <Link to="/Posts">
                <ArrowLeft className="h-4 w-4" />
                Categorias
              </Link>
            </Button>
            <div className="min-w-0">
              <h1 className="font-display text-lg font-semibold tracking-tight text-[#F8FAFC] sm:text-xl">
                Agenda
              </h1>
              {!isLoading && (
                <p className="mt-0.5 text-xs font-medium tracking-wide text-[#64748B]">
                  {formatPostCount(eventos.length)}
                </p>
              )}
            </div>
          </div>
        </div>

        <Agenda embedded />
      </section>
    </div>
  );
}
