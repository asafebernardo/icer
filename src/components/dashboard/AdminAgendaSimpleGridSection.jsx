import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarRange, Loader2, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AGENDA_SIMPLE_WEEKDAY_OPTIONS,
  DEFAULT_AGENDA_SIMPLE_GRID,
  mergeAgendaSimpleGrid,
} from "@/lib/agendaSimpleGridDefaults";
import {
  PUBLIC_WORKSPACE_QUERY_KEY,
  fetchPublicWorkspaceJson,
  putAgendaSimpleGridRemote,
} from "@/lib/publicWorkspace";
import { cn } from "@/lib/utils";

function cloneGrid(g) {
  return {
    ...g,
    culto_weekdays: [...(g.culto_weekdays || [])],
    oracao_weekdays: [...(g.oracao_weekdays || [])],
  };
}

export default function AdminAgendaSimpleGridSection() {
  const queryClient = useQueryClient();
  const { data: publicWs, isLoading } = useQuery({
    queryKey: PUBLIC_WORKSPACE_QUERY_KEY,
    queryFn: fetchPublicWorkspaceJson,
    staleTime: 30_000,
  });

  const merged = useMemo(
    () =>
      mergeAgendaSimpleGrid(
        DEFAULT_AGENDA_SIMPLE_GRID,
        publicWs?.agenda_simple_grid,
      ),
    [publicWs?.agenda_simple_grid],
  );

  const [draft, setDraft] = useState(() => cloneGrid(merged));

  useEffect(() => {
    setDraft(cloneGrid(merged));
  }, [merged]);

  const mutation = useMutation({
    mutationFn: (payload) => putAgendaSimpleGridRemote(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PUBLIC_WORKSPACE_QUERY_KEY });
      toast.success("Agenda simples atualizada.");
    },
    onError: (e) =>
      toast.error(e?.message ? String(e.message) : "Erro ao guardar."),
  });

  const dirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(merged),
    [draft, merged],
  );

  const toggleWeekday = (field, v) => {
    setDraft((d) => {
      const cur = new Set(d[field] || []);
      if (cur.has(v)) cur.delete(v);
      else cur.add(v);
      return { ...d, [field]: [...cur].sort((a, b) => a - b) };
    });
  };

  const labelField = (key, label, hint) => (
    <div className="space-y-1.5">
      <Label htmlFor={`asg-${key}`} className="text-xs">
        {label}
      </Label>
      {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
      <Input
        id={`asg-${key}`}
        value={draft[key] ?? ""}
        onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
        maxLength={48}
        className="h-9"
      />
    </div>
  );

  if (isLoading && !publicWs) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
          <CalendarRange className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-lg font-semibold text-foreground">
            Agenda simples (modal)
          </h3>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Textos das colunas da tabela mensal e dias em que cultos e estudos (oração) aparecem
            nessas colunas. Se nenhum dia estiver marcado para cultos ou para oração, aplicam-se{" "}
            <span className="font-medium text-foreground">todos os dias da semana</span>.
            Eventos fora do dia escolhido vão para «Outras».
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {labelField("dia_column_label", "Coluna do dia", "Ex.: DIA")}
        {labelField("cultos_group_label", "Grupo cultos", "Cabeçalho sobre Manhã / Noite")}
        {labelField("manha_label", "Subcoluna manhã", null)}
        {labelField("noite_label", "Subcoluna noite (e tarde)", "Cultos de tarde caem aqui")}
        {labelField("reuniao_oracao_line1", "Oração — linha 1", null)}
        {labelField("reuniao_oracao_line2", "Oração — linha 2", null)}
        {labelField("outras_line1", "Outras — linha 1", null)}
        {labelField("outras_line2", "Outras — linha 2", null)}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border/80 bg-muted/20 p-4">
          <p className="text-sm font-medium text-foreground">Cultos (Manhã e Noite)</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Marque só os dias em que cultos podem aparecer nestas colunas (ex.: só domingos).
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {AGENDA_SIMPLE_WEEKDAY_OPTIONS.map(({ v, short }) => {
              const on = (draft.culto_weekdays || []).includes(v);
              return (
                <button
                  key={`cult-${v}`}
                  type="button"
                  onClick={() => toggleWeekday("culto_weekdays", v)}
                  className={cn(
                    "rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
                    on
                      ? "border-emerald-500/60 bg-emerald-500/15 text-emerald-900 dark:text-emerald-100"
                      : "border-border/80 bg-background text-muted-foreground hover:bg-muted/60",
                  )}
                >
                  {short}
                </button>
              );
            })}
          </div>
        </div>
        <div className="rounded-xl border border-border/80 bg-muted/20 p-4">
          <p className="text-sm font-medium text-foreground">Reunião de oração (categoria estudo)</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Marque os dias em que estudos aparecem nesta coluna (ex.: só quartas).
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {AGENDA_SIMPLE_WEEKDAY_OPTIONS.map(({ v, short }) => {
              const on = (draft.oracao_weekdays || []).includes(v);
              return (
                <button
                  key={`ora-${v}`}
                  type="button"
                  onClick={() => toggleWeekday("oracao_weekdays", v)}
                  className={cn(
                    "rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
                    on
                      ? "border-sky-500/60 bg-sky-500/15 text-sky-950 dark:text-sky-100"
                      : "border-border/80 bg-background text-muted-foreground hover:bg-muted/60",
                  )}
                >
                  {short}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <Button
          type="button"
          onClick={() => mutation.mutate(draft)}
          disabled={!dirty || mutation.isPending}
          className="gap-2"
        >
          {mutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {mutation.isPending ? "A guardar…" : "Guardar agenda simples"}
        </Button>
      </div>
    </div>
  );
}
