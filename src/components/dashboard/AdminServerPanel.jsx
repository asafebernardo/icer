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

/** Ícones das métricas e secções (aba Servidor). */
const SERVER_ICON_TONE = {
  api: "bg-emerald-500/16 text-emerald-800 shadow-sm shadow-emerald-500/10 dark:bg-emerald-500/25 dark:text-emerald-100",
  mongo:
    "bg-sky-600/16 text-sky-900 shadow-sm shadow-sky-500/10 dark:bg-sky-500/28 dark:text-sky-50",
  process:
    "bg-violet-500/16 text-violet-900 shadow-sm shadow-violet-500/10 dark:bg-violet-500/28 dark:text-violet-50",
  disk: "bg-amber-500/18 text-amber-950 shadow-sm shadow-amber-500/10 dark:bg-amber-500/25 dark:text-amber-50",
  files:
    "bg-orange-500/16 text-orange-950 shadow-sm shadow-orange-500/10 dark:bg-orange-500/22 dark:text-orange-50",
  gauge:
    "bg-indigo-500/16 text-indigo-950 shadow-sm shadow-indigo-500/10 dark:bg-indigo-500/28 dark:text-indigo-50",
};

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

/** Estilo painel tipo Grafana (borda esquerda + fundo em degradé). */
const GRAFANA_PANEL = {
  api: "border-l-[3px] border-l-emerald-500 bg-gradient-to-br from-emerald-500/[0.14] via-card to-card shadow-[0_0_24px_-12px_rgba(16,185,129,0.45)] ring-1 ring-emerald-500/20 dark:from-emerald-950/40 dark:shadow-[0_0_32px_-10px_rgba(52,211,153,0.25)] dark:ring-emerald-400/15",
  mongo:
    "border-l-[3px] border-l-sky-500 bg-gradient-to-br from-sky-500/[0.12] via-card to-card shadow-[0_0_24px_-12px_rgba(14,165,233,0.4)] ring-1 ring-sky-500/20 dark:from-sky-950/45 dark:shadow-[0_0_28px_-10px_rgba(56,189,248,0.22)] dark:ring-sky-400/15",
  process:
    "border-l-[3px] border-l-violet-500 bg-gradient-to-br from-violet-500/[0.12] via-card to-card shadow-[0_0_24px_-12px_rgba(139,92,246,0.4)] ring-1 ring-violet-500/20 dark:from-violet-950/40 dark:shadow-[0_0_28px_-10px_rgba(167,139,250,0.2)] dark:ring-violet-400/15",
  disk: "border-l-[3px] border-l-amber-500 bg-gradient-to-br from-amber-500/[0.14] via-card to-card shadow-[0_0_24px_-12px_rgba(245,158,11,0.4)] ring-1 ring-amber-500/25 dark:from-amber-950/35 dark:shadow-[0_0_28px_-10px_rgba(251,191,36,0.18)] dark:ring-amber-400/15",
  gauge:
    "border-l-[3px] border-l-indigo-500 bg-gradient-to-br from-indigo-500/[0.12] via-card to-card shadow-[0_0_24px_-12px_rgba(99,102,241,0.38)] ring-1 ring-indigo-500/20 dark:from-indigo-950/40 dark:shadow-[0_0_28px_-10px_rgba(129,140,248,0.2)] dark:ring-indigo-400/15",
};

const GRAFANA_SECTION_TOP = {
  mongo: "from-sky-500 via-cyan-400 to-blue-600",
  files: "from-orange-500 via-amber-500 to-yellow-500",
  gauge: "from-indigo-500 via-violet-500 to-fuchsia-500",
};

