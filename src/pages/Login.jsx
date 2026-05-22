import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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
  setLoginIntent,
} from "@/lib/loginIntent";

function safeReturnPath() {
  const raw = sessionStorage.getItem(LAST_VISITED_PATH_KEY) || "/Home";
  if (!raw.startsWith("/") || raw.startsWith("/login")) return "/Home";
  return raw;
}

export default function Login() {
  const navigate = useNavigate();
  const {
    login,
    logout,
    isAuthenticated,
    isLoadingAuth,
    googleLoginAvailable,
  } = useAuth();
  const serverAuth = isServerAuthEnabled();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    captureLoginIntentFromBrowserUrl();
    setLoginIntent();
  }, []);

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

  if (isLoadingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden />
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
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
    <div className="flex min-h-screen flex-col bg-background">
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
            Entrada com conta do servidor (e-mail e palavra-passe).
          </p>
        </div>

        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-soft sm:p-8">
          {serverAuth ? (
            <form onSubmit={submit} className="space-y-4">
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
          ) : (
            <p className="text-sm text-muted-foreground">
              A autenticação no servidor está desativada neste ambiente. Ative{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">
                VITE_USE_SERVER_AUTH=true
              </code>{" "}
              no ficheiro de ambiente e reinicie o Vite.
            </p>
          )}

          {googleLoginAvailable ? (
            <>
              <div className="relative my-6">
                <Separator />
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                  ou
                </span>
              </div>
              <GoogleSignInButton className="w-full justify-center" size="default" />
              <p className="mt-3 text-center text-xs text-muted-foreground">
                O login com Google continua disponível no site (menu e botões
                «Continuar com Google»).
              </p>
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
