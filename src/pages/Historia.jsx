import { Landmark } from "lucide-react";

import PageHeader from "@/components/shared/PageHeader";
import { Badge } from "@/components/ui/badge";

export default function Historia() {
  return (
    <div>
      <PageHeader
        pageKey="historia"
        tag="ICER Chapecó"
        title="História"
        description="Conteúdo em preparação."
      />
      <section className="py-16 lg:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-border bg-card/80 p-8 sm:p-10 text-center shadow-soft">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Landmark className="h-7 w-7" aria-hidden />
            </div>
            <Badge variant="secondary" className="mb-4">
              Visível só para administradores
            </Badge>
            <h2 className="font-display text-xl font-semibold text-foreground sm:text-2xl">
              Página em construção
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
              Esta secção reunirá a história da igreja, marcos importantes e
              testemunhos da comunidade. Por agora está disponível apenas no
              painel de administradores para revisão antes da publicação geral.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