/** Fundo em grelha (painel de métricas). */
function GrafanaPanelBg({ children, className }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-white/10 bg-zinc-950/[0.35] dark:border-white/5 dark:bg-zinc-950/60",
        "before:pointer-events-none before:absolute before:inset-0 before:opacity-[0.65] dark:before:opacity-90",
        "before:bg-[linear-gradient(rgba(148,163,184,0.09)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.09)_1px,transparent_1px)] before:bg-[length:22px_22px]",
        className,
      )}
    >
      <div className="relative z-[1]">{children}</div>
    </div>
  );
}

function ProgressBar({ value, variant = "accent" }) {
  const v = pct(value) ?? 0;
  const fill =
    variant === "danger"
      ? "bg-gradient-to-r from-rose-600 to-orange-500 shadow-[0_0_12px_rgba(244,63,94,0.35)]"
      : variant === "success"
        ? "bg-gradient-to-r from-emerald-600 to-lime-400 shadow-[0_0_10px_rgba(52,211,153,0.35)]"
        : variant === "sky"
          ? "bg-gradient-to-r from-sky-600 to-cyan-400 shadow-[0_0_10px_rgba(56,189,248,0.3)]"
          : variant === "violet"
            ? "bg-gradient-to-r from-violet-600 to-fuchsia-500 shadow-[0_0_10px_rgba(167,139,250,0.25)]"
            : "bg-gradient-to-r from-primary to-accent shadow-sm shadow-primary/25";
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-zinc-800/25 ring-1 ring-inset ring-white/5 dark:bg-black/50">
      <div
        className={cn("h-full rounded-full transition-[width] duration-500 ease-out", fill)}
        style={{ width: `${v}%` }}
      />
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  detail,
  status,
  iconClassName,
  grafanaSeries,
  statusTone,
}) {
  const shell = grafanaSeries ? GRAFANA_PANEL[grafanaSeries] : "border border-border bg-card";
  const statusClass =
    statusTone === "ok"
      ? "bg-emerald-500/25 font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-800 ring-1 ring-emerald-500/40 dark:text-emerald-100"
      : statusTone === "bad"
        ? "bg-rose-500/20 font-mono text-[10px] font-bold uppercase tracking-wider text-rose-900 ring-1 ring-rose-500/35 dark:text-rose-100"
        : "bg-muted/80 font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground ring-1 ring-border/60";
  return (
    <div className={cn("rounded-xl p-4", shell)}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-lg ring-1 ring-white/10",
            iconClassName || "bg-accent/10 text-accent",
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        {status ? <span className={cn("rounded-md px-2 py-0.5", statusClass)}>{status}</span> : null}
      </div>
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/90">
        {label}
      </p>
      <p className="mt-1 font-mono text-2xl font-semibold tabular-nums tracking-tight text-foreground">
        {value}
      </p>
      {detail ? (
        <p className="mt-1.5 font-mono text-[11px] leading-relaxed text-muted-foreground/90">{detail}</p>
      ) : null}
    </div>
  );
}

