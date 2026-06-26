import { useCallback, useEffect, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import RouteSkeleton from "@/components/shared/RouteSkeleton";
import {
  RECAPTCHA_ACTIONS,
  executeRecaptcha,
  getRecaptchaConfig,
  isRecaptchaEnabled,
  loadRecaptchaV3,
  recaptchaErrorMessagePt,
  refreshRecaptchaConfig,
} from "@/lib/recaptcha";
import { fetchWithTimeout } from "@/lib/fetchWithTimeout";

/**
 * Bloqueia o site público até passar reCAPTCHA v3 (cookie httpOnly no servidor).
 * @param {{ children: import("react").ReactNode }} props
 */
export default function SiteRecaptchaGate({ children }) {
  const [phase, setPhase] = useState("loading");
  const [error, setError] = useState("");

  const runChallenge = useCallback(async () => {
    setError("");
    setPhase("checking");
    try {
      await refreshRecaptchaConfig();
      const cfg = getRecaptchaConfig();
      if (!cfg.enforced) {
        setPhase("passed");
        return;
      }

      const statusRes = await fetchWithTimeout("/api/recaptcha/site-access", {
        credentials: "include",
        cache: "no-store",
      });
      const status = await statusRes.json().catch(() => ({}));
      if (status?.passed) {
        setPhase("passed");
        return;
      }

      if (!isRecaptchaEnabled()) {
        setError("reCAPTCHA não está configurado no servidor.");
        setPhase("failed");
        return;
      }

      await loadRecaptchaV3(cfg.site_key);
      const token = await executeRecaptcha(RECAPTCHA_ACTIONS.SITE_ACCESS);
      if (!token) {
        setError("Não foi possível iniciar a verificação de segurança.");
        setPhase("failed");
        return;
      }

      const verifyRes = await fetchWithTimeout("/api/recaptcha/site-access", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recaptcha_token: token }),
      });
      const verifyBody = await verifyRes.json().catch(() => ({}));
      if (!verifyRes.ok) {
        setError(
          recaptchaErrorMessagePt(verifyBody?.message) ||
            "Verificação de segurança falhou.",
        );
        setPhase("failed");
        return;
      }
      setPhase("passed");
    } catch {
      setError("Não foi possível verificar o acesso ao site.");
      setPhase("failed");
    }
  }, []);

  useEffect(() => {
    void runChallenge();
  }, [runChallenge]);

  if (phase === "loading" || phase === "checking") {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-4 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden />
        <p className="text-sm text-muted-foreground">A verificar acesso ao site…</p>
      </div>
    );
  }

  if (phase === "failed") {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 text-center">
        <ShieldCheck className="h-10 w-10 text-muted-foreground" aria-hidden />
        <div className="space-y-2">
          <p className="font-medium text-foreground">Verificação de segurança</p>
          <p className="max-w-sm text-sm text-muted-foreground">{error}</p>
        </div>
        <Button type="button" onClick={() => void runChallenge()}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  if (phase !== "passed") {
    return <RouteSkeleton />;
  }

  return children;
}
