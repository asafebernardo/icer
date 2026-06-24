import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ChevronLeft,
  ChevronRight,
  History,
  Loader2,
  RotateCcw,
  RefreshCw,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SOFT_DELETE_CONFIRM_DESCRIPTION } from "@/lib/softDeleteUi";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { toast } from "sonner";

const HISTORY_PAGE_SIZE = 10;

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: format(new Date(2000, i, 1), "LLLL", { locale: ptBR }),
}));

function matchesCreatedMonthYear(iso, yearStr, monthStr) {
  if (!iso || yearStr === "all") return true;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const y = Number(yearStr);
  if (d.getFullYear() !== y) return false;
  if (monthStr !== "all") {
    const m = Number(monthStr) - 1;
    return d.getMonth() === m;
  }
  return true;
}

function fmtIso(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return String(iso);
  }
}

export default function BulkEventRunsDialog({
  open,
  onOpenChange,
  onUndone,
  /** Quando `inline`, a lista é renderizada na página (sem modal). */
  variant = "dialog",
  /** Em `inline`, mostra o cabeçalho descritivo; desligue quando vem de fora (ex.: abas). */
  showInlineHeader = true,
}) {
  const active = variant === "inline" || open;
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [undoing, setUndoing] = useState({});
  const [titleQuery, setTitleQuery] = useState("");
  /** `"all"` ou `"1"`–`"12"` — só aplica com ano definido. */
  const [filterMonth, setFilterMonth] = useState("all");
  /** `"all"` ou ano `YYYY`. */
  const [filterYear, setFilterYear] = useState("all");
  /** `"all"` ou id do utilizador em string; `__none__` rotinas sem `created_by_user_id`. */
  const [filterOperador, setFilterOperador] = useState("all");
  const [page, setPage] = useState(0);
  /** Confirmação de desfazer (modal). */
  const [undoConfirmId, setUndoConfirmId] = useState(null);

  const yearOptions = useMemo(() => {
    const now = new Date().getFullYear();
    return Array.from({ length: 16 }, (_, i) => now - i);
  }, []);

  useEffect(() => {
    if (filterYear === "all") setFilterMonth("all");
  }, [filterYear]);

  useEffect(() => {
    setPage(0);
  }, [titleQuery, filterMonth, filterYear, filterOperador]);

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
    if (!active) return;
    void load();
  }, [active, load]);

  const operadorOptions = useMemo(() => {
    const m = new Map();
    for (const r of rows) {
      const key =
        r.created_by_user_id != null ? String(r.created_by_user_id) : "__none__";
      if (m.has(key)) continue;
      const label =
        String(r.operador || "").trim() ||
        (r.created_by_user_id != null
          ? `Utilizador #${r.created_by_user_id}`
          : "Sem operador");
      m.set(key, label);
    }
    return [...m.entries()].sort((a, b) =>
      a[1].localeCompare(b[1], "pt", { sensitivity: "base" }),
    );
  }, [rows]);

  const filteredRows = useMemo(() => {
    let list = rows;
    const q = titleQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((r) => String(r.titulo || "").toLowerCase().includes(q));
    }
    list = list.filter((r) =>
      matchesCreatedMonthYear(r.created_at, filterYear, filterMonth),
    );
    if (filterOperador !== "all") {
      list = list.filter((r) => {
        const key =
          r.created_by_user_id != null ? String(r.created_by_user_id) : "__none__";
        return key === filterOperador;
      });
    }
    return list;
  }, [rows, titleQuery, filterYear, filterMonth, filterOperador]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / HISTORY_PAGE_SIZE));

  useEffect(() => {
    setPage((p) => {
      const tp = Math.max(1, Math.ceil(filteredRows.length / HISTORY_PAGE_SIZE));
      return Math.min(p, tp - 1);
    });
  }, [filteredRows.length]);

  const pageRows = useMemo(() => {
    const start = page * HISTORY_PAGE_SIZE;
    return filteredRows.slice(start, start + HISTORY_PAGE_SIZE);
  }, [filteredRows, page]);

  const performUndo = useCallback(
    async (id) => {
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
    },
    [load, onUndone],
  );

  const refreshButton = useMemo(
    () => (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => void load()}
        disabled={loading}
        className="h-10 shrink-0 gap-2 px-2.5 sm:px-3"
        aria-label="Atualizar lista"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
        ) : (
          <RefreshCw className="h-4 w-4 shrink-0" />
        )}
        <span className="hidden sm:inline">Atualizar</span>
      </Button>
    ),
    [loading, load],
  );

  const filterToolbar = useMemo(() => {
    if (loading || rows.length === 0) return null;
    return (
      <div className="mb-4 flex flex-wrap items-end gap-x-3 gap-y-3">
        <div className="min-w-0 w-full flex-[1_1_16rem] space-y-2 sm:min-w-[12rem]">
          <Label htmlFor="bulk-runs-search">Buscar por título</Label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              id="bulk-runs-search"
              type="search"
              placeholder="Filtrar pelo título…"
              value={titleQuery}
              onChange={(e) => setTitleQuery(e.target.value)}
              className="h-10 pl-9"
              autoComplete="off"
            />
          </div>
        </div>
        <div className="w-full min-w-0 space-y-2 sm:w-[9.5rem] sm:flex-none">
          <Label htmlFor="bulk-runs-year">Ano</Label>
          <Select value={filterYear} onValueChange={setFilterYear}>
            <SelectTrigger id="bulk-runs-year" className="h-10 w-full">
              <SelectValue placeholder="Ano" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Qualquer ano</SelectItem>
              {yearOptions.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-full min-w-0 space-y-2 sm:w-[11.5rem] sm:flex-none">
          <Label htmlFor="bulk-runs-month">Mês</Label>
          <Select
            value={filterMonth}
            onValueChange={setFilterMonth}
            disabled={filterYear === "all"}
          >
            <SelectTrigger id="bulk-runs-month" className="h-10 w-full">
              <SelectValue placeholder="Mês" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Qualquer mês</SelectItem>
              {MONTH_OPTIONS.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-full min-w-0 space-y-2 sm:w-[min(100%,14rem)] sm:flex-none">
          <Label htmlFor="bulk-runs-operador">Operador</Label>
          <Select value={filterOperador} onValueChange={setFilterOperador}>
            <SelectTrigger id="bulk-runs-operador" className="h-10 w-full">
              <SelectValue placeholder="Operador" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Qualquer operador</SelectItem>
              {operadorOptions.map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex w-full justify-end sm:w-auto sm:flex-none">{refreshButton}</div>
      </div>
    );
  }, [
    loading,
    rows.length,
    titleQuery,
    filterMonth,
    filterYear,
    filterOperador,
    yearOptions,
    operadorOptions,
    refreshButton,
  ]);

  /** Lista, estados vazios e paginação — fora do card de filtros. */
  const logsSection = useMemo(() => {
    if (loading) {
      return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" />
          A carregar…
        </div>
      );
    }
    if (rows.length === 0) {
      return (
        <p className="text-sm text-muted-foreground py-8 text-center">
          Nenhuma rotina de agendamento em massa registrada ainda.
        </p>
      );
    }
    if (filteredRows.length === 0) {
      return (
        <p className="text-sm text-muted-foreground py-8 text-center">
          Nenhum resultado para os filtros atuais.
        </p>
      );
    }
    return (
      <>
        <div className="space-y-3">
          {pageRows.map((r) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-border bg-card p-4 shadow-sm"
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
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Operador:{" "}
                    <span className="text-foreground font-medium">
                      {String(r.operador || "").trim() ||
                        (r.created_by_user_id != null
                          ? `Utilizador #${r.created_by_user_id}`
                          : "—")}
                    </span>
                  </p>
                  {r.undone_at ? (
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Desfeito em {fmtIso(r.undone_at)}
                      {String(r.undo_operador || "").trim() ? (
                        <>
                          {" "}
                          por{" "}
                          <span className="text-foreground font-medium">
                            {String(r.undo_operador).trim()}
                          </span>
                        </>
                      ) : null}{" "}
                      · removidos:{" "}
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
                    onClick={() => setUndoConfirmId(r.id)}
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
        {totalPages > 1 ? (
          <div className="flex flex-wrap items-center justify-center gap-2 pt-6 mt-4 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={page <= 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              aria-label="Página anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-xs text-muted-foreground tabular-nums min-w-[3rem] text-center">
              {page + 1} / {totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={page + 1 >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              aria-label="Próxima página"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        ) : null}
      </>
    );
  }, [loading, rows.length, filteredRows.length, undoing, pageRows, totalPages, page]);

  const inlineHeader = (
    <div className="mb-6 border-b border-border pb-4">
      <h2 className="inline-flex items-center gap-2 text-lg font-semibold tracking-tight text-foreground">
        <History className="w-5 h-5 shrink-0 text-accent" />
        Rotinas (agendamento em massa)
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Histórico de execuções e opção de desfazer lotes criados em massa.
      </p>
    </div>
  );

  const dialogHeader = (
    <DialogHeader>
      <DialogTitle className="flex flex-wrap items-center justify-between gap-3">
        <span className="inline-flex min-w-0 items-center gap-2">
          <History className="w-5 h-5 shrink-0 text-accent" />
          Rotinas (agendamento em massa)
        </span>
        {!loading && rows.length > 0 ? null : refreshButton}
      </DialogTitle>
    </DialogHeader>
  );

  const controlsCard =
    !loading && rows.length > 0 ? (
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        {showInlineHeader !== false ? inlineHeader : null}
        {filterToolbar}
      </div>
    ) : null;

  const undoConfirmDialog = (
    <ConfirmDialog
      open={undoConfirmId != null}
      onOpenChange={(next) => {
        if (!next) setUndoConfirmId(null);
      }}
      title="Desfazer esta rotina?"
      description={`Os eventos deste lote deixam de aparecer na agenda. ${SOFT_DELETE_CONFIRM_DESCRIPTION}`}
      confirmLabel="Desfazer"
      cancelLabel="Cancelar"
      confirmVariant="danger"
      onConfirm={() => {
        const id = undoConfirmId;
        if (id != null) void performUndo(id);
      }}
    />
  );

  if (variant === "inline") {
    return (
      <>
        <div className="space-y-6">
          {controlsCard}
          <div className="min-w-0">{logsSection}</div>
        </div>
        {undoConfirmDialog}
      </>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          {dialogHeader}
          {!loading && rows.length > 0 ? (
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm mb-4">{filterToolbar}</div>
          ) : null}
          {logsSection}
        </DialogContent>
      </Dialog>
      {undoConfirmDialog}
    </>
  );
}

