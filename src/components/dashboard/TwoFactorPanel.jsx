import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, ShieldCheck, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { fetchJson } from "@/lib/serverAuth";
import { useAuth } from "@/lib/AuthContext";

export default function TwoFactorPanel() {
  const { user } = useAuth();
  const enabled = user?.totp_enabled === true;
  const [busy, setBusy] = useState(false);
  const [qr, setQr] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState([]);
  const [disableCode, setDisableCode] = useState("");

  useEffect(() => {
    setQr("");
    setSecret("");
    setCode("");
    setRecoveryCodes([]);
    setDisableCode("");
  }, [enabled]);

  const startSetup = async () => {
    setBusy(true);
    try {
      const r = await fetchJson("/auth/2fa/setup", { method: "POST", body: {} });
      setQr(String(r.qr_data_url || ""));
      setSecret(String(r.secret || ""));
      toast.success("2FA iniciado. Escaneie o QR no autenticador.");
    } catch (e) {
      toast.error(e?.message || "Não foi possível iniciar o 2FA.");
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    if (!code.trim()) return;
    setBusy(true);
    try {
      const r = await fetchJson("/auth/2fa/verify", { method: "POST", body: { code: code.trim() } });
      setRecoveryCodes(Array.isArray(r.recovery_codes) ? r.recovery_codes : []);
      toast.success("2FA ativado.");
      // força refresh da sessão
      await fetchJson("/auth/me", { method: "GET" }).catch(() => {});
      window.dispatchEvent(new CustomEvent("icer-user-session"));
    } catch (e) {
      toast.error(e?.message || "Código inválido.");
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    if (!disableCode.trim()) return;
    setBusy(true);
    try {
      await fetchJson("/auth/2fa/disable", {
        method: "POST",
        body: { code: disableCode.trim() },
      });
      toast.success("2FA desativado.");
      await fetchJson("/auth/me", { method: "GET" }).catch(() => {});
      window.dispatchEvent(new CustomEvent("icer-user-session"));
    } catch (e) {
      toast.error(e?.message || "Não foi possível desativar.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-2xl p-6 space-y-5 max-w-2xl"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
          {enabled ? (
            <ShieldCheck className="w-5 h-5 text-accent" />
          ) : (
            <ShieldOff className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
        <div>
          <h2 className="font-semibold text-foreground text-lg">2FA (Autenticador)</h2>
          <p className="text-sm text-muted-foreground">
            Use um app autenticador (Google Authenticator, Microsoft Authenticator, Authy).
          </p>
        </div>
      </div>

      {!enabled ? (
        <>
          <Button type="button" onClick={startSetup} disabled={busy} className="gap-2">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Ativar 2FA
          </Button>
          {qr ? (
            <div className="space-y-3">
              <img src={qr} alt="QR Code 2FA" className="w-48 h-48 rounded-xl border border-border bg-background" />
              <p className="text-xs text-muted-foreground">
                Se preferir, use o segredo manual:{" "}
                <code className="px-1 rounded bg-muted text-foreground">{secret}</code>
              </p>
              <div className="space-y-2">
                <Label>Código do autenticador</Label>
                <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" inputMode="numeric" />
              </div>
              <Button type="button" onClick={verify} disabled={busy || !code.trim()}>
                Confirmar
              </Button>
              {recoveryCodes.length ? (
                <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
                  <p className="text-sm font-semibold text-foreground">Códigos de recuperação</p>
                  <p className="text-xs text-muted-foreground">
                    Guarde estes códigos num local seguro. Cada código funciona 1 vez.
                  </p>
                  <ul className="grid grid-cols-2 gap-2 text-xs">
                    {recoveryCodes.map((c) => (
                      <li key={c} className="font-mono rounded bg-background border border-border px-2 py-1">
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
        </>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            2FA está <span className="text-foreground font-semibold">ativo</span> nesta conta.
          </p>
          <div className="space-y-2">
            <Label>Desativar 2FA (requer código)</Label>
            <Input value={disableCode} onChange={(e) => setDisableCode(e.target.value)} placeholder="123456" inputMode="numeric" />
          </div>
          <Button type="button" variant="outline" onClick={disable} disabled={busy || !disableCode.trim()}>
            Desativar 2FA
          </Button>
        </div>
      )}
    </motion.div>
  );
}

