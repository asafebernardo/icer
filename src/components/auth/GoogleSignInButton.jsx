import { Loader2, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/AuthContext";
import { isServerAuthEnabled } from "@/lib/auth";
import { cn } from "@/lib/utils";

/** Estilo partilhado — alinhado à navbar e FABs do site. */
export const SITE_LOGIN_BUTTON_CLASS =
  "gap-2 border border-white/10 bg-background/40 font-medium text-foreground/90 shadow-sm shadow-black/10 backdrop-blur-sm ring-1 ring-white/5 hover:border-accent/35 hover:bg-accent/15 hover:text-foreground disabled:hover:border-white/10 disabled:hover:bg-background/40";

/**
 * Entrada via Google OAuth, com visual do site (ícone + «Entrar»).
 * Visível mesmo sem integração activa (desactivado).
 * @param {{
 *   className?: string;
 *   size?: "default" | "sm" | "lg" | "icon";
 *   compact?: boolean;
 *   iconOnly?: boolean;
 *   onClick?: () => void;
 * }} props
 */
export default function GoogleSignInButton({
  className,
  size = "sm",
  compact = false,
  iconOnly = false,
  onClick,
}) {
  const {
    startGoogleLogin,
    googleLoginBusy,
    googleLoginAvailable,
    rememberedGoogleEmail,
  } = useAuth();

  const serverAuth = isServerAuthEnabled();
  const loginBlocked = !serverAuth || !googleLoginAvailable;
  const blockedTitle = !serverAuth
    ? "Autenticação do servidor desactivada"
    : "Login indisponível — integração não configurada";

  const label = "Entrar";

  const ariaLabel = loginBlocked
    ? blockedTitle
    : rememberedGoogleEmail
      ? `Entrar como ${rememberedGoogleEmail}`
      : "Entrar";

  const handleClick = () => {
    if (loginBlocked || googleLoginBusy) return;
    onClick?.();
    void startGoogleLogin();
  };

  if (iconOnly || size === "icon") {
    return (
      <Button
        type="button"
        variant="outline"
        size="icon"
        disabled={loginBlocked || googleLoginBusy}
        onClick={handleClick}
        aria-label={ariaLabel}
        title={loginBlocked ? blockedTitle : ariaLabel}
        className={cn(
          SITE_LOGIN_BUTTON_CLASS,
          "h-10 w-10 shrink-0 rounded-full",
          loginBlocked && "cursor-not-allowed opacity-50",
          className,
        )}
      >
        {googleLoginBusy ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <LogIn className="h-4 w-4" aria-hidden />
        )}
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      size={size}
      disabled={loginBlocked || googleLoginBusy}
      onClick={handleClick}
      aria-label={ariaLabel}
      title={loginBlocked ? blockedTitle : ariaLabel}
      className={cn(
        SITE_LOGIN_BUTTON_CLASS,
        loginBlocked && "cursor-not-allowed opacity-50",
        className,
      )}
    >
      {googleLoginBusy ? (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
      ) : (
        <LogIn className="h-4 w-4 shrink-0" aria-hidden />
      )}
      <span className={cn(compact && "hidden sm:inline")}>{label}</span>
    </Button>
  );
}
