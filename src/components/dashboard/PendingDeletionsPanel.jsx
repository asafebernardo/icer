import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, RefreshCw, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
  const headers = withCsrfHeader({
    Accept: "application/json",
    "Content-Type": "application/json",
  });
  const r = await fetch(
    `/api/admin/pending-deletions/${encodeURIComponent(type)}/${id}/restore`,
    {
      method: "POST",
      credentials: "include",
      headers,
    },
  );
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    throw new Error(data?.message || "Não foi possível cancelar a exclusão.");
  }
}

export default function PendingDeletionsPanel() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyKey, setBusyKey] = useState("");

  const reload = useCallback(async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    try {
      setItems(await fetchPending());
    } catch (e) {
      toast.error(e?.message || "Erro ao carregar.");
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
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
      await reload({ silent: true });
    } catch (e) {
      toast.error(e?.message || "Não foi possível restaurar.");
    } finally {
      setBusyKey("");
    }
  };

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6 rounded-2xl border border-border bg-card p-6"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10">
              <Trash2 className="h-5 w-5 text-accent" aria-hidden />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-foreground">
                Eliminações pendentes
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Itens removidos ficam ocultos no site e são eliminados
                definitivamente após 30 dias. Pode cancelar a exclusão antes
                dessa data.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start">
            {!loading ? (
              <Badge variant="secondary">
                {items.length}{" "}
                {items.length === 1 ? "item" : "itens"}
              </Badge>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => void reload({ silent: true })}
              disabled={loading || refreshing}
              title="Atualizar"
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                aria-hidden
              />
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
            Nenhuma exclusão pendente.
          </div>
        ) : (
          <ul className="overflow-hidden rounded-xl border border-border divide-y divide-border">
            {items.map((item) => {
              const key = `${item.type}:${item.id}`;
              const restoring = busyKey === key;
              return (
                <li
                  key={key}
                  className="flex flex-col gap-3 bg-background/40 p-4 transition-colors hover:bg-muted/30 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </div>
                    <div className="min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate font-medium text-foreground">
                          {item.label}
                        </span>
                        <Badge variant="outline" className="shrink-0 font-normal">
                          {item.type_label}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Removido em {formatDatePt(item.deleted_at)}
                        <span className="mx-1.5 text-border">·</span>
                        Eliminação definitiva em{" "}
                        {formatDatePt(item.purge_after)}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0 gap-2 self-stretch sm:self-auto"
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
      </motion.div>
    </div>
  );
}
