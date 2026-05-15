import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { format, parseISO, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Server,
  RefreshCw,
  Activity,
  Cpu,
  HardDrive,
  Database,
  Gauge,
  Clock,
  Package,
  Archive,
  FileStack,
  Download,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { ensureCsrfCookieClient, withCsrfHeaderAsync } from "@/lib/csrf";

/** @param {string | null} header */
function parseFilenameFromContentDisposition(header) {
  if (!header || typeof header !== "string") return null;
  const star = /filename\*=UTF-8''([^;\s]+)/i.exec(header);
  if (star?.[1]) {
    try {
      return decodeURIComponent(star[1].trim());
    } catch {
      return star[1].trim();
    }
  }
  const quoted = /filename="([^"]+)"/i.exec(header);
  if (quoted?.[1]) return quoted[1];
  const plain = /filename=([^;\s]+)/i.exec(header);
  if (plain?.[1]) return plain[1].replace(/^"|"$/g, "");
  return null;
}

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

/** @param {number} totalSeconds */
function formatUptime(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  const parts = [];
  if (days) parts.push(`${days} dia${days !== 1 ? "s" : ""}`);
  if (hours) parts.push(`${hours} h`);
  if (minutes) parts.push(`${minutes} min`);
  if (parts.length === 0) return `${secs} s`;
  if (secs && days === 0) parts.push(`${secs} s`);
  return parts.join(", ");
}

/** @param {number | undefined | null} n */
function formatBytesDetailed(n) {
  if (n == null || !Number.isFinite(Number(n))) return "—";
  const b = Number(n);
  if (b < 1024) return `${b} B`;
  if (b < 1024 ** 2) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 ** 3) return `${(b / 1024 ** 2).toFixed(2)} MB`;
  return `${(b / 1024 ** 3).toFixed(5)} GB`;
}

