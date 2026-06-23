import { useState } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CalendarPlus2, History } from "lucide-react";

import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BulkSavedSchedulesList, {
  BulkSavedSchedulesPrimaryButton,
} from "@/components/agenda/BulkSavedSchedulesList";
import BulkEventRunsDialog from "@/components/agenda/BulkEventRunsDialog";
import { canMenuAction, MENU } from "@/lib/auth";
import { useAuth } from "@/lib/AuthContext";

const BULK_TEMPLATES_QK = ["bulk-schedule-templates"];

export default function EventosRotinas({ embedded = false } = {}) {
  const queryClient = useQueryClient();
  const { user, navigateToLogin } = useAuth();
  const canCreate = canMenuAction(user, MENU.EVENTOS, "create");

  const [historicoMounted, setHistoricoMounted] = useState(false);
  const [activeTab, setActiveTab] = useState("agendar");

  return (
    <div>
      {!embedded ? (
        <PageHeader
          pageKey="eventos"
          tag="Programação"
          title="Rotinas"
          description="Rotinas e agendamento em massa."
        />
      ) : null}

      <section className={embedded ? "py-0" : "py-10 lg:py-14"}>
        <div
          className={
            embedded
              ? "w-full space-y-10"
              : "max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10"
          }
        >
          {!embedded ? (
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" size="sm" className="gap-2" asChild>
              <Link to="/Posts/categoria/eventos?tab=configuracoes">
                <ArrowLeft className="w-4 h-4" />
                Voltar a Eventos
              </Link>
            </Button>
          </div>
          ) : null}

          {!canCreate ? (
            <p className="text-sm text-muted-foreground rounded-xl border border-border bg-muted/40 px-4 py-3">
              Para usar agendamento em massa e rotinas, o administrador deve conceder permissão em{" "}
              <strong className="text-foreground">Eventos</strong> no Dashboard, ou{" "}
              <button
                type="button"
                onClick={() => navigateToLogin()}
                className="text-primary font-semibold underline-offset-2 hover:underline dark:text-accent"
              >
                inicie sessão
              </button>{" "}
              com uma conta autorizada.
            </p>
          ) : (
            <Tabs
              value={activeTab}
              onValueChange={(v) => {
                setActiveTab(v);
                if (v === "historico") setHistoricoMounted(true);
              }}
              className="w-full"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <TabsList className="grid h-auto min-h-11 w-full grid-cols-2 rounded-xl p-1 sm:inline-flex sm:w-auto sm:max-w-xl">
                  <TabsTrigger value="agendar" className="gap-1.5 px-2 sm:gap-2 sm:px-3">
                    <CalendarPlus2 className="h-4 w-4 shrink-0" aria-hidden />
                    <span className="truncate">Agendamentos</span>
                  </TabsTrigger>
                  <TabsTrigger value="historico" className="gap-2 px-2 sm:px-3">
                    <History className="h-4 w-4 shrink-0" aria-hidden />
                    Histórico
                  </TabsTrigger>
                </TabsList>
                {activeTab === "agendar" ? (
                  <BulkSavedSchedulesPrimaryButton className="w-full shrink-0 sm:w-auto" />
                ) : null}
              </div>

              <TabsContent value="agendar" className="mt-6 outline-none space-y-6">
                <BulkSavedSchedulesList queryKey={BULK_TEMPLATES_QK} />
              </TabsContent>

              <TabsContent value="historico" className="mt-6 outline-none">
                {historicoMounted ? (
                  <BulkEventRunsDialog
                    variant="inline"
                    showInlineHeader={false}
                    open
                    onOpenChange={() => {}}
                    onUndone={() =>
                      queryClient.invalidateQueries({ queryKey: ["eventos"] })
                    }
                  />
                ) : null}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </section>
    </div>
  );
}
