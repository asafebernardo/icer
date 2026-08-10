import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import HistoryPresentation from "@/components/historia/history/HistoryPresentation";

export default function HistoriaApresentacaoPage() {
  return (
    <div className="min-h-screen bg-background">
      <section className="relative mx-auto flex w-full max-w-6xl flex-col px-3 py-6 sm:px-6 sm:py-10 lg:max-w-7xl">
        <Link
          to="/Historia"
          className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:mb-6"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
          Voltar à timeline
        </Link>

        <header className="mb-5 sm:mb-6">
          <h1 className="font-display text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            Apresentação histórica
          </h1>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">
            Resumo em slides do Movimento dos Irmãos
          </p>
        </header>

        <HistoryPresentation />
      </section>
    </div>
  );
}
