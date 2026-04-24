import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { HardDrive, Loader2, Download, AlertTriangle, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { withCsrfHeaderAsync } from "@/lib/csrf";

const WEEKDAYS_PT = [
  { v: 0, label: "Domingo" },
  { v: 1, label: "Segunda-feira" },
  { v: 2, label: "Terça-feira" },
  { v: 3, label: "Quarta-feira" },
  { v: 4, label: "Quinta-feira" },
  { v: 5, label: "Sexta-feira" },
  { v: 6, label: "Sábado" },
];

function formatBytes(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v < 0) return "—";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let x = v;
  while (x >= 1024 && i < units.length - 1) {
    x /= 1024;
    i += 1;
  }
  const digits = i === 0 ? 0 : x >= 100 ? 0 : x >= 10 ? 1 : 2;
  return `${x.toFixed(digits)} ${units[i]}`;
}

export default function BackupBetaPanel() {
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [error, setError] = useState(null);
  const [schedLoading, setSchedLoading] = useState(true);
  const [schedSaving, setSchedSaving] = useState(false);
  const [schedEnabled, setSchedEnabled] = useState(false);
  const [schedWeekday, setSchedWeekday] = useState(1);
  const [schedTime, setSchedTime] = useState("03:00");
  const [schedLastRun, setSchedLastRun] = useState(null);
  const [schedLastMsg, setSchedLastMsg] = useState(null);

  const loadInfo = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/admin/backup/info", { credentials: "include" });
      const t = await r.text();
      let data = {};
      try {
        data = t ? JSON.parse(t) : {};
      } catch {
        data = {};
      }
      if (!r.ok) {
        throw new Error(data.message || r.statusText);
      }
      setInfo(data);
    } catch (e) {
      setError(e?.message || "Não foi possível carregar o resumo do backup.");
      setInfo(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadInfo();
  }, [loadInfo]);

  const loadSchedule = useCallback(async () => {
    setSchedLoading(true);
    try {
      const r = await fetch("/api/admin/backup/schedule", { credentials: "include" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.message || r.statusText);
      setSchedEnabled(j.enabled === true);
      const wd = Number(j.weekday);
      setSchedWeekday(Number.isFinite(wd) && wd >= 0 && wd <= 6 ? wd : 1);
      const h = Number(j.hour);
      const m = Number(j.minute);
      const hh = Number.isFinite(h) ? Math.min(23, Math.max(0, h)) : 3;
      const mm = Number.isFinite(m) ? Math.min(59, Math.max(0, m)) : 0;
      setSchedTime(`${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`);
      setSchedLastRun(typeof j.last_run_at === "string" ? j.last_run_at : null);
      setSchedLastMsg(typeof j.last_run_message === "string" ? j.last_run_message : null);
    } catch {
      /* ignore */
    } finally {
      setSchedLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSchedule();
  }, [loadSchedule]);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/admin/integrations/google/status", { credentials: "include" });
        const st = await r.json().catch(() => ({}));
        if (r.ok) setGoogleConnected(st?.connected === true);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const r = await fetch("/api/admin/backup/export", { credentials: "include" });
      if (!r.ok) {
        const t = await r.text();
        let msg = r.statusText;
        try {
          const j = t ? JSON.parse(t) : {};
          if (j.message) msg = j.message;
        } catch {
          /* ignore */
        }
        throw new Error(msg);
      }
      const cd = r.headers.get("Content-Disposition") || "";
      const m = cd.match(/filename="([^"]+)"/i) || cd.match(/filename=([^;\s]+)/i);
      const filename = m ? m[1].replaceAll('"', "") : "icer-site-backup.zip";
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Backup transferido. Guarde o ZIP num local seguro.");
    } catch (e) {
      toast.error(e?.message || "Falha ao gerar o backup.");
    } finally {
      setDownloading(false);
    }
  };

  const saveSchedule = async () => {
    setSchedSaving(true);
    try {
      const parts = schedTime.split(":");
      const hour = Math.min(23, Math.max(0, Number.parseInt(parts[0], 10) || 0));
      const minute = Math.min(59, Math.max(0, Number.parseInt(parts[1], 10) || 0));
      const headers = await withCsrfHeaderAsync({
        "Content-Type": "application/json",
      });
      const r = await fetch("/api/admin/backup/schedule", {
        method: "PUT",
        credentials: "include",
        headers,
        body: JSON.stringify({
          enabled: schedEnabled,
          weekday: schedWeekday,
          hour,
          minute,
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.message || r.statusText);
      setSchedLastRun(typeof j.last_run_at === "string" ? j.last_run_at : null);
      setSchedLastMsg(typeof j.last_run_message === "string" ? j.last_run_message : null);
      toast.success("Agendamento guardado.");
    } catch (e) {
      toast.error(e?.message || "Não foi possível guardar o agendamento.");
    } finally {
      setSchedSaving(false);
    }
  };

  const handleUploadGoogle = async () => {
    setUploading(true);
    try {
      const r = await fetch("/api/admin/backup/upload-google", {
        method: "POST",
        credentials: "include",
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.message || r.statusText);
      toast.success("Backup enviado para Google Drive.");
    } catch (e) {
      toast.error(e?.message || "Falha ao enviar para Google Drive.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-2xl p-6"
      >
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <HardDrive className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground text-lg">Backup do site</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Gera um ficheiro ZIP com os dados MongoDB do ICER (coleções de conteúdo,
              utilizadores, configurações, auditoria, etc.) e os ficheiros carregados
              que existirem no disco. As sessões ativas não entram no ficheiro.
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-400/90 mt-2 flex items-start gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>
                Funcionalidade em <span className="font-medium text-foreground">beta</span>: pode
                demorar em bases grandes. O ZIP pode conter hashes de palavras-passe —
                trate-o como confidencial. Envio automático para Google Drive será
                configurável na aba Google.
              </span>
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <Loader2 className="w-4 h-4 animate-spin" />
            A carregar resumo…
          </div>
        ) : error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : info ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm">
              <p className="font-medium text-foreground mb-2">Resumo</p>
              <ul className="text-muted-foreground space-y-1 text-xs sm:text-sm">
                <li>
                  Ficheiros na base: <span className="text-foreground">{info.files_total}</span>{" "}
                  · no disco:{" "}
                  <span className="text-foreground">{info.files_on_disk}</span>
                  {info.files_missing > 0 ? (
                    <>
                      {" "}
                      · <span className="text-destructive">em falta: {info.files_missing}</span>
                    </>
                  ) : null}
                </li>
                <li className="break-all">
                  Pasta de uploads (servidor):{" "}
                  <code className="text-[11px] bg-muted px-1 rounded">{info.upload_dir}</code>
                </li>
                {info.disk_total_bytes != null ? (
                  <li>
                    Armazenamento do servidor (volume dos uploads):{" "}
                    <span className="text-foreground">
                      {formatBytes(info.disk_free_bytes)} livre
                    </span>{" "}
                    de{" "}
                    <span className="text-foreground">{formatBytes(info.disk_total_bytes)}</span>
                  </li>
                ) : null}
              </ul>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={handleDownload}
                disabled={downloading}
                className="gap-2"
              >
                {downloading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                Descarregar ZIP
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleUploadGoogle}
                disabled={!googleConnected || uploading}
                className="gap-2"
                title={googleConnected ? "Envia o backup para a pasta configurada no Drive" : "Conecte a conta Google na aba Google"}
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <HardDrive className="w-4 h-4" />}
                Enviar para Drive
              </Button>
              <Button type="button" variant="outline" onClick={() => void loadInfo()} disabled={loading}>
                Atualizar resumo
              </Button>
            </div>
          </div>
        ) : null}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-card border border-border rounded-2xl p-6"
      >
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <CalendarClock className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground text-lg">Rotina agendada (servidor)</h2>
            <p className="text-sm text-muted-foreground mt-1">
              O horário usa o fuso horário do servidor. Uma vez por semana, no dia e minuto
              escolhidos, é gerado um ZIP (equivalente a «Descarregar ZIP»). Se na aba Google
              estiver ativo «Enviar backups automaticamente» com conta e pasta configuradas,
              o ficheiro também é enviado ao Drive.
            </p>
          </div>
        </div>

        {schedLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            A carregar agendamento…
          </div>
        ) : (
          <div className="space-y-4 max-w-xl">
            <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-muted/20 px-4 py-3">
              <div>
                <Label htmlFor="backup-sched-enabled" className="text-foreground font-medium">
                  Agendamento ativo
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">Corre no minuto definido.</p>
              </div>
              <Switch
                id="backup-sched-enabled"
                checked={schedEnabled}
                onCheckedChange={setSchedEnabled}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Dia da semana</Label>
                <Select
                  value={String(schedWeekday)}
                  onValueChange={(v) => setSchedWeekday(Number(v))}
                  disabled={!schedEnabled}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WEEKDAYS_PT.map((d) => (
                      <SelectItem key={d.v} value={String(d.v)}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="backup-sched-time">Hora (local do servidor)</Label>
                <input
                  id="backup-sched-time"
                  type="time"
                  value={schedTime}
                  onChange={(e) => setSchedTime(e.target.value)}
                  disabled={!schedEnabled}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </div>
            {schedLastRun ? (
              <p className="text-xs text-muted-foreground">
                Última execução:{" "}
                <span className="text-foreground font-mono">{schedLastRun.replace("T", " ")}</span>
                {schedLastMsg ? (
                  <>
                    {" "}
                    — <span className="text-foreground">{schedLastMsg}</span>
                  </>
                ) : null}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">Ainda não houve execução agendada.</p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={() => void saveSchedule()} disabled={schedSaving}>
                {schedSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Guardar agendamento
              </Button>
              <Button type="button" variant="outline" onClick={() => void loadSchedule()} disabled={schedLoading}>
                Recarregar
              </Button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
