import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { format, parseISO, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  Activity,
  Clock,
  Database,
  FileStack,
  Files,
  Gauge,
  HardDrive,
  RefreshCw,
  Server,
} from "lucide-react";

async function fetchHealth() {
  const r = await fetch("/api/health", {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(t || r.statusText);
  }
  return r.json();
}

async function fetchServerInfo() {
  const r = await fetch("/api/admin/server-info", {
    credentials: "include",
    cache: "no-store",
    headers: { Accept: "application/json" },
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

function formatServerTime(iso) {
  if (!iso) return "—";
  try {
    const d = typeof iso === "string" ? parseISO(iso) : new Date(iso);
    if (!isValid(d)) return "—";
    return format(d, "dd/MM/yyyy HH:mm:ss", { locale: ptBR });
  } catch {
    return "—";
  }
}

function formatUptime(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds || 0));
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  if (days) return `${days}d ${hours}h`;
  if (hours) return `${hours}h ${minutes}min`;
  return `${minutes || 0}min`;
}

function formatBytes(n) {
  if (n == null || !Number.isFinite(Number(n))) return "—";
  const b = Number(n);
  if (b < 1024) return `${b} B`;
  if (b < 1024 ** 2) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 ** 3) return `${(b / 1024 ** 2).toFixed(2)} MB`;
  return `${(b / 1024 ** 3).toFixed(2)} GB`;
}

function pct(value) {
  if (value == null || !Number.isFinite(Number(value))) return null;
  return Math.max(0, Math.min(100, Number(value)));
}

function fileTypeLabel(type) {
  const labels = {
    image: "Imagens",
    video: "Vídeos",
    audio: "Áudios",
    pdf: "PDFs",
    document: "Documentos",
    other: "Outros",
  };
  return labels[type] || "Outros";
}

function ProgressBar({ value, tone = "default" }) {
  const v = pct(value) ?? 0;
  const fill =
    tone === "danger"
      ? "bg-destructive"
      : "bg-foreground/70 dark:bg-foreground/60";
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div
        className={cn("h-full rounded-full transition-[width] duration-500 ease-out", fill)}
        style={{ width: `${v}%` }}
      />
    </div>
  );
}

function StatCard({ icon: Icon, label, value, detail, status, statusTone }) {
  const statusClass =
    statusTone === "ok"
      ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200"
      : statusTone === "bad"
        ? "bg-destructive/15 text-destructive"
        : "bg-muted text-muted-foreground";
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Icon className="h-5 w-5" />
        </div>
        {status ? (
          <span className={cn("rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide", statusClass)}>
            {status}
          </span>
        ) : null}
      </div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-foreground">
        {value}
      </p>
      {detail ? (
        <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">{detail}</p>
      ) : null}
    </div>
  );
}

function SectionCard({ icon: Icon, title, description, children }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-card"
    >
      <div className="p-5 sm:p-6">
        <div className="mb-5 flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-foreground">{title}</h3>
            {description ? (
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
            ) : null}
          </div>
        </div>
        {children}
      </div>
    </motion.section>
  );
}

function MiniRow({ label, value, detail }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border py-2.5 last:border-0">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{label}</p>
        {detail ? (
          <p className="truncate text-[11px] text-muted-foreground">{detail}</p>
        ) : null}
      </div>
      <p className="shrink-0 text-right text-sm font-semibold tabular-nums text-foreground">
        {value}
      </p>
    </div>
  );
}

