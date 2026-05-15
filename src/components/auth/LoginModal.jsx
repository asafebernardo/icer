import { useState, useEffect, useId } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Eye, EyeOff, KeyRound, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/AuthContext";
import { getPageBackgroundUrl } from "@/lib/usePageBackground";
import { getUser, isAdminUser, isServerAuthEnabled } from "@/lib/auth";
import ResponsivePageBgImage from "@/components/shared/ResponsivePageBgImage";
import {
  imageScrimFlat,
  imageScrimBottomShort,
} from "@/lib/imageScrimClasses";

/** Logo oficial do Google (G colorido) — usado no botão "Continuar com Google". */
function GoogleLogo({ className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

/**
 * Modal de login. Controlado por AuthContext (openLoginModal / closeLoginModal).
 */
function postLoginPath() {
  const u = getUser();
  return isAdminUser(u) ? "/Admin" : "/Dashboard";
}

/**
 * Formulário clássico (e-mail + palavra-passe). Mantido fora de `LoginModal`
 * para poder ser renderizado tanto dentro de `Tabs` (com Google) como em modo
 * solo (quando o login Google não está disponível).
 */
function StandardLoginForm({
  formId,
  email,
  setEmail,
  senha,
  setSenha,
  showPassword,
  setShowPassword,
  setError,
  setSessionConflict,
  handleSubmit,
  error,
  sessionConflict,
  login,
  closeLoginModal,
  navigate,
}) {
  return (
    <form id={formId} onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={`${formId}-email`}>E-mail</Label>
        <Input
          id={`${formId}-email`}
          type="email"
          placeholder="email@exemplo.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError("");
            setSessionConflict(false);
          }}
          autoComplete="email"
          className="border-input bg-background text-foreground placeholder:text-muted-foreground"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${formId}-senha`}>Palavra-passe</Label>
        <div className="relative">
          <Input
            id={`${formId}-senha`}
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            value={senha}
            onChange={(e) => {
              setSenha(e.target.value);
              setError("");
              setSessionConflict(false);
            }}
            autoComplete="current-password"
            className="border-input bg-background pr-11 text-foreground placeholder:text-muted-foreground"
          />
          <button
            type="button"
            tabIndex={-1}
            className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={
              showPassword ? "Ocultar palavra-passe" : "Mostrar palavra-passe"
            }
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
      {error ? (
        <p role="alert" className="text-sm leading-snug text-destructive">
          {error}
        </p>
      ) : null}
      {sessionConflict ? (
        <Button
          type="button"
          variant="outline"
          className="w-full text-sm"
          onClick={async () => {
            setError("");
            const result = await login(email, senha, { forceNewSession: true });
            if (!result.ok) {
              setSessionConflict(result.sessionAlreadyActive === true);
              setError(result.message || "Não foi possível iniciar sessão.");
              return;
            }
            setSessionConflict(false);
            closeLoginModal();
            navigate(postLoginPath());
          }}
        >
          Encerrar a outra sessão e entrar
        </Button>
      ) : null}
      <Button type="submit" className="mt-2 w-full font-semibold">
        Entrar
      </Button>
    </form>
  );
}

export default function LoginModal() {
  const {
    login,
    loginModalOpen,
    closeLoginModal,
    googleLoginIntent,
    clearGoogleLoginIntent,
  } = useAuth();
  const navigate = useNavigate();
  const formId = useId();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [sessionConflict, setSessionConflict] = useState(false);
  const [googleLoginAvailable, setGoogleLoginAvailable] = useState(false);
  /** Modo de login selecionado pelo utilizador: "padrao" (e-mail e palavra-passe) ou "google". */
  const [mode, setMode] = useState("padrao");
  const [formBgUrl, setFormBgUrl] = useState(() =>
    getPageBackgroundUrl("login_form"),
  );

  useEffect(() => {
    const sync = () => setFormBgUrl(getPageBackgroundUrl("login_form"));
    window.addEventListener("icer-site-config", sync);
    return () => window.removeEventListener("icer-site-config", sync);
  }, []);

  useEffect(() => {
    if (!loginModalOpen) {
      setEmail("");
      setSenha("");
      setShowPassword(false);
      setError("");
      setSessionConflict(false);
      setMode("padrao");
    }
  }, [loginModalOpen]);

  /** Se a integração Google estiver desligada, volta sempre ao modo padrão. */
  useEffect(() => {
    if (!googleLoginAvailable && mode === "google") {
      setMode("padrao");
    }
  }, [googleLoginAvailable, mode]);

  useEffect(() => {
    if (!loginModalOpen || !googleLoginIntent) return;
    if (googleLoginIntent.type === "err") {
      setError(googleLoginIntent.message);
      clearGoogleLoginIntent();
    }
  }, [loginModalOpen, googleLoginIntent, clearGoogleLoginIntent]);

  useEffect(() => {
    if (!loginModalOpen || !isServerAuthEnabled()) {
      setGoogleLoginAvailable(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const r = await fetch("/api/auth/google-login/config", { credentials: "include" });
        const j = await r.json().catch(() => ({}));
        if (!cancelled && r.ok && j.enabled === true) {
          setGoogleLoginAvailable(true);
        } else if (!cancelled) {
          setGoogleLoginAvailable(false);
        }
      } catch {
        if (!cancelled) setGoogleLoginAvailable(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loginModalOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const result = await login(email, senha);
    if (!result.ok) {
      setSessionConflict(result.sessionAlreadyActive === true);
      setError(result.message || "Login inválido.");
      return;
    }
    setSessionConflict(false);
    closeLoginModal();
    navigate(postLoginPath());
  };

  const startGoogleLogin = async () => {
    setError("");
    try {
      const r = await fetch("/api/auth/google-login/start", { credentials: "include" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.message || r.statusText);
      if (j.auth_url) window.location.assign(j.auth_url);
    } catch (err) {
      setError(err?.message || "Não foi possível iniciar o login com Google.");
    }
  };

  return (
    <Dialog open={loginModalOpen} onOpenChange={(o) => !o && closeLoginModal()}>
      <DialogContent
        hideClose
        className="max-w-[min(100vw-1.5rem,26rem)] gap-0 overflow-hidden rounded-2xl border-border/80 bg-card p-0 text-foreground shadow-card sm:rounded-2xl"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="relative min-h-[120px] overflow-hidden bg-primary">
          <ResponsivePageBgImage src={formBgUrl} />
          {formBgUrl ? (
            <>
              <div className={imageScrimFlat} aria-hidden />
              <div className={imageScrimBottomShort} aria-hidden />
            </>
          ) : null}
          <div
            className={`pointer-events-none absolute inset-0 z-[3] bg-gradient-to-br ${
              formBgUrl
                ? "from-primary/78 via-primary/62 to-primary/82"
                : "from-primary/95 via-primary/90 to-primary/95"
            }`}
          />
          {formBgUrl ? (
            <div className="pointer-events-none absolute inset-0 z-[4] bg-primary/28 backdrop-blur-[1px]" />
          ) : null}
          <DialogClose className="absolute right-3 top-3 z-20 rounded-md p-2 text-primary-foreground/95 ring-offset-background transition-colors hover:bg-white/15 hover:text-primary-foreground focus:outline-none focus:ring-2 focus:ring-white/40 focus:ring-offset-2 focus:ring-offset-transparent">
            <X className="h-4 w-4" />
            <span className="sr-only">Fechar</span>
          </DialogClose>
          <DialogHeader className="relative z-10 space-y-1 px-6 pb-4 pt-6 pr-14 text-left">
            <DialogTitle className="font-display text-xl font-semibold tracking-tight text-primary-foreground">
              Iniciar sessão
            </DialogTitle>
            <DialogDescription className="text-sm text-primary-foreground/90">
              {googleLoginAvailable
                ? "Escolha como quer entrar: e-mail e palavra-passe ou conta Google."
                : "Aceda com o seu e-mail e palavra-passe."}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-6 pb-6 pt-5">
          {googleLoginAvailable ? (
            <Tabs
              value={mode}
              onValueChange={(v) => {
                setMode(v === "google" ? "google" : "padrao");
                setError("");
                setSessionConflict(false);
              }}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2 h-auto p-1 gap-1 mb-4">
                <TabsTrigger
                  value="padrao"
                  className="gap-2 px-3 py-1.5"
                  aria-label="Login padrão com e-mail e palavra-passe"
                >
                  <KeyRound className="h-4 w-4" />
                  <span>Padrão</span>
                </TabsTrigger>
                <TabsTrigger
                  value="google"
                  className="gap-2 px-3 py-1.5"
                  aria-label="Continuar com Google"
                >
                  <GoogleLogo className="h-4 w-4" />
                  <span>Google</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="padrao" className="mt-0">
                <StandardLoginForm
                  formId={formId}
                  email={email}
                  setEmail={setEmail}
                  senha={senha}
                  setSenha={setSenha}
                  showPassword={showPassword}
                  setShowPassword={setShowPassword}
                  setError={setError}
                  setSessionConflict={setSessionConflict}
                  handleSubmit={handleSubmit}
                  error={error}
                  sessionConflict={sessionConflict}
                  login={login}
                  closeLoginModal={closeLoginModal}
                  navigate={navigate}
                />
              </TabsContent>

              <TabsContent value="google" className="mt-0">
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Use a sua conta Google para entrar. Apenas e-mails
                    autorizados pela administração conseguem iniciar sessão.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full gap-2.5 font-medium"
                    onClick={() => void startGoogleLogin()}
                    aria-label="Continuar com Google"
                  >
                    <GoogleLogo className="h-4 w-4 shrink-0" />
                    <span>Continuar com Google</span>
                  </Button>
                  {error ? (
                    <p
                      role="alert"
                      className="text-sm leading-snug text-destructive"
                    >
                      {error}
                    </p>
                  ) : null}
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            <StandardLoginForm
              formId={formId}
              email={email}
              setEmail={setEmail}
              senha={senha}
              setSenha={setSenha}
              showPassword={showPassword}
              setShowPassword={setShowPassword}
              setError={setError}
              setSessionConflict={setSessionConflict}
              handleSubmit={handleSubmit}
              error={error}
              sessionConflict={sessionConflict}
              login={login}
              closeLoginModal={closeLoginModal}
              navigate={navigate}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
