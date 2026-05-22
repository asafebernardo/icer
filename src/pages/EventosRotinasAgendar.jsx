import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";

import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import BulkEventScheduler from "@/components/agenda/BulkEventScheduler";
import { canMenuAction, MENU } from "@/lib/auth";
import { useAuth } from "@/lib/AuthContext";
import { listEventosMerged } from "@/lib/eventosQuery";

const SCHEDULE_QK = ["bulk-schedule-template"];

async function fetchSchedule(id) {
  const r = await fetch(`/api/admin/eventos/bulk-schedules/${id}`, { credentials: "include" });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.message || r.statusText);
  return data;
}

export default function EventosRotinasAgendar() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, navigateToLogin } = useAuth();
  const canCreate = canMenuAction(user, MENU.EVENTOS, "create");

  const scheduleId = id ? Number(id) : NaN;
  const enabledFetch = canCreate && Number.isFinite(scheduleId);

  const { data: savedSchedule, isLoading, isError, error } = useQuery({
    queryKey: [...SCHEDULE_QK, scheduleId],
    queryFn: () => fetchSchedule(scheduleId),
    enabled: enabledFetch,
    staleTime: 30_000,
  });

  const { data: eventos = [] } = useQuery({
    queryKey: ["eventos"],
    queryFn: listEventosMerged,
    enabled: canCreate,
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["eventos"] });
    queryClient.invalidateQueries({ queryKey: ["bulk-schedule-templates"] });
    queryClient.invalidateQueries({ queryKey: SCHEDULE_QK });
  };

  const editHint = searchParams.get("editar") === "1";
  const executeHint = searchParams.get("executar") === "1";

  if (!canCreate) {
    return (
      <div>
        <PageHeader pageKey="eventos" tag="Programação" title="Agendar em massa" />
        <section className="py-10">
          <div className="max-w-5xl mx-auto px-4">
            <p className="text-sm text-muted-foreground rounded-xl border bg-muted/40 px-4 py-3">
              Precisa de permissão para criar eventos.{" "}
              <button
                type="button"
                onClick={() => navigateToLogin()}
                className="font-semibold text-primary underline-offset-2 hover:underline"
              >
                Inicie sessão
              </button>
              .
            </p>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        pageKey="eventos"
        tag="Programação"
        title="Agendar em massa"
        description="Assistente em 3 passos."
      />

      <section className="py-10 lg:py-14">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" size="sm" className="gap-2" asChild>
              <Link to="/Eventos/rotinas">
                <ArrowLeft className="w-4 h-4" />
                Voltar a Rotinas
              </Link>
            </Button>
          </div>

          {enabledFetch && isLoading ? (
            <div className="flex justify-center py-16 text-muted-foreground gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              A carregar modelo…
            </div>
          ) : enabledFetch && isError ? (
            <p className="rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {error?.message || "Não foi possível carregar o agendamento."}
            </p>
          ) : (
            <>
              {enabledFetch && savedSchedule ? (
                <p className="text-sm text-muted-foreground">
                  {editHint
                    ? "Está a editar um modelo guardado — utilize Salvar ou Salvar e executar na última etapa."
                    : executeHint
                      ? "Modelo carregado para execução — na última etapa use Salvar e executar para criar os eventos na agenda."
                      : "Modelo carregado — reveja os passos e use Salvar e executar para criar os eventos na agenda."}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Preencha os três passos. Na revisão pode guardar só o modelo ou guardar e criar os eventos.
                </p>
              )}

              <BulkEventScheduler
                wizardPage
                variant="inline"
                showInlineHeader={false}
                open
                onOpenChange={() => {}}
                existingEventos={eventos}
                onDone={invalidateAll}
                initialSavedSchedule={enabledFetch && savedSchedule ? savedSchedule : null}
                onWizardCancel={() => navigate("/Eventos/rotinas")}
                onWizardFinished={() => {
                  invalidateAll();
                  navigate("/Eventos/rotinas");
                }}
              />
            </>
          )}
        </div>
      </section>
    </div>
  );
}
