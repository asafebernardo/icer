import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

import GoogleSignInButton from "@/components/auth/GoogleSignInButton";
import SiteLogoMark from "@/components/layout/SiteLogoMark";
import { useAuth } from "@/lib/AuthContext";
import { isServerAuthEnabled } from "@/lib/auth";
import { LAST_VISITED_PATH_KEY } from "@/lib/lastPath";
import {
  captureLoginIntentFromBrowserUrl,
  clearLoginIntent,
  setLoginIntent,
} from "@/lib/loginIntent";
import {
  isRecaptchaEnabled,
  loadRecaptchaV3,
  refreshRecaptchaConfig,
} from "@/lib/recaptcha";

function safeReturnPath() {
  const raw = sessionStorage.getItem(LAST_VISITED_PATH_KEY) || "/Home";
  if (!raw.startsWith("/") || raw.startsWith("/login")) return "/Home";
  return raw;
}

export default function Login() {
  const navigate = useNavigate();
  const {
    isAuthenticated,
    isLoadingAuth,
    googleLoginAvailable,
    reconcileLocalSession,
  } = useAuth();
  const serverAuth = isServerAuthEnabled();
  const [reconcilingSession, setReconcilingSession] = useState(false);

  useEffect(() => {
    captureLoginIntentFromBrowserUrl();
    setLoginIntent();
    void refreshRecaptchaConfig().then((cfg) => {
      if (cfg.enabled && cfg.site_key) {
        void loadRecaptchaV3(cfg.site_key);
      }
    });
  }, []);

  useEffect(() => {
    if (!serverAuth || !isAuthenticated) {
      setReconcilingSession(false);
      return undefined;
    }
    let cancelled = false;
    setReconcilingSession(true);
    void reconcileLocalSession().finally(() => {
      if (!cancelled) setReconcilingSession(false);
    });
    return () => {
      cancelled = true;
    };
  }, [serverAuth, isAuthenticated, reconcileLocalSession]);

  useEffect(() => {
    if (!isAuthenticated || reconcilingSession) return;
    clearLoginIntent();
    navigate(safeReturnPath(), { replace: true });
  }, [isAuthenticated, reconcilingSession, navigate]);

  if (isLoadingAuth || reconcilingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-transparent">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden />
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-transparent">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-transparent">
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Link to="/Home" className="inline-flex flex-col items-center gap-2">
            <SiteLogoMark
              imgClassName="h-12 w-auto max-w-[200px] object-contain"
            />
            <span className="font-display text-lg font-semibold text-foreground">
              ICER Chapecó
            </span>
          </Link>
          <p className="max-w-sm text-sm text-muted-foreground">
            Entrada com a conta Google autorizada da ICER.
          </p>
        </div>

        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-premium sm:p-8">
          {!serverAuth ? (
            <p className="text-sm text-muted-foreground">
              A autenticação no servidor está desativada neste ambiente. Ative{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">
                VITE_USE_SERVER_AUTH=true
              </code>{" "}
              no ficheiro de ambiente e reinicie o Vite.
            </p>
          ) : googleLoginAvailable ? (
            <>
              <GoogleSignInButton className="w-full justify-center" size="default" />
              <p className="mt-3 text-center text-xs text-muted-foreground">
                Use o mesmo botão no menu em qualquer página.
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              O login com Google não está configurado neste ambiente. Contacte o
              administrador do site.
            </p>
          )}
          {isRecaptchaEnabled() ? (
            <p className="mt-4 text-center text-[10px] leading-snug text-muted-foreground">
              Protegido por reCAPTCHA do Google.
            </p>
          ) : null}
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link
            to="/Home"
            onClick={() => clearLoginIntent()}
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Voltar ao site
          </Link>
        </p>
      </div>
    </div>
  );
}