function InfoRow({ label, value, mono }) {
  return (
    <div className="flex flex-col gap-0.5 py-2.5 border-b border-border/50 last:border-0 sm:flex-row sm:items-baseline sm:gap-4">
      <dt className="text-muted-foreground text-sm shrink-0 sm:w-[min(40%,220px)]">
        {label}
      </dt>
      <dd
        className={`text-sm text-foreground min-w-0 break-all ${
          mono ? "font-mono text-xs" : ""
        }`}
      >
        {value}
      </dd>
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

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-server-health"] });
    queryClient.invalidateQueries({ queryKey: ["admin-server-info"] });
  };

  const restoreInputRef = useRef(null);
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [restoringZip, setRestoringZip] = useState(false);

  const downloadUploadsZip = async () => {
    setDownloadingZip(true);
    try {
      await ensureCsrfCookieClient();
      const r = await fetch("/api/admin/uploads/archive", {
        credentials: "include",
        cache: "no-store",
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
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const cd = r.headers.get("Content-Disposition");
      const suggested = parseFilenameFromContentDisposition(cd);
      a.download = suggested || `icer-uploads-${Date.now()}.zip`;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("ZIP dos uploads descarregado.");
      queryClient.invalidateQueries({ queryKey: ["admin-server-info"] });
    } catch (e) {
      toast.error(e?.message || "Não foi possível descarregar o ZIP.");
    } finally {
      setDownloadingZip(false);
    }
  };

  const onRestoreZipSelected = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".zip")) {
      toast.error("Selecione um ficheiro .zip.");
      return;
    }
    const confirmed = window.confirm(
      "O ZIP será extraído para a pasta de uploads no servidor. Ficheiros com o mesmo caminho nos mesmos subdiretórios serão substituídos. Continuar?",
    );
    if (!confirmed) return;
    setRestoringZip(true);
    try {
      await ensureCsrfCookieClient();
      const form = new FormData();
      form.append("archive", file);
      const headers = await withCsrfHeaderAsync({});
      const r = await fetch("/api/admin/uploads/archive", {
        method: "POST",
        credentials: "include",
        headers,
        body: form,
      });
      const text = await r.text();
      let parsed = null;
      try {
        parsed = text ? JSON.parse(text) : null;
      } catch {
        parsed = null;
      }
      if (!r.ok) {
        const msg = parsed?.message || parsed?.detail || text || r.statusText;
        throw new Error(msg);
      }
      const written = parsed?.written ?? 0;
      const skipped = parsed?.skipped ?? 0;
      toast.success(
        `Restauro concluído: ${written} ficheiro(s) escritos${
          skipped ? ` · ${skipped} entrada(s) ignoradas (rotas inseguras ou inválidas)` : ""
        }.`,
      );
      queryClient.invalidateQueries({ queryKey: ["admin-server-info"] });
      refreshAll();
    } catch (err) {
      toast.error(err?.message || "Falha ao restaurar o ZIP.");
    } finally {
      setRestoringZip(false);
    }
  };

  const okHealth = healthData?.ok === true;
  const serverTimeHealth = formatServerTime(healthData?.time);

  const heapPct =
    info?.memory_mb?.heap_total > 0
      ? Math.round(
          (info.memory_mb.heap_used / info.memory_mb.heap_total) * 1000,
        ) / 10
      : null;

  const ramPct =
    info?.os?.total_mem_mb > 0
      ? Math.round(
          ((info.os.total_mem_mb - info.os.free_mem_mb) /
            info.os.total_mem_mb) *
            1000,
        ) / 10
      : null;

  const loadStr =
    info?.os?.loadavg && Array.isArray(info.os.loadavg)
      ? info.os.loadavg.map((n) => (typeof n === "number" ? n.toFixed(2) : "—")).join(", ")
      : null;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground tracking-tight">
            Servidor
          </h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Métricas da instância Node.js, sistema operativo, memória e ligação ao
            MongoDB. Os dados são obtidos em tempo real neste pedido (sem histórico).
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="shrink-0 gap-2 self-start sm:self-auto"
          onClick={refreshAll}
          disabled={refreshing}
        >
          <RefreshCw
            className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
          />
          Atualizar tudo
        </Button>
      </div>

      {/* Estado público /health */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-2xl p-6"
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
            <Activity className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-lg">
              Estado da API (público)
            </h3>
            <p className="text-sm text-muted-foreground">
              Endpoint <code className="text-xs bg-muted px-1 rounded">GET /api/health</code>{" "}
              — útil para balanceadores e monitorização externa.
            </p>
          </div>
        </div>

        {healthLoading && (
          <div className="space-y-3">
            <Skeleton className="h-12 rounded-xl" />
            <Skeleton className="h-12 rounded-xl" />
          </div>
        )}

        {healthError && (
          <p className="text-sm text-destructive">
            {healthError.message || "Não foi possível contactar /api/health."}
          </p>
        )}

        {!healthLoading && !healthError && (
          <dl className="rounded-xl border border-border bg-muted/30 px-4 py-1">
            <InfoRow
              label="Resposta"
              value={
                <span
                  className={
                    okHealth
                      ? "font-medium text-emerald-600 dark:text-emerald-400"
                      : "font-medium text-destructive"
                  }
                >
                  {okHealth ? "OK" : "Indisponível"}
                </span>
              }
            />
            <InfoRow label="Hora indicada na resposta" value={serverTimeHealth} />
          </dl>
        )}
      </motion.div>

      {/* Informação detalhada (admin) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.03 }}
        className="bg-card border border-border rounded-2xl p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
            <Gauge className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-lg">
              Informação detalhada (instância)
            </h3>
            <p className="text-sm text-muted-foreground">
              Dados recolhidos no processo do servidor e no sistema operativo.
            </p>
          </div>
        </div>

        {infoLoading && (
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-10 rounded-xl" />
            ))}
          </div>
        )}

        {infoError && (
          <p className="text-sm text-destructive">
            {infoError.message || "Sem permissão ou erro ao ler /api/admin/server-info."}
          </p>
        )}

        {!infoLoading && !infoError && info && (
          <div className="space-y-8">
            <section>
              <div className="flex items-center gap-2 mb-3 text-foreground font-medium text-sm">
                <Package className="w-4 h-4 text-accent" />
                Aplicação e ambiente
              </div>
              <dl className="rounded-xl border border-border bg-muted/20 px-4 py-1">
                <InfoRow label="Nome (package.json)" value={info.app?.name ?? "—"} />
                <InfoRow label="Versão (package.json)" value={info.app?.version ?? "—"} mono />
                <InfoRow
                  label="NODE_ENV"
                  value={info.environment ?? "—"}
                  mono
                />
                <InfoRow
                  label="Hora no servidor (ISO)"
                  value={formatServerTime(info.time_iso)}
                  mono
                />
              </dl>
            </section>

            <section>
              <div className="flex items-center gap-2 mb-3 text-foreground font-medium text-sm">
                <Cpu className="w-4 h-4 text-accent" />
                Node.js e processo
              </div>
              <dl className="rounded-xl border border-border bg-muted/20 px-4 py-1">
                <InfoRow label="Versão Node.js" value={info.node?.version ?? "—"} mono />
                <InfoRow
                  label="Tempo ativo do processo"
                  value={formatUptime(info.process?.uptime_seconds ?? 0)}
                />
                <InfoRow label="PID" value={String(info.process?.pid ?? "—")} mono />
                <InfoRow
                  label="Plataforma / arquitetura"
                  value={
                    info.process?.platform && info.process?.arch
                      ? `${info.process.platform} (${info.process.arch})`
                      : "—"
                  }
                  mono
                />
                <InfoRow label="Diretório de trabalho" value={info.process?.cwd ?? "—"} mono />
              </dl>
            </section>

            <section>
              <div className="flex items-center gap-2 mb-3 text-foreground font-medium text-sm">
                <Server className="w-4 h-4 text-accent" />
                Memória do processo (heap V8)
              </div>
              <dl className="rounded-xl border border-border bg-muted/20 px-4 py-1">
                <InfoRow
                  label="RSS (residente)"
                  value={`${info.memory_mb?.rss ?? "—"} MB`}
                  mono
                />
                <InfoRow
                  label="Heap total / usado"
                  value={
                    heapPct != null
                      ? `${info.memory_mb?.heap_used ?? "—"} / ${info.memory_mb?.heap_total ?? "—"} MB (${heapPct}% usado)`
                      : `${info.memory_mb?.heap_used ?? "—"} / ${info.memory_mb?.heap_total ?? "—"} MB`
                  }
                  mono
                />
                <InfoRow
                  label="External"
                  value={`${info.memory_mb?.external ?? "—"} MB`}
                  mono
                />
                <InfoRow
                  label="ArrayBuffers"
                  value={`${info.memory_mb?.array_buffers ?? "—"} MB`}
                  mono
                />
              </dl>
            </section>

            <section>
              <div className="flex items-center gap-2 mb-3 text-foreground font-medium text-sm">
                <HardDrive className="w-4 h-4 text-accent" />
                Sistema operativo e hardware
              </div>
              <dl className="rounded-xl border border-border bg-muted/20 px-4 py-1">
                <InfoRow label="Hostname" value={info.os?.hostname ?? "—"} mono />
                <InfoRow
                  label="SO"
                  value={
                    info.os?.type && info.os?.release
                      ? `${info.os.type} ${info.os.release}`
                      : info.os?.type ?? "—"
                  }
                />
                <InfoRow label="CPUs (núcleos lógicos)" value={String(info.os?.cpu_count ?? "—")} />
                <InfoRow
                  label="RAM total / livre"
                  value={
                    ramPct != null
                      ? `${info.os?.total_mem_mb ?? "—"} MB total · ${info.os?.free_mem_mb ?? "—"} MB livres (~${ramPct}% em uso)`
                      : `${info.os?.total_mem_mb ?? "—"} MB total · ${info.os?.free_mem_mb ?? "—"} MB livres`
                  }
                  mono
                />
                <InfoRow
                  label="Carga média (1 / 5 / 15 min)"
                  value={
                    loadStr != null
                      ? `${loadStr} — apenas em Unix/Linux/macOS`
                      : "— (indisponível no Windows)"
                  }
                  mono
                />
              </dl>
            </section>

            <section>
              <div className="flex items-center gap-2 mb-3 text-foreground font-medium text-sm">
                <Database className="w-4 h-4 text-accent" />
                MongoDB
              </div>
              <dl className="rounded-xl border border-border bg-muted/20 px-4 py-1">
                <InfoRow
                  label="Ping"
                  value={
                    info.mongodb?.ok ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                        Ligado
                      </span>
                    ) : (
                      <span className="text-destructive font-medium">Falhou</span>
                    )
                  }
                />
                <InfoRow
                  label="Latência (command ping)"
                  value={
                    info.mongodb?.ping_ms != null
                      ? `${info.mongodb.ping_ms} ms`
                      : "—"
                  }
                  mono
                />
                {info.mongodb?.error ? (
                  <InfoRow label="Erro" value={info.mongodb.error} mono />
                ) : null}
              </dl>
            </section>

            <section>
              <div className="flex items-center gap-2 mb-3 text-foreground font-medium text-sm">
                <FileStack className="w-4 h-4 text-accent" />
                Uploads e logs no disco
              </div>
              <dl className="rounded-xl border border-border bg-muted/20 px-4 py-1">
                <InfoRow
                  label="Total (uploads + pastas de log)"
                  value={
                    info.storage != null ? (
                      <span>
                        <strong className="text-foreground tabular-nums">
                          {typeof info.storage.total_gb === "number"
                            ? `${info.storage.total_gb} GB`
                            : "—"}
                        </strong>
                        <span className="text-muted-foreground">
                          {" "}
                          ({formatBytesDetailed(info.storage.total_bytes)})
                        </span>
                      </span>
                    ) : (
                      "—"
                    )
                  }
                />
                <InfoRow
                  label="Pasta de uploads"
                  value={info.storage?.uploads?.path ?? "—"}
                  mono
                />
                <InfoRow
                  label="Tamanho uploads"
                  value={
                    info.storage?.uploads != null
                      ? `${info.storage.uploads.size_gb} GB · ${info.storage.uploads.files} ficheiro(s) (${formatBytesDetailed(info.storage.uploads.bytes)})`
                      : "—"
                  }
                  mono
                />
                <InfoRow
                  label="Pasta de ficheiros de log"
                  value={info.storage?.logs?.path ?? "—"}
                  mono
                />
                <InfoRow
                  label="Tamanho logs (ficheiros)"
                  value={
                    info.storage?.logs != null
                      ? `${info.storage.logs.size_gb} GB · ${info.storage.logs.files} ficheiro(s) (${formatBytesDetailed(info.storage.logs.bytes)})`
                      : "—"
                  }
                  mono
                />
              </dl>
              <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
                Os registos de auditoria na base MongoDB não entram neste total — apenas
                ficheiros na pasta de uploads e na pasta de log em disco (predefinição:{" "}
                <code className="text-[11px] bg-muted px-1 rounded">logs/</code> na raiz do
                projeto; pode definir{" "}
                <code className="text-[11px] bg-muted px-1 rounded">ICER_LOG_DIR</code>).
              </p>
            </section>
          </div>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.055 }}
        className="bg-card border border-border rounded-2xl p-6"
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
            <Download className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-lg">
              Cópia ZIP dos uploads (descarregar / restaurar)
            </h3>
            <p className="text-sm text-muted-foreground">
              O ZIP contém os mesmos ficheiros da pasta de uploads no disco (imagens e
              outros media guardados como ficheiros). Ao restaurar, os dados são
              extraídos por cima dos existentes — não altera sozinho os registos na base
              MongoDB (URLs dos posts continuam a apontar para os mesmos caminhos relativos
              se coincidirem).
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center">
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            onClick={downloadUploadsZip}
            disabled={downloadingZip}
          >
            {downloadingZip ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Descarregar uploads (.zip)
          </Button>

          <input
            ref={restoreInputRef}
            type="file"
            accept=".zip,application/zip"
            className="hidden"
            onChange={onRestoreZipSelected}
          />
          <Button
            type="button"
            variant="secondary"
            className="gap-2"
            disabled={restoringZip}
            onClick={() => restoreInputRef.current?.click()}
          >
            {restoringZip ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            Restaurar a partir do ZIP…
          </Button>
        </div>

        <p className="text-xs text-muted-foreground mt-4 leading-relaxed">
          Envio do ZIP de restauro limitado por defeito a 512&nbsp;MB (variável{" "}
          <code className="text-[11px] bg-muted px-1 rounded">ICER_UPLOAD_RESTORE_MAX_MB</code>
          ). Entradas com caminhos suspeitos (<code className="text-[11px]">..</code>) são
          ignoradas.
        </p>
      </motion.div>

      {/* Backups */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06 }}
        className="bg-card border border-border rounded-2xl p-6"
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
            <Archive className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-lg">Backups</h3>
            <p className="text-sm text-muted-foreground">
              A aplicação não executa cópias de segurança automáticas por defeito — isso
              deve estar configurado na infraestrutura (servidor, Docker, cloud ou
              hosting).
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-muted/20 px-4 py-4 space-y-4 text-sm text-muted-foreground">
          <p className="text-foreground font-medium text-base">
            Checklist recomendado
          </p>
          <ul className="list-disc pl-5 space-y-2 leading-relaxed">
            <li>
              <strong className="text-foreground font-medium">Base de dados:</strong>{" "}
              cópias regulares do MongoDB (por exemplo{" "}
              <code className="text-xs bg-muted px-1 rounded">mongodump</code> ou
              snapshots geridos pelo serviço — Atlas, VPS, etc.).
            </li>
            <li>
              <strong className="text-foreground font-medium">Ficheiros enviados:</strong>{" "}
              pasta de uploads / armazenamento de ficheiros da app (imagens, PDFs),
              alinhada ao mesmo calendário da base.
            </li>
            <li>
              <strong className="text-foreground font-medium">Configuração e segredos:</strong>{" "}
              cópia das variáveis de ambiente e ficheiros de deploy usados em produção
              (sem expor passwords em repositórios públicos).
            </li>
            <li>
              <strong className="text-foreground font-medium">Restauro:</strong>{" "}
              testar periodicamente a recuperação num ambiente isolado (tempo de
              inatividade, integridade dos dados).
            </li>
          </ul>
          <p className="pt-2 border-t border-border/60 text-xs leading-relaxed">
            Em ambientes Docker/EasyPanel, combine cópias da volume da base, dos
            volumes de ficheiros e da imagem ou compose utilizados no deploy.
          </p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="flex items-start gap-3 rounded-xl border border-dashed border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground"
      >
        <Clock className="w-4 h-4 shrink-0 mt-0.5 text-accent" />
        <p>
          Os valores de CPU por núcleo e I/O de disco não são expostos aqui para evitar
          dependências nativas; use as ferramentas do sistema ou do painel do seu
          fornecedor para métricas mais profundas.
        </p>
      </motion.div>
    </div>
  );
}
