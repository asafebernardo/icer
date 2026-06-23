import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, LogIn } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import GoogleSignInButton from "@/components/auth/GoogleSignInButton";
import SiteLogoMark from "@/components/layout/SiteLogoMark";
import PasswordRevealInput from "@/components/shared/PasswordRevealInput";
import { useAuth } from "@/lib/AuthContext";
import { isServerAuthEnabled } from "@/lib/auth";
import { LAST_VISITED_PATH_KEY } from "@/lib/lastPath";
import {
  captureLoginIntentFromBrowserUrl,
  clearLoginIntent,
  LOGIN_QUERY_FLAG,
  setLoginIntent,
} from "@/lib/loginIntent";
import { cn } from "@/lib/utils";

function safeReturnPath() {
  const raw = sessionStorage.getItem(LAST_VISITED_PATH_KEY) || "/Home";
  if (!raw.startsWith("/") || raw.startsWith("/login")) return "/Home";
  return raw;
}

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    login,
    logout,
    isAuthenticated,
    isLoadingAuth,
    googleLoginAvailable,
    reconcileLocalSession,
  } = useAuth();
  const serverAuth = isServerAuthEnabled();
  const legacyPasswordLogin =
    searchParams.get(LOGIN_QUERY_FLAG) === "1";
  const showPasswordForm =
    serverAuth && (!googleLoginAvailable || legacyPasswordLogin);
  const googleOnlyMobile = googleLoginAvailable && !legacyPasswordLogin;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reconcilingSession, setReconcilingSession] = useState(false);

  useEffect(() => {
    captureLoginIntentFromBrowserUrl();
    setLoginIntent();
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

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    const em = email.trim().toLowerCase();
    const pw = password;
    if (!em || !pw) {
      setError("Indique o e-mail e a palavra-passe.");
      return;
    }
    if (!serverAuth) {
      setError(
        "Login com conta do servidor não está ativo neste ambiente (VITE_USE_SERVER_AUTH).",
      );
      return;
    }
    setSubmitting(true);
    try {
      const result = await login(em, pw);
      if (!result.ok) {
        setError(result.message || "Não foi possível iniciar sessão.");
        return;
      }
      clearLoginIntent();
      toast.success("Sessão iniciada.");
      navigate(safeReturnPath(), { replace: true });
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoadingAuth || reconcilingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-transparent">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden />
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-transparent px-4 text-center">
        <p className="text-sm text-muted-foreground">
          Já tem sessão iniciada. Para entrar com outra conta, saia primeiro.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button type="button" variant="outline" asChild>
            <Link to="/Home" onClick={() => clearLoginIntent()}>
              Ir para o site
            </Link>
          </Button>
          <Button
            type="button"
            onClick={() => {
              clearLoginIntent();
              logout();
            }}
          >
            Sair
          </Button>
        </div>
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
            {googleOnlyMobile ? (
              <>
                <span className="sm:hidden">
                  Entrada com a conta Google autorizada da ICER.
                </span>
                <span className="hidden sm:inline">
                  Entrada com conta do servidor (e-mail e palavra-passe) ou Google.
                </span>
              </>
            ) : (
              "Entrada com conta do servidor (e-mail e palavra-passe)."
            )}
          </p>
        </div>

        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-premium sm:p-8">
          {showPasswordForm ? (
            <form
              onSubmit={submit}
              className={cn(
                "space-y-4",
                googleOnlyMobile && "hidden sm:block",
              )}
            >
              <div className="space-y-2">
                <Label htmlFor="login-email">E-mail</Label>
                <Input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  disabled={submitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password">Palavra-passe</Label>
                <PasswordRevealInput
                  id="login-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  disabled={submitting}
                />
              </div>
              {error ? (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              ) : null}
              <Button
                type="submit"
                className="w-full gap-2 font-semibold"
                disabled={submitting}
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <LogIn className="h-4 w-4" aria-hidden />
                )}
                {submitting ? "A entrar…" : "Entrar"}
              </Button>
            </form>
          ) : !serverAuth ? (
            <p className="text-sm text-muted-foreground">
              A autenticação no servidor está desativada neste ambiente. Ative{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">
                VITE_USE_SERVER_AUTH=true
              </code>{" "}
              no ficheiro de ambiente e reinicie o Vite.
            </p>
          ) : null}

          {googleLoginAvailable ? (
            <>
              {showPasswordForm ? (
                <div
                  className={cn(
                    "relative my-6",
                    googleOnlyMobile && "hidden sm:block",
                  )}
                >
                  <Separator />
                  <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                    ou
                  </span>
                </div>
              ) : null}
              <GoogleSignInButton className="w-full justify-center" size="default" />
              {googleOnlyMobile ? (
                <p className="mt-3 text-center text-xs text-muted-foreground sm:hidden">
                  Use o mesmo botão no menu «Mais» em qualquer página.
                </p>
              ) : (
                <p className="mt-3 text-center text-xs text-muted-foreground hidden sm:block">
                  O login com Google continua disponível no site (menu e botões
                  «Continuar com Google»).
                </p>
              )}
            </>
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