function SectionCard({ icon: Icon, title, description, children, iconClassName, grafanaStrip }) {
  const strip = grafanaStrip ? GRAFANA_SECTION_TOP[grafanaStrip] : "from-muted-foreground/40 to-muted-foreground/20";
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-[0_4px_24px_-12px_rgba(0,0,0,0.12)] ring-1 ring-black/[0.04] dark:bg-zinc-950/30 dark:shadow-[0_0_40px_-16px_rgba(0,0,0,0.5)] dark:ring-white/[0.06]"
    >
      <div className={cn("h-1 bg-gradient-to-r", strip)} aria-hidden />
      <div className="p-5 sm:p-6">
        <div className="mb-5 flex items-start gap-3">
          <div
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ring-1 ring-white/15",
              iconClassName || "bg-accent/10 text-accent",
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="font-mono text-base font-bold uppercase tracking-wide text-foreground">
              {title}
            </h3>
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

function MiniRow({ label, value, detail, variant = "sky" }) {
  const row =
    variant === "amber"
      ? "border-orange-500/10 hover:bg-orange-500/[0.07] dark:border-orange-400/10 dark:hover:bg-orange-500/10"
      : "border-sky-500/10 hover:bg-sky-500/[0.06] dark:border-sky-400/10 dark:hover:bg-sky-500/10";
  const valueCls =
    variant === "amber"
      ? "text-orange-800 dark:text-orange-200"
      : "text-sky-700 dark:text-sky-300";
  return (
    <div
      className={cn(
        "group flex items-center justify-between gap-3 border-b py-2.5 transition-colors last:border-0",
        row,
      )}
    >
      <div className="min-w-0">
        <p className="truncate font-mono text-sm font-medium text-foreground">{label}</p>
        {detail ? (
          <p className="truncate font-mono text-[11px] text-muted-foreground">{detail}</p>
        ) : null}
      </div>
      <p className={cn("shrink-0 text-right font-mono text-sm font-semibold tabular-nums", valueCls)}>
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
        <div className="flex min-w-0 items-start gap-3">
          <div
            className={cn(
              "mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
              SERVER_ICON_TONE.process,
            )}
          >
            <Server className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-foreground">
              Servidor
              {!healthLoading && !healthError && (
                <span
                  className={cn(
                    "inline-flex h-2 w-2 rounded-full",
                    okHealth
                      ? "animate-pulse bg-emerald-500 shadow-[0_0_10px_2px_rgba(34,197,94,0.55)]"
                      : "bg-rose-500 shadow-[0_0_8px_2px_rgba(244,63,94,0.45)]",
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
        </div>
        <Button
          type="button"
          variant="outline"
          className="shrink-0 gap-2 self-start border-orange-500/35 bg-orange-500/[0.06] hover:bg-orange-500/15 dark:border-orange-400/30 dark:bg-orange-950/30 dark:hover:bg-orange-950/50 sm:self-auto"
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
            <Skeleton key={i} className="h-32 rounded-2xl" />
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
        <GrafanaPanelBg className="rounded-2xl p-4 sm:p-6">
          <div className="space-y-6 sm:space-y-8">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              icon={Activity}
              label="API"
              value={okHealth ? "Online" : "Indisponível"}
              detail={`Health: ${formatServerTime(healthData?.time)}`}
              status={okHealth ? "OK" : "Falhou"}
              iconClassName={SERVER_ICON_TONE.api}
              grafanaSeries="api"
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
              iconClassName={SERVER_ICON_TONE.mongo}
              grafanaSeries="mongo"
              statusTone={info.mongodb?.ok ? "ok" : "bad"}
            />
            <StatCard
              icon={Server}
              label="Processo"
              value={formatUptime(info.process?.uptime_seconds)}
              detail={`Node ${info.node?.version ?? "—"} · PID ${info.process?.pid ?? "—"}`}
              status={info.environment ?? "—"}
              iconClassName={SERVER_ICON_TONE.process}
              grafanaSeries="process"
            />
            <StatCard
              icon={HardDrive}
              label="Disco"
              value={disk ? formatBytes(disk.free_bytes) : "—"}
              detail={disk ? `livre de ${formatBytes(disk.total_bytes)}` : "Espaço disponível indisponível"}
              status={disk ? `${disk.free_pct}% livre` : "N/D"}
              iconClassName={SERVER_ICON_TONE.disk}
              grafanaSeries="disk"
            />
          </div>

          <SectionCard
            icon={Database}
            title="MongoDB"
            description="Tamanho do banco e coleções mais relevantes para operação."
            iconClassName={SERVER_ICON_TONE.mongo}
            grafanaStrip="mongo"
          >
            <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
              <GrafanaPanelBg className="rounded-xl p-4 ring-1 ring-sky-500/20">
                <div className="grid grid-cols-2 gap-3">
                  <StatCard
                    icon={Database}
                    label="Dados"
                    value={formatBytes(info.mongodb?.stats?.data_bytes)}
                    detail={`${info.mongodb?.stats?.objects ?? "—"} documento(s)`}
                    iconClassName={SERVER_ICON_TONE.mongo}
                    grafanaSeries="mongo"
                  />
                  <StatCard
                    icon={Gauge}
                    label="Índices"
                    value={formatBytes(info.mongodb?.stats?.index_bytes)}
                    detail="Espaço de índices"
                    iconClassName={SERVER_ICON_TONE.gauge}
                    grafanaSeries="gauge"
                  />
                </div>
              </GrafanaPanelBg>
              <GrafanaPanelBg className="rounded-xl px-4 py-2 ring-1 ring-sky-500/15">
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
              </GrafanaPanelBg>
            </div>
          </SectionCard>

          <SectionCard
            icon={FileStack}
            title="Armazenamento"
            description="Uso do disco, uploads e distribuição dos arquivos do site por tipo."
            iconClassName={SERVER_ICON_TONE.files}
            grafanaStrip="files"
          >
            <div className="-mt-1 mb-4 flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2 border-orange-500/35 bg-orange-500/[0.06] hover:bg-orange-500/12 dark:border-orange-400/30 dark:bg-orange-950/25"
                asChild
              >
                <Link to="/Admin?tab=uploads">
                  <Files className="h-4 w-4" aria-hidden />
                  Todos os ficheiros de upload
                </Link>
              </Button>
            </div>
            <div className="space-y-6">
              <div className="grid gap-4 lg:grid-cols-3">
                <GrafanaPanelBg className="rounded-xl p-4 lg:col-span-2 ring-1 ring-orange-500/20">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-mono text-xs font-bold uppercase tracking-wider text-orange-800/90 dark:text-orange-200/90">
                        Disco do servidor
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {disk
                          ? `${formatBytes(disk.used_bytes)} usados · ${formatBytes(disk.free_bytes)} livres`
                          : "Informação de espaço livre não suportada neste ambiente."}
                      </p>
                    </div>
                    <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
                      {disk ? `${disk.used_pct}% usado` : "N/D"}
                    </span>
                  </div>
                  <ProgressBar
                    value={disk?.used_pct}
                    variant={disk?.used_pct > 85 ? "danger" : "sky"}
                  />
                </GrafanaPanelBg>
                <GrafanaPanelBg className="rounded-xl p-4 ring-1 ring-amber-500/25">
                  <p className="font-mono text-xs font-bold uppercase tracking-wider text-amber-900/85 dark:text-amber-100/90">
                    Uploads registrados
                  </p>
                  <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-foreground">
                    {formatBytes(siteFiles?.total_bytes)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {siteFiles?.total_files ?? 0} arquivo(s) no cadastro de arquivos
                  </p>
                </GrafanaPanelBg>
              </div>

              <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
                <div className="space-y-3">
                  <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-orange-900/80 dark:text-orange-200/90">
                    Consumo por tipo de arquivo
                  </h4>
                  {siteFiles?.by_type?.length ? (
                    siteFiles.by_type.map((row, i) => (
                      <GrafanaPanelBg
                        key={row.type}
                        className="rounded-xl p-3 ring-1 ring-orange-500/15"
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
                          <span className="font-mono text-sm tabular-nums text-muted-foreground">
                            {row.pct_of_uploads ?? 0}%
                          </span>
                        </div>
                        <ProgressBar
                          value={row.pct_of_uploads}
                          variant={["sky", "violet", "success", "accent"][i % 4]}
                        />
                        {row.pct_of_disk != null ? (
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            {row.pct_of_disk}% do disco total
                          </p>
                        ) : null}
                      </GrafanaPanelBg>
                    ))
                  ) : (
                    <GrafanaPanelBg className="p-4 ring-1 ring-orange-500/10">
                      <p className="text-sm text-muted-foreground">
                        Ainda não há arquivos registrados no servidor.
                      </p>
                    </GrafanaPanelBg>
                  )}
                </div>

                <div className="space-y-3">
                  <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-orange-900/80 dark:text-orange-200/90">
                    Maiores arquivos do site
                  </h4>
                  <GrafanaPanelBg className="px-4 py-2 ring-1 ring-orange-500/15">
                    {siteFiles?.largest?.length ? (
                      siteFiles.largest.map((file) => (
                        <MiniRow
                          key={file.id}
                          label={file.name}
                          value={formatBytes(file.bytes)}
                          detail={`${fileTypeLabel(file.type)} · ${file.mime}`}
                          variant="amber"
                        />
                      ))
                    ) : (
                      <p className="py-6 text-sm text-muted-foreground">
                        Nenhum arquivo encontrado.
                      </p>
                    )}
                  </GrafanaPanelBg>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <MiniRow
                  label="Pasta de uploads"
                  value={formatBytes(info.storage?.uploads?.bytes)}
                  detail={`${info.storage?.uploads?.files ?? 0} ficheiro(s) · ${info.storage?.uploads?.path ?? "—"}`}
                  variant="amber"
                />
                <MiniRow
                  label="Logs em disco"
                  value={formatBytes(info.storage?.logs?.bytes)}
                  detail={`${info.storage?.logs?.files ?? 0} ficheiro(s) · ${info.storage?.logs?.path ?? "—"}`}
                  variant="amber"
                />
              </div>
            </div>
          </SectionCard>

          <SectionCard
            icon={Gauge}
            title="Recursos do processo"
            description="Resumo operacional do Node.js e da máquina."
            iconClassName={SERVER_ICON_TONE.gauge}
            grafanaStrip="gauge"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <GrafanaPanelBg className="rounded-xl p-4 ring-1 ring-violet-500/25">
                <div className="mb-2 flex items-center justify-between">
                  <p className="font-mono text-xs font-bold uppercase tracking-wider text-violet-900/85 dark:text-violet-200/90">
                    Heap Node.js
                  </p>
                  <span className="font-mono text-sm tabular-nums text-muted-foreground">
                    {heapPct ?? "—"}%
                  </span>
                </div>
                <ProgressBar value={heapPct} variant="violet" />
                <p className="mt-2 text-xs text-muted-foreground">
                  {info.memory_mb?.heap_used ?? "—"} MB usados de{" "}
                  {info.memory_mb?.heap_total ?? "—"} MB
                </p>
              </GrafanaPanelBg>
              <GrafanaPanelBg className="rounded-xl p-4 ring-1 ring-indigo-500/20">
                <div className="mb-2 flex items-center justify-between">
                  <p className="font-mono text-xs font-bold uppercase tracking-wider text-indigo-900/85 dark:text-indigo-200/90">
                    RAM do sistema
                  </p>
                  <span className="font-mono text-sm tabular-nums text-muted-foreground">
                    {ramPct ?? "—"}%
                  </span>
                </div>
                <ProgressBar value={ramPct} variant={ramPct > 85 ? "danger" : "sky"} />
                <p className="mt-2 text-xs text-muted-foreground">
                  {info.os?.free_mem_mb ?? "—"} MB livres de {info.os?.total_mem_mb ?? "—"} MB
                </p>
              </GrafanaPanelBg>
            </div>
          </SectionCard>

          <div className="flex items-start gap-3 rounded-xl border border-dashed border-cyan-500/25 bg-cyan-500/[0.06] px-4 py-3 text-xs text-muted-foreground dark:border-cyan-500/30 dark:bg-cyan-950/25">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-cyan-600 dark:text-cyan-400" />
            <p>
              Dados atualizados em {formatServerTime(info.time_iso)}. Métricas de espaço
              disponível dependem do suporte do sistema operacional a <code>statfs</code>.
            </p>
          </div>
          </div>
        </GrafanaPanelBg>
      ) : null}
    </div>
  );
}
