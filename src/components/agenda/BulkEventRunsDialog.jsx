import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { History, Loader2, RotateCcw, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

function fmtIso(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return String(iso);
  }
}

export default function BulkEventRunsDialog({ open, onOpenChange, onUndone }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [undoing, setUndoing] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/eventos/bulk-runs?limit=50", { credentials: "include" });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.message || r.statusText);
      setRows(Array.isArray(data.items) ? data.items : []);
    } catch (e) {
      toast.error(e?.message || "Não foi possível carregar as rotinas.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    void load();
  }, [open, load]);

  const hasRows = rows.length > 0;

  const doUndo = async (id) => {
    const ok = window.confirm("Desfazer esta rotina? Isso vai apagar os eventos criados por este agendamento em massa.");
    if (!ok) return;
    setUndoing((m) => ({ ...m, [id]: true }));
    try {
      const r = await fetch(`/api/admin/eventos/bulk-runs/${id}/undo`, {
        method: "POST",
        credentials: "include",
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.message || r.statusText);
      toast.success(`Rotina desfeita. Eventos removidos: ${data.deleted || 0}.`);
      await load();
      onUndone?.();
    } catch (e) {
      toast.error(e?.message || "Não foi possível desfazer.");
    } finally {
      setUndoing((m) => ({ ...m, [id]: false }));
    }
  };

  const content = useMemo(() => {
    if (loading) {
      return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" />
          A carregar…
        </div>
      );
    }
    if (!hasRows) {
      return (
        <p className="text-sm text-muted-foreground py-8 text-center">
          Nenhuma rotina de agendamento em massa registrada ainda.
        </p>
      );
    }
    return (
      <div className="space-y-3">
        {rows.map((r) => (
          <motion.div
            key={r.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-border bg-card p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">
                  {r.titulo || "Rotina de eventos"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Criados: <span className="text-foreground">{r.created_count ?? 0}</span>{" "}
                  {r.range_start || r.range_end ? (
                    <>
                      · Período:{" "}
                      <span className="text-foreground">
                        {r.range_start || "—"} → {r.range_end || "—"}
                      </span>
                    </>
                  ) : null}
                  {r.categoria ? (
                    <>
                      {" "}
                      · Categoria: <span className="text-foreground">{r.categoria}</span>
                    </>
                  ) : null}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Executado em {fmtIso(r.created_at)} · ID {r.id}
                </p>
                {r.undone_at ? (
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Desfeito em {fmtIso(r.undone_at)} · removidos:{" "}
                    <span className="text-foreground">{r.undone_deleted_count ?? 0}</span>
                  </p>
                ) : null}
              </div>
              <div className="shrink-0 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!!r.undone_at || undoing[r.id] === true}
                  onClick={() => doUndo(r.id)}
                  className="gap-2"
                  title={r.undone_at ? "Já foi desfeito" : "Desfazer esta rotina"}
                >
                  {undoing[r.id] ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RotateCcw className="w-4 h-4" />
                  )}
                  Desfazer
                </Button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    );
  }, [doUndo, hasRows, loading, rows, undoing]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2">
              <History className="w-5 h-5 text-accent" />
              Rotinas (agendamento em massa)
            </span>
            <Button type="button" variant="outline" size="sm" onClick={() => void load()} disabled={loading} className="gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Atualizar
            </Button>
          </DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}

