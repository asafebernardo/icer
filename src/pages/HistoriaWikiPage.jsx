import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import { HistoryWikiIndex } from "@/components/historia/history/HistoryWiki";

export default function HistoriaWikiPage() {
  return (
    <div className="min-h-screen bg-background">
      <section className="relative mx-auto flex w-full max-w-5xl flex-col px-3 py-6 sm:px-6 sm:py-10 lg:max-w-6xl">
        <Link
          to="/Historia"
          className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:mb-6"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
          Voltar à timeline
        </Link>

        <HistoryWikiIndex />
      </section>
    </div>
  );
}
