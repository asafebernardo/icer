import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Loader2, ShieldCheck, ShieldOff, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { fetchJson } from "@/lib/serverAuth";
import { useAuth } from "@/lib/AuthContext";
import { getUser } from "@/lib/auth";
import { persistSessionUser } from "@/lib/sessionIntegrity";

const ACTIVATE_COOLDOWN_MS = 15_000;

export default function TwoFactorPanel() {
  const { user } = useAuth();
  const enabled = user?.totp_enabled === true;
  const [busy, setBusy] = useState(false);
  const [qr, setQr] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState([]);
  const [disableCode, setDisableCode] = useState("");
  const [disableRecoveryCode, setDisableRecoveryCode] = useState("");
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [postActivate, setPostActivate] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (Date.now() >= cooldownUntil) return;
    const id = setInterval(() => setTick((t) => t + 1), 500);
    return () => clearInterval(id);
  }, [cooldownUntil, tick]);

  const cooldownLeftSec = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));

  useEffect(() => {
    if (enabled) {
      setQr("");
      setSecret("");
      setCode("");
      setDisableCode("");
      setDisableRecoveryCode("");
      return;
    }
    setQr("");
    setSecret("");
    setCode("");
    setRecoveryCodes([]);
    setDisableCode("");
    setDisableRecoveryCode("");
    setPostActivate(false);
  }, [enabled]);

  const bumpCooldown = useCallback(() => {
    setCooldownUntil(Date.now() + ACTIVATE_COOLDOWN_MS);
  }, []);

  const cancelLocalSetup = () => {
    setQr("");
    setSecret("");
    setCode("");
  };

  const startSetup = async () => {
    if (Date.now() < cooldownUntil) {
      toast.info(`Aguarde ${cooldownLeftSec}s para voltar a ativar.`);
      return;
    }
    if (qr) {
      toast.info("Já existe uma configuração em curso. Confirme o código ou cancele.");
      return;
    }
    setBusy(true);
    try {
      const r = await fetchJson("/auth/2fa/setup", { method: "POST", body: {} });
      setQr(String(r.qr_data_url || ""));
      setSecret(String(r.secret || ""));
      toast.success("2FA iniciado. Escaneie o QR no autenticador.");
      bumpCooldown();
    } catch (e) {
      toast.error(e?.message || "Não foi possível iniciar o 2FA.");
      bumpCooldown();
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    if (!code.trim()) return;
    setBusy(true);
    try {
      const r = await fetchJson("/auth/2fa/verify", { method: "POST", body: { code: code.trim() } });
      const codes = Array.isArray(r.recovery_codes) ? r.recovery_codes : [];
      setRecoveryCodes(codes);
      setPostActivate(true);
      toast.success("2FA ativado.");
      try {
        const u = await fetchJson("/auth/me", { method: "GET" });
        const cur = getUser();
        if (u && typeof u === "object" && cur?._authSource === "server") {
          persistSessionUser({
            ...cur,
            id: u.id,
            email: u.email,
            full_name: u.full_name,
            role: u.role,
            funcao: u.funcao ?? "",
            avatar_url: u.avatar_url ? String(u.avatar_url) : "",
            totp_enabled: u.totp_enabled === true,
            totp_grace_started_at: u.totp_grace_started_at || null,
            _authSource: "server",
          });
        }
      } catch {
        /* ignore */
      }
      window.dispatchEvent(new CustomEvent("icer-user-session"));
    } catch (e) {
      toast.error(e?.message || "Código inválido.");
    } finally {
      setBusy(false);
    }
  };

  const finishPostActivate = () => {
    setPostActivate(false);
    setRecoveryCodes([]);
    setQr("");
    setSecret("");
    setCode("");
  };

  const disable = async () => {
    if (!disableCode.trim() && !disableRecoveryCode.trim()) return;
    setBusy(true);
    try {
      await fetchJson("/auth/2fa/disable", {
        method: "POST",
        body: {
          code: disableCode.trim() || undefined,
          recovery_code: disableRecoveryCode.trim() || undefined,
        },
      });
      toast.success("2FA desativado.");
      setPostActivate(false);
      setRecoveryCodes([]);
      try {
        const u = await fetchJson("/auth/me", { method: "GET" });
        const cur = getUser();
        if (u && typeof u === "object" && cur?._authSource === "server") {
          persistSessionUser({
            ...cur,
            id: u.id,
            email: u.email,
            full_name: u.full_name,
            role: u.role,
            funcao: u.funcao ?? "",
            avatar_url: u.avatar_url ? String(u.avatar_url) : "",
            totp_enabled: u.totp_enabled === true,
            totp_grace_started_at: u.totp_grace_started_at || null,
            _authSource: "server",
          });
        }
      } catch {
        /* ignore */
      }
      window.dispatchEvent(new CustomEvent("icer-user-session"));
    } catch (e) {
      toast.error(e?.message || "Não foi possível desativar.");
    } finally {
      setBusy(false);
    }
  };

  if (postActivate && recoveryCodes.length > 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-2xl p-6 space-y-5 max-w-2xl border-emerald-500/40 shadow-[0_0_0_1px_hsl(var(--primary)/0.12)]"
      >
        <div className="flex items-start gap-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 p-4">
          <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <div>
            <h2 className="font-semibold text-foreground text-lg">2FA ativo</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Guarde os códigos de recuperação antes de continuar. Não será possível iniciar
              uma nova configuração até confirmar.
            </p>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
          <p className="text-sm font-semibold text-foreground">Códigos de recuperação</p>
          <p className="text-xs text-muted-foreground">
            Cada código funciona uma vez. Armazene-os fora deste dispositivo.
          </p>
          <ul className="grid grid-cols-2 gap-2 text-xs">
            {recoveryCodes.map((c) => (
              <li key={c} className="font-mono rounded bg-background border border-border px-2 py-1">
                {c}
              </li>
            ))}
          </ul>
        </div>
        <Button type="button" onClick={finishPostActivate} className="gap-2">
          Guardei os códigos — continuar
        </Button>
      </motion.div>
    );
  }

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
          {qr ? (
            <div
              className="rounded-xl border border-primary/25 bg-primary/5 px-4 py-3 flex items-start gap-2 text-sm text-foreground"
              role="status"
            >
              <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <span>
                <span className="font-medium">Configuração em curso:</span> escaneie o QR e introduza
                o código de 6 dígitos. Não inicie outra configuração em paralelo.
              </span>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              onClick={startSetup}
              disabled={busy || !!qr || Date.now() < cooldownUntil}
              className="gap-2"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Ativar 2FA
            </Button>
            {cooldownLeftSec > 0 && !qr ? (
              <span className="text-xs text-muted-foreground">
                Próximo clique em {cooldownLeftSec}s
              </span>
            ) : null}
            {qr ? (
              <Button type="button" variant="outline" size="sm" onClick={cancelLocalSetup} disabled={busy}>
                Cancelar configuração
              </Button>
            ) : null}
          </div>

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
                {busy ? <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> : null}
                Confirmar e ativar
              </Button>
            </div>
          ) : null}
        </>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            2FA está <span className="text-foreground font-semibold">ativo</span> nesta conta.
          </p>
          <div className="space-y-2">
            <Label>Desativar 2FA</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              <Input
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value)}
                placeholder="Código do autenticador (123456)"
                inputMode="numeric"
              />
              <Input
                value={disableRecoveryCode}
                onChange={(e) => setDisableRecoveryCode(e.target.value)}
                placeholder="Ou código de recuperação"
                autoCapitalize="characters"
                autoCorrect="off"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Pode usar o código de 6 dígitos do app autenticador ou um código de recuperação.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={disable}
            disabled={busy || (!disableCode.trim() && !disableRecoveryCode.trim())}
          >
            Desativar 2FA
          </Button>
        </div>
      )}
    </motion.div>
  );
}
