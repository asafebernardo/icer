import { Link } from "react-router-dom";
import { Presentation } from "lucide-react";

import HistorySection from "@/components/historia/history/HistorySection";

export default function Historia() {
  return (
    <div className="min-h-screen bg-background">
      <section className="relative mx-auto w-full max-w-6xl px-3 py-6 sm:px-6 sm:py-12 lg:max-w-7xl">
        <div className="mb-5 flex flex-col items-center gap-3 sm:mb-8 sm:flex-row sm:justify-between">
          <h1 className="text-center font-display text-xl font-semibold tracking-tight text-foreground sm:text-left sm:text-[1.75rem]">
            Movimento dos Irmãos
          </h1>
          <Link
            to="/Historia/apresentacao"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary/35 hover:bg-primary/10 hover:text-primary"
          >
            <Presentation className="h-4 w-4 shrink-0" aria-hidden />
            Apresentação
          </Link>
        </div>
        <HistorySection />
      </section>
    </div>
  );
}
