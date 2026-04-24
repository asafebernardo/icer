import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { HardDrive, Loader2, Download, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

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
    </div>
  );
}
