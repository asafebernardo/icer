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
import { Eye, EyeOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/AuthContext";
import { getPageBackgroundUrl } from "@/lib/usePageBackground";
import ResponsivePageBgImage from "@/components/shared/ResponsivePageBgImage";
import {
  imageScrimFlat,
  imageScrimBottomShort,
} from "@/lib/imageScrimClasses";

/**
 * Modal de login. Controlado por AuthContext (openLoginModal / closeLoginModal).
 */
export default function LoginModal() {
  const { login, loginModalOpen, closeLoginModal } = useAuth();
  const navigate = useNavigate();
  const formId = useId();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [twoFactor, setTwoFactor] = useState("");
  const [twoFactorToken, setTwoFactorToken] = useState("");
  const [twoFactorStep, setTwoFactorStep] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [sessionConflict, setSessionConflict] = useState(false);
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
      setTwoFactor("");
      setTwoFactorToken("");
      setTwoFactorStep(false);
      setShowPassword(false);
      setError("");
      setSessionConflict(false);
    }
  }, [loginModalOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!twoFactorStep) {
      const result = await login(email, senha);
      if (!result.ok) {
        if (result.twoFactorRequired && result.login_token) {
          setTwoFactorToken(result.login_token);
          setTwoFactorStep(true);
          setError("");
          setSessionConflict(false);
          return;
        }
        setSessionConflict(result.sessionAlreadyActive === true);
        setError(result.message || "Login inválido.");
        return;
      }
      setSessionConflict(false);
      closeLoginModal();
      navigate("/Dashboard");
      return;
    }
    try {
      const { loginWithServer2FA } = await import("@/lib/auth");
      await loginWithServer2FA(twoFactorToken, twoFactor);
      closeLoginModal();
      navigate("/Dashboard");
    } catch (err) {
      setError(err?.message || "Código 2FA inválido.");
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
              {twoFactorStep ? "Confirmar 2FA" : "Iniciar sessão"}
            </DialogTitle>
            <DialogDescription className="text-sm text-primary-foreground/90">
              {twoFactorStep
                ? "Digite o código do autenticador."
                : "Aceda com o seu e-mail e palavra-passe."}
            </DialogDescription>
          </DialogHeader>
        </div>

        <form
          id={formId}
          onSubmit={handleSubmit}
          className="space-y-4 px-6 pb-6 pt-5"
        >
          {!twoFactorStep ? (
            <>
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
                      <EyeOff className="h-4 h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <Label htmlFor={`${formId}-2fa`}>Código 2FA</Label>
              <Input
                id={`${formId}-2fa`}
                inputMode="numeric"
                placeholder="123456"
                value={twoFactor}
                onChange={(e) => {
                  setTwoFactor(e.target.value);
                  setError("");
                }}
                autoComplete="one-time-code"
                className="border-input bg-background text-foreground placeholder:text-muted-foreground"
              />
              <Button
                type="button"
                variant="ghost"
                className="px-0 text-muted-foreground"
                onClick={() => {
                  setTwoFactorStep(false);
                  setTwoFactor("");
                  setTwoFactorToken("");
                }}
              >
                Voltar
              </Button>
            </div>
          )}
          {error ? (
            <p
              role="alert"
              className="text-sm leading-snug text-destructive"
            >
              {error}
            </p>
          ) : null}
          {sessionConflict && !twoFactorStep ? (
            <Button
              type="button"
              variant="outline"
              className="w-full text-sm"
              onClick={async () => {
                setError("");
                const result = await login(email, senha, { forceNewSession: true });
                if (!result.ok) {
                  if (result.twoFactorRequired && result.login_token) {
                    setTwoFactorToken(result.login_token);
                    setTwoFactorStep(true);
                    setSessionConflict(false);
                    setError("");
                    return;
                  }
                  setSessionConflict(result.sessionAlreadyActive === true);
                  setError(result.message || "Não foi possível iniciar sessão.");
                  return;
                }
                setSessionConflict(false);
                closeLoginModal();
                navigate("/Dashboard");
              }}
            >
              Encerrar a outra sessão e entrar
            </Button>
          ) : null}
          <Button type="submit" className="mt-2 w-full font-semibold">
            Entrar
          </Button>
          {import.meta.env.DEV &&
            import.meta.env.VITE_ENABLE_DEMO_LOGIN !== "true" && (
              <p className="text-center text-xs leading-snug text-muted-foreground">
                Login local desativado. Configure{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-[10px] text-foreground/90">
                  VITE_ENABLE_DEMO_LOGIN
                </code>{" "}
                em{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-[10px] text-foreground/90">
                  .env.local
                </code>
                .
              </p>
            )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
