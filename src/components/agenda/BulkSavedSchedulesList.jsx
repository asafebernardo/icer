import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarPlus2, Loader2, Pencil, Play, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { withCsrfHeaderAsync } from "@/lib/csrf";
import { toast } from "sonner";

function fmtDate(iso) {
  if (!iso) return "—";
  try {
    return format(parseISO(String(iso).slice(0, 10)), "d MMM yyyy", { locale: ptBR });
  } catch {
    return String(iso);
  }
}

async function fetchSchedules() {
  const r = await fetch("/api/admin/eventos/bulk-schedules?limit=50", {
    credentials: "include",
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.message || r.statusText);
  return Array.isArray(data.items) ? data.items : [];
}

export default function BulkSavedSchedulesList({ queryKey = ["bulk-schedule-templates"] }) {
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState(null);

  const { data: items = [], isLoading, isError, error, refetch } = useQuery({
    queryKey,
    queryFn: fetchSchedules,
    retry: 1,
  });

  const remove = useMutation({
    mutationFn: async (id) => {
      const r = await fetch(`/api/admin/eventos/bulk-schedules/${id}`, {
        method: "DELETE",
        credentials: "include",
        headers: await withCsrfHeaderAsync(),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.message || r.statusText);
    },
    onSuccess: () => {
      toast.success("Agendamento removido.");
      queryClient.invalidateQueries({ queryKey });
      setDeleteId(null);
    },
    onError: (e) => {
      toast.error(e?.message || "Não foi possível remover.");
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        A carregar…
      </div>
    );
  }

  if (isError) {
    const msg =
      error instanceof Error ? error.message : String(error ?? "Erro desconhecido");
    const isGatewayTimeout =
      /gateway\s*timeout|504/i.test(msg) || msg === "Gateway Timeout";
    return (
      <div className="rounded-2xl border border-destructive/40 bg-destructive/5 px-6 py-8 text-center space-y-3">
        <p className="text-sm font-medium text-foreground">Não foi possível carregar os agendamentos guardados</p>
        <p className="text-xs text-muted-foreground">{msg}</p>
        {isGatewayTimeout ? (
          <p className="text-xs text-muted-foreground">
            O proxy do Vite desistiu de esperar pela API (tempo esgotado). Depois de reiniciar{" "}
            <code className="rounded bg-muted px-1 py-0.5">npm run dev:all</code>, volte a tentar. Se usar MongoDB Atlas,
            confirme o IP na firewall da Atlas e que <code className="rounded bg-muted px-1 py-0.5">MONGODB_URI</code>{" "}
            no <code className="rounded bg-muted px-1 py-0.5">.env</code> é o mesmo servidor onde corre o seed.
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Confirme que o servidor Node está a correr (<code className="rounded bg-muted px-1 py-0.5">npm run dev:all</code>) e
            que está autenticado como administrador. O proxy encaminha <code className="rounded bg-muted px-1 py-0.5">/api</code>{" "}
            para a porta do Node (por defeito <code className="rounded bg-muted px-1 py-0.5">3001</code>
            — alinhe com <code className="rounded bg-muted px-1 py-0.5">PORT</code> /{" "}
            <code className="rounded bg-muted px-1 py-0.5">ICER_SERVER_PORT</code>).
          </p>
        )}
        <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-12 text-center">
        <p className="text-sm text-muted-foreground">
          Ainda não há agendamentos guardados. Crie um novo fluxo em massa para aparecer aqui.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {items.map((row) => {
          const p = row.payload || {};
          const range =
            p.startDate && p.endDate ? `${fmtDate(p.startDate)} → ${fmtDate(p.endDate)}` : "—";
          const subtitle = String(p.titulo || "").trim() || row.nome || "Sem título";
          return (
            <div
              key={row.id}
              className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 space-y-1">
                <p className="font-semibold text-foreground truncate">{row.nome || subtitle}</p>
                <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
                <p className="text-[11px] text-muted-foreground">
                  Período: <span className="text-foreground">{range}</span>
                  {row.updated_at ? (
                    <>
                      {" "}
                      · Atualizado em{" "}
                      {format(parseISO(row.updated_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </>
                  ) : null}
                </p>
              </div>
              <div className="flex flex-shrink-0 flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" className="gap-2" asChild>
                  <Link to={`/Eventos/rotinas/agendar/${row.id}?executar=1`}>
                    <Play className="h-4 w-4" />
                    Executar
                  </Link>
                </Button>
                <Button type="button" size="sm" variant="outline" className="gap-2" asChild>
                  <Link to={`/Eventos/rotinas/agendar/${row.id}?editar=1`}>
                    <Pencil className="h-4 w-4" />
                    Editar
                  </Link>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive gap-2"
                  onClick={() => setDeleteId(row.id)}
                >
                  <Trash2 className="h-4 w-4" />
                  Eliminar
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <ConfirmDialog
        open={deleteId != null}
        onOpenChange={(o) => {
          if (!o) setDeleteId(null);
        }}
        title="Eliminar agendamento guardado?"
        description="O modelo deixa de estar disponível. Os eventos já criados na agenda não são apagados."
        confirmLabel={remove.isPending ? "A remover…" : "Eliminar"}
        cancelLabel="Cancelar"
        confirmVariant="danger"
        onConfirm={() => {
          if (deleteId != null) remove.mutate(deleteId);
        }}
      />
    </>
  );
}

export function BulkSavedSchedulesPrimaryButton({ className }) {
  return (
    <Button type="button" className={className} asChild>
      <Link to="/Eventos/rotinas/agendar" className="gap-2">
        <CalendarPlus2 className="h-4 w-4 shrink-0" />
        <span className="truncate">Novo</span>
      </Link>
    </Button>
  );
}
