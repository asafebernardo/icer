import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { format, parseISO, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ScrollText, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import {
  labelForAction,
  formatAuditDetails,
} from "@/lib/auditLogLabels";

const PAGE_SIZE = 50;

function formatTs(iso) {
  if (!iso) return "—";
  try {
    const d = typeof iso === "string" ? parseISO(iso) : new Date(iso);
    if (!isValid(d)) return "—";
    return format(d, "dd/MM/yyyy HH:mm", { locale: ptBR });
  } catch {
    return "—";
  }
}

async function fetchServerUsers() {
  const r = await fetch("/api/admin/users", { credentials: "include" });
  if (!r.ok) {
    const t = await r.text();
    let msg = t;
    try {
      msg = JSON.parse(t).message || t;
    } catch {
      /* ignore */
    }
    throw new Error(msg || r.statusText);
  }
  return r.json();
}

export function buildGlobalAuditUrl(params) {
  const sp = new URLSearchParams();
  sp.set("limit", String(PAGE_SIZE));
  sp.set("skip", String(params.skip));
  if (params.action.trim()) sp.set("action", params.action.trim());
  if (params.user_id.trim()) {
    const n = Number(params.user_id.trim());
    if (Number.isFinite(n)) sp.set("user_id", String(n));
  }
  if (params.actor_user_id.trim()) {
    const n = Number(params.actor_user_id.trim());
    if (Number.isFinite(n)) sp.set("actor_user_id", String(n));
  }
  if (params.ip.trim()) sp.set("ip", params.ip.trim());
  if (params.user_null) sp.set("user_null", "1");
  return `/api/admin/audit-log?${sp.toString()}`;
}

async function fetchGlobalAudit(params) {
  const url = buildGlobalAuditUrl(params);
  const r = await fetch(url, { credentials: "include" });
  if (!r.ok) {
    const t = await r.text();
    let msg = t;
    try {
      msg = JSON.parse(t).message || t;
    } catch {
      /* ignore */
    }
    throw new Error(msg || r.statusText);
  }
  return r.json();
}

function emptyFilters() {
  return {
    skip: 0,
    action: "",
    user_id: "",
    actor_user_id: "",
    ip: "",
    user_null: false,
  };
}

export default function GlobalAuditLogPanel() {
  const [draft, setDraft] = useState(emptyFilters);
  const [applied, setApplied] = useState(emptyFilters);

  const { data: users = [] } = useQuery({
    queryKey: ["server-admin-users"],
    queryFn: fetchServerUsers,
  });

  const emailById = useMemo(
    () => Object.fromEntries((users || []).map((u) => [u.id, u.email])),
    [users],
  );

  const {
    data,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["global-audit-log", applied],
    queryFn: () => fetchGlobalAudit(applied),
  });

  const rows = data?.rows ?? [];
  const total = typeof data?.total === "number" ? data.total : 0;
  const hasPrev = applied.skip > 0;
  const hasNext = applied.skip + rows.length < total;

  const applyFilters = () => {
    setApplied({ ...draft, skip: 0 });
  };

  const goPrev = () => {
    setApplied((a) => ({
      ...a,
      skip: Math.max(0, a.skip - PAGE_SIZE),
    }));
  };

  const goNext = () => {
    setApplied((a) => ({ ...a, skip: a.skip + PAGE_SIZE }));
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-card border border-border rounded-2xl p-6"
      >
        <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <ScrollText className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground text-lg">
                Registo de atividade (global)
              </h2>
              <p className="text-sm text-muted-foreground">
                Todos os eventos de auditoria no servidor, com filtros e
                paginação.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw
              className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`}
            />
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-4">
          <div className="space-y-2">
            <Label htmlFor="ga-action">Ação (contém)</Label>
            <Input
              id="ga-action"
              value={draft.action}
              onChange={(e) =>
                setDraft((d) => ({ ...d, action: e.target.value }))
              }
              placeholder="ex.: auth.login"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ga-uid">ID utilizador (sujeito)</Label>
            <Input
              id="ga-uid"
              inputMode="numeric"
              value={draft.user_id}
              onChange={(e) =>
                setDraft((d) => ({ ...d, user_id: e.target.value }))
              }
              placeholder="número"
              disabled={draft.user_null}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ga-actor">ID executado por</Label>
            <Input
              id="ga-actor"
              inputMode="numeric"
              value={draft.actor_user_id}
              onChange={(e) =>
                setDraft((d) => ({ ...d, actor_user_id: e.target.value }))
              }
              placeholder="número"
            />
          </div>
          <div className="space-y-2 sm:col-span-2 lg:col-span-2">
            <Label htmlFor="ga-ip">IP (contém)</Label>
            <Input
              id="ga-ip"
              value={draft.ip}
              onChange={(e) => setDraft((d) => ({ ...d, ip: e.target.value }))}
              placeholder="ex.: 127.0.0"
            />
          </div>
          <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-1 pt-6">
            <Switch
              id="ga-null"
              checked={draft.user_null}
              onCheckedChange={(checked) =>
                setDraft((d) => ({
                  ...d,
                  user_null: checked,
                  user_id: checked ? "" : d.user_id,
                }))
              }
            />
            <Label htmlFor="ga-null" className="cursor-pointer font-normal">
              Só eventos sem utilizador (ex.: login falhado, e-mail inexistente)
            </Label>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={applyFilters}>
            Aplicar filtros
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              const e = emptyFilters();
              setDraft(e);
              setApplied(e);
            }}
          >
            Limpar
          </Button>
        </div>

        {error && (
          <p className="text-sm text-destructive mt-4">
            {error.message || "Erro ao carregar registos."}
          </p>
        )}

        <div className="flex items-center justify-between gap-3 mt-6 pt-4 border-t border-border flex-wrap">
          <p className="text-sm text-muted-foreground">
            {total === 0
              ? "Nenhum registo."
              : `Mostrando ${applied.skip + 1}–${applied.skip + rows.length} de ${total}`}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={goPrev}
              disabled={!hasPrev || isLoading}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Anterior
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={goNext}
              disabled={!hasNext || isLoading}
            >
              Seguinte
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>

        {isLoading && (
          <div className="space-y-2 mt-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        )}

        {!isLoading && !error && rows.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-12">
            Nenhum registo com estes filtros.
          </p>
        )}

        {!isLoading && !error && rows.length > 0 && (
          <ScrollArea className="max-h-[min(70vh,640px)] mt-4 pr-3">
            <div className="space-y-3">
              {rows.map((row) => {
                const actorId = row.actor_user_id;
                const subjectId = row.user_id;
                const actorOther =
                  actorId != null &&
                  subjectId != null &&
                  actorId !== subjectId;
                const actorLabel =
                  actorOther && emailById[actorId]
                    ? emailById[actorId]
                    : actorOther
                      ? `#${actorId}`
                      : null;
                const subjectLabel =
                  subjectId != null
                    ? emailById[subjectId] || `#${subjectId}`
                    : "—";
                return (
                  <div
                    key={row.id}
                    className="border border-border rounded-xl p-3 text-sm space-y-1.5 bg-muted/30"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="font-medium text-foreground">
                        {labelForAction(row.action)}
                      </span>
                      <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                        {formatTs(row.created_at)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Utilizador: {subjectLabel}
                    </p>
                    {actorLabel && (
                      <p className="text-xs text-muted-foreground">
                        Executado por: {actorLabel}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground break-all">
                      IP: {row.ip || "—"}
                    </p>
                    <pre className="text-[11px] leading-snug text-muted-foreground whitespace-pre-wrap break-all font-mono bg-background/80 rounded-md p-2 border border-border/60">
                      {formatAuditDetails(row.details)}
                    </pre>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </motion.div>
    </div>
  );
}
