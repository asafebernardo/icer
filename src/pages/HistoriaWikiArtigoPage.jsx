import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import { HistoryWikiArticle } from "@/components/historia/history/HistoryWiki";
import { getTimelineEventById } from "@/components/historia/history/timelineData";

export default function HistoriaWikiArtigoPage() {
  const { id } = useParams();
  const event = id ? getTimelineEventById(id) : undefined;

  if (!event) {
    return <Navigate to="/Historia/wiki" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <section className="relative mx-auto flex w-full max-w-5xl flex-col px-3 py-6 sm:px-6 sm:py-10 lg:max-w-6xl">
        <Link
          to="/Historia/wiki"
          className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:mb-6"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
          Voltar ao índice da wiki
        </Link>

        <HistoryWikiArticle event={event} />
      </section>
    </div>
  );
}