export default function AdminServerPanel() {
  const queryClient = useQueryClient();

  const {
    data: healthData,
    isLoading: healthLoading,
    error: healthError,
    isFetching: healthFetching,
  } = useQuery({
    queryKey: ["admin-server-health"],
    queryFn: fetchHealth,
    staleTime: 15_000,
  });

  const {
    data: info,
    isLoading: infoLoading,
    error: infoError,
    isFetching: infoFetching,
  } = useQuery({
    queryKey: ["admin-server-info"],
    queryFn: fetchServerInfo,
    staleTime: 15_000,
  });

  const refreshing = healthFetching || infoFetching;
  const okHealth = healthData?.ok === true;
  const heapPct =
    info?.memory_mb?.heap_total > 0
      ? Math.round((info.memory_mb.heap_used / info.memory_mb.heap_total) * 1000) / 10
      : null;
  const ramPct =
    info?.os?.total_mem_mb > 0
      ? Math.round(
          ((info.os.total_mem_mb - info.os.free_mem_mb) / info.os.total_mem_mb) * 1000,
        ) / 10
      : null;
  const disk = info?.storage?.disk;
  const siteFiles = info?.storage?.site_files;
  const mongoCollections = Array.isArray(info?.mongodb?.collections)
    ? info.mongodb.collections.slice(0, 8)
    : [];

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-server-health"] });
    queryClient.invalidateQueries({ queryKey: ["admin-server-info"] });
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-foreground">
            Servidor
            {!healthLoading && !healthError && (
              <span
                className={cn(
                  "inline-flex h-2 w-2 rounded-full",
                  okHealth ? "bg-emerald-500" : "bg-destructive",
                )}
                title={okHealth ? "API respondendo" : "API com falha"}
                aria-hidden
              />
            )}
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Visão resumida da API, MongoDB, memória e armazenamento usado pelos
            arquivos do site.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="shrink-0 gap-2 self-start sm:self-auto"
          onClick={refreshAll}
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      {(healthLoading || infoLoading) && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      )}

      {healthError || infoError ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {healthError?.message ||
            infoError?.message ||
            "Não foi possível carregar métricas do servidor."}
        </div>
      ) : null}

      {!infoLoading && !infoError && info ? (
        <div className="space-y-6 sm:space-y-8">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              icon={Activity}
              label="API"
              value={okHealth ? "Online" : "Indisponível"}
              detail={`Health: ${formatServerTime(healthData?.time)}`}
              status={okHealth ? "OK" : "Falhou"}
              statusTone={okHealth ? "ok" : "bad"}
            />
            <StatCard
              icon={Database}
              label="MongoDB"
              value={info.mongodb?.ok ? "Ligado" : "Falhou"}
              detail={
                info.mongodb?.ok
                  ? `${info.mongodb.ping_ms ?? "—"} ms · ${formatBytes(info.mongodb?.stats?.total_bytes)}`
                  : info.mongodb?.error || "Sem resposta"
              }
              status={
                info.mongodb?.ok
                  ? `${info.mongodb?.stats?.collections ?? "—"} coleções`
                  : "Erro"
              }
              statusTone={info.mongodb?.ok ? "ok" : "bad"}
            />
            <StatCard
              icon={Server}
              label="Processo"
              value={formatUptime(info.process?.uptime_seconds)}
              detail={`Node ${info.node?.version ?? "—"} · PID ${info.process?.pid ?? "—"}`}
              status={info.environment ?? "—"}
            />
            <StatCard
              icon={HardDrive}
              label="Disco"
              value={disk ? formatBytes(disk.free_bytes) : "—"}
              detail={disk ? `livre de ${formatBytes(disk.total_bytes)}` : "Espaço disponível indisponível"}
              status={disk ? `${disk.free_pct}% livre` : "N/D"}
            />
          </div>

          <SectionCard
            icon={Database}
            title="MongoDB"
            description="Tamanho do banco e coleções mais relevantes para operação."
          >
            <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="grid grid-cols-2 gap-3">
                <StatCard
                  icon={Database}
                  label="Dados"
                  value={formatBytes(info.mongodb?.stats?.data_bytes)}
                  detail={`${info.mongodb?.stats?.objects ?? "—"} documento(s)`}
                />
                <StatCard
                  icon={Gauge}
                  label="Índices"
                  value={formatBytes(info.mongodb?.stats?.index_bytes)}
                  detail="Espaço de índices"
                />
              </div>
              <div className="rounded-xl border border-border bg-muted/20 px-4 py-2">
                {mongoCollections.length > 0 ? (
                  mongoCollections.map((c) => (
                    <MiniRow
                      key={c.name}
                      label={c.name}
                      value={formatBytes(c.total_bytes)}
                      detail={`${c.count} documento(s) · índices ${formatBytes(c.index_bytes)}`}
                    />
                  ))
                ) : (
                  <p className="py-6 text-sm text-muted-foreground">
                    Sem detalhes de coleções disponíveis.
                  </p>
                )}
              </div>
            </div>
          </SectionCard>

          <SectionCard
            icon={FileStack}
            title="Armazenamento"
            description="Uso do disco, uploads e distribuição dos arquivos do site por tipo."
          >
            <div className="-mt-1 mb-4 flex flex-wrap justify-end gap-2">
              <Button type="button" variant="outline" size="sm" className="gap-2" asChild>
                <Link to="/Admin?tab=uploads">
                  <Files className="h-4 w-4" aria-hidden />
                  Todos os ficheiros de upload
                </Link>
              </Button>
            </div>
            <div className="space-y-6">
              <div className="grid gap-4 lg:grid-cols-3">
                <div className="rounded-xl border border-border bg-muted/20 p-4 lg:col-span-2">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Disco do servidor
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {disk
                          ? `${formatBytes(disk.used_bytes)} usados · ${formatBytes(disk.free_bytes)} livres`
                          : "Informação de espaço livre não suportada neste ambiente."}
                      </p>
                    </div>
                    <span className="text-sm font-semibold tabular-nums text-foreground">
                      {disk ? `${disk.used_pct}% usado` : "N/D"}
                    </span>
                  </div>
                  <ProgressBar
                    value={disk?.used_pct}
                    tone={disk?.used_pct > 85 ? "danger" : "default"}
                  />
                </div>
                <div className="rounded-xl border border-border bg-muted/20 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Uploads registrados
                  </p>
                  <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">
                    {formatBytes(siteFiles?.total_bytes)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {siteFiles?.total_files ?? 0} arquivo(s) no cadastro de arquivos
                  </p>
                </div>
              </div>

              <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
                <div className="space-y-3">
                  <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Consumo por tipo de arquivo
                  </h4>
                  {siteFiles?.by_type?.length ? (
                    siteFiles.by_type.map((row) => (
                      <div
                        key={row.type}
                        className="rounded-xl border border-border bg-muted/20 p-3"
                      >
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {fileTypeLabel(row.type)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {row.files} arquivo(s) · {formatBytes(row.bytes)}
                            </p>
                          </div>
                          <span className="text-sm tabular-nums text-muted-foreground">
                            {row.pct_of_uploads ?? 0}%
                          </span>
                        </div>
                        <ProgressBar value={row.pct_of_uploads} />
                        {row.pct_of_disk != null ? (
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            {row.pct_of_disk}% do disco total
                          </p>
                        ) : null}
                      </div>
                    ))
                  ) : (
                    <div className="rounded-xl border border-border bg-muted/20 p-4">
                      <p className="text-sm text-muted-foreground">
                        Ainda não há arquivos registrados no servidor.
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Maiores arquivos do site
                  </h4>
                  <div className="rounded-xl border border-border bg-muted/20 px-4 py-2">
                    {siteFiles?.largest?.length ? (
                      siteFiles.largest.map((file) => (
                        <MiniRow
                          key={file.id}
                          label={file.name}
                          value={formatBytes(file.bytes)}
                          detail={`${fileTypeLabel(file.type)} · ${file.mime}`}
                        />
                      ))
                    ) : (
                      <p className="py-6 text-sm text-muted-foreground">
                        Nenhum arquivo encontrado.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-border bg-muted/20 px-4">
                  <MiniRow
                    label="Pasta de uploads"
                    value={formatBytes(info.storage?.uploads?.bytes)}
                    detail={`${info.storage?.uploads?.files ?? 0} ficheiro(s) · ${info.storage?.uploads?.path ?? "—"}`}
                  />
                </div>
                <div className="rounded-xl border border-border bg-muted/20 px-4">
                  <MiniRow
                    label="Logs em disco"
                    value={formatBytes(info.storage?.logs?.bytes)}
                    detail={`${info.storage?.logs?.files ?? 0} ficheiro(s) · ${info.storage?.logs?.path ?? "—"}`}
                  />
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            icon={Gauge}
            title="Recursos do processo"
            description="Resumo operacional do Node.js e da máquina."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Heap Node.js
                  </p>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {heapPct ?? "—"}%
                  </span>
                </div>
                <ProgressBar value={heapPct} />
                <p className="mt-2 text-xs text-muted-foreground">
                  {info.memory_mb?.heap_used ?? "—"} MB usados de{" "}
                  {info.memory_mb?.heap_total ?? "—"} MB
                </p>
              </div>
              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    RAM do sistema
                  </p>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {ramPct ?? "—"}%
                  </span>
                </div>
                <ProgressBar
                  value={ramPct}
                  tone={ramPct > 85 ? "danger" : "default"}
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  {info.os?.free_mem_mb ?? "—"} MB livres de {info.os?.total_mem_mb ?? "—"} MB
                </p>
              </div>
            </div>
          </SectionCard>

          <div className="flex items-start gap-3 rounded-xl border border-dashed border-border bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
            <Clock className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Dados atualizados em {formatServerTime(info.time_iso)}. Métricas de espaço
              disponível dependem do suporte do sistema operacional a <code>statfs</code>.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
