import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { format, parseISO, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ScrollText,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Timer,
  User as UserIcon,
} from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  labelForAction,
  formatAuditDetails,
  categoryForAction,
  initialsFromIdentity,
} from "@/lib/auditLogLabels";
import { withCsrfHeaderAsync } from "@/lib/csrf";
import { toast } from "sonner";
import { api } from "@/api/client";

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

async function fetchAuditRetention() {
  const r = await fetch("/api/admin/audit-log-retention", {
    credentials: "include",
  });
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
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(emptyFilters);
  const [applied, setApplied] = useState(emptyFilters);
  const [retentionDraft, setRetentionDraft] = useState("never");
  const [savingRetention, setSavingRetention] = useState(false);

  const {
    data: retentionData,
    isLoading: retentionLoading,
  } = useQuery({
    queryKey: ["audit-log-retention"],
    queryFn: fetchAuditRetention,
  });

  useEffect(() => {
    const r = retentionData?.retention;
    if (r === "never" || r === "30" || r === "60" || r === "90") {
      setRetentionDraft(r);
    }
  }, [retentionData?.retention]);

  const { data: users = [] } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => api.entities.User.list(),
  });

  /**
   * Mapa rico id → { email, full_name, avatar_url } para exibir avatar e nome
   * nos registos sem precisar de queries adicionais.
   */
  const userById = useMemo(() => {
    const map = new Map();
    for (const u of users || []) {
      if (u && u.id != null) {
        map.set(u.id, {
          id: u.id,
          email: u.email || "",
          full_name: u.full_name || "",
          avatar_url: u.avatar_url || "",
        });
      }
    }
    return map;
  }, [users]);

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

  const saveRetention = async () => {
    setSavingRetention(true);
    try {
      const r = await fetch("/api/admin/audit-log-retention", {
        method: "PUT",
        credentials: "include",
        headers: await withCsrfHeaderAsync({
          "Content-Type": "application/json",
          Accept: "application/json",
        }),
        body: JSON.stringify({ retention: retentionDraft }),
      });
      const text = await r.text();
      let parsed = null;
      try {
        parsed = text ? JSON.parse(text) : null;
      } catch {
        parsed = null;
      }
      if (!r.ok) {
        const msg = parsed?.message || "Não foi possível guardar.";
        throw new Error(msg);
      }
      const deleted =
        typeof parsed?.deleted === "number" ? parsed.deleted : 0;
      queryClient.invalidateQueries({ queryKey: ["audit-log-retention"] });
      queryClient.invalidateQueries({ queryKey: ["global-audit-log"] });
      if (deleted > 0) {
        toast.success(
          `Política guardada. Foram removidos ${deleted} registo(s) antigo(s).`,
        );
      } else {
        toast.success("Política de retenção guardada.");
      }
    } catch (e) {
      toast.error(e?.message || "Erro ao guardar a política de retenção.");
    } finally {
      setSavingRetention(false);
    }
  };

  const retentionDirty =
    retentionData?.retention !== undefined &&
    retentionDraft !== retentionData.retention;

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.02 }}
        className="bg-card border border-border rounded-2xl p-6"
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
            <Timer className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground text-lg">
              Retenção no servidor
            </h2>
            <p className="text-sm text-muted-foreground">
              Define até quando os registos de auditoria permanecem guardados. Ao
              aplicar uma política com limite de dias, os registos mais antigos são
              eliminados automaticamente (incluindo após cada reinício do servidor,
              uma vez por dia).
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-end gap-4">
          <div className="space-y-2 min-w-[min(100%,280px)]">
            <Label htmlFor="audit-retention-policy">Eliminar registos com mais de</Label>
            <Select
              value={retentionDraft}
              onValueChange={setRetentionDraft}
              disabled={retentionLoading}
            >
              <SelectTrigger id="audit-retention-policy" className="h-10 w-full sm:w-[280px]">
                <SelectValue placeholder="Carregar…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="never">Nunca (padrão)</SelectItem>
                <SelectItem value="30">30 dias</SelectItem>
                <SelectItem value="60">60 dias</SelectItem>
                <SelectItem value="90">90 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            type="button"
            onClick={saveRetention}
            disabled={savingRetention || retentionLoading || !retentionDirty}
            className="gap-2 sm:mb-0.5"
          >
            {savingRetention ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : null}
            Guardar
          </Button>
        </div>
      </motion.div>

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
              size="icon"
              onClick={goPrev}
              disabled={!hasPrev || isLoading}
              aria-label="Página anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-xs text-muted-foreground tabular-nums self-center">
              {Math.floor(applied.skip / PAGE_SIZE) + 1} /{" "}
              {Math.max(1, Math.ceil(total / PAGE_SIZE))}
            </span>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={goNext}
              disabled={!hasNext || isLoading}
              aria-label="Próxima página"
            >
              <ChevronRight className="w-4 h-4" />
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
                const actor = actorId != null ? userById.get(actorId) : null;
                const subject =
                  subjectId != null ? userById.get(subjectId) : null;
                const actorOther =
                  actorId != null &&
                  subjectId != null &&
                  actorId !== subjectId;

                const actorIdentity =
                  actor?.full_name || actor?.email || (actorId != null ? `#${actorId}` : null);
                const subjectIdentity =
                  subject?.full_name || subject?.email || (subjectId != null ? `#${subjectId}` : "—");

                /** Quem efetivamente "executou" a ação: actor se distinto, senão o próprio sujeito. */
                const principal = actor || subject;
                const principalIdentity = actorIdentity || subjectIdentity;

                const category = categoryForAction(row.action);
                const Icon = category.icon;

                return (
                  <div
                    key={row.id}
                    className={`relative rounded-xl bg-card border border-border ${category.accentClass} p-3 sm:p-4 text-sm shadow-sm transition-colors hover:bg-muted/40`}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10 shrink-0 border border-border bg-muted">
                        {principal?.avatar_url ? (
                          <AvatarImage
                            src={principal.avatar_url}
                            alt={principalIdentity || "Utilizador"}
                            referrerPolicy="no-referrer"
                          />
                        ) : null}
                        <AvatarFallback className="text-xs font-semibold text-muted-foreground">
                          {principal ? (
                            initialsFromIdentity(principalIdentity)
                          ) : (
                            <UserIcon className="h-4 w-4" aria-hidden />
                          )}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${category.badgeClass}`}
                          >
                            <Icon className={`h-3 w-3 ${category.iconClass}`} aria-hidden />
                            {category.label}
                          </span>
                          <span className="font-medium text-foreground">
                            {labelForAction(row.action)}
                          </span>
                          <span className="ml-auto text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                            {formatTs(row.created_at)}
                          </span>
                        </div>

                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">
                            {principalIdentity || "—"}
                          </span>
                          {actorOther ? (
                            <>
                              {" "}
                              <span aria-hidden>→</span>{" "}
                              <span className="font-medium text-foreground">
                                {subjectIdentity}
                              </span>
                            </>
                          ) : null}
                          <span className="mx-1.5 opacity-50">·</span>
                          <span className="font-mono">{row.ip || "—"}</span>
                        </p>

                        <pre className="text-[11px] leading-snug text-muted-foreground whitespace-pre-wrap break-all font-mono bg-background/80 rounded-md p-2 border border-border/60">
                          {formatAuditDetails(row.details)}
                        </pre>
                      </div>
                    </div>
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
