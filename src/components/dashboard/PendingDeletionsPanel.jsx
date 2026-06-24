import { useCallback, useEffect, useState } from "react";
import { Loader2, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { withCsrfHeader } from "@/lib/csrf";
import { SOFT_DELETE_TOAST_RESTORED } from "@/lib/softDeleteUi";

function formatDatePt(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return String(iso);
  }
}

async function fetchPending() {
  const r = await fetch("/api/admin/pending-deletions", { credentials: "include" });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    throw new Error(data?.message || "Não foi possível carregar eliminações pendentes.");
  }
  return Array.isArray(data.items) ? data.items : [];
}

async function restorePending(type, id) {
  const headers = withCsrfHeader({ Accept: "application/json", "Content-Type": "application/json" });
  const r = await fetch(`/api/admin/pending-deletions/${encodeURIComponent(type)}/${id}/restore`, {
    method: "POST",
    credentials: "include",
    headers,
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    throw new Error(data?.message || "Não foi possível cancelar a exclusão.");
  }
}

export default function PendingDeletionsPanel() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState("");

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await fetchPending());
    } catch (e) {
      toast.error(e?.message || "Erro ao carregar.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const handleRestore = async (item) => {
    const key = `${item.type}:${item.id}`;
    setBusyKey(key);
    try {
      await restorePending(item.type, item.id);
      toast.success(SOFT_DELETE_TOAST_RESTORED);
      await reload();
    } catch (e) {
      toast.error(e?.message || "Não foi possível restaurar.");
    } finally {
      setBusyKey("");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[12rem] items-center justify-center text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-lg font-semibold text-foreground">
          Eliminações pendentes
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Itens removidos ficam ocultos no site e são eliminados definitivamente após 30 dias.
          Pode cancelar a exclusão antes dessa data.
        </p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
          Nenhuma exclusão pendente.
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {items.map((item) => {
            const key = `${item.type}:${item.id}`;
            const restoring = busyKey === key;
            return (
              <li
                key={key}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Trash2 className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                    <span className="font-medium text-foreground">{item.label}</span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {item.type_label}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Removido em {formatDatePt(item.deleted_at)} · eliminação definitiva em{" "}
                    {formatDatePt(item.purge_after)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 gap-2"
                  disabled={restoring}
                  onClick={() => void handleRestore(item)}
                >
                  {restoring ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <RotateCcw className="h-4 w-4" aria-hidden />
                  )}
                  Cancelar exclusão
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
