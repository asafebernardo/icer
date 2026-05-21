import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/AuthContext";
import { cn } from "@/lib/utils";
import GoogleLogo from "@/components/auth/GoogleLogo";

/**
 * Botão de entrada com o visual oficial do Google.
 * @param {{
 *   className?: string;
 *   size?: "default" | "sm" | "lg" | "icon";
 *   compact?: boolean;
 *   onClick?: () => void;
 * }} props
 */
export default function GoogleSignInButton({
  className,
  size = "sm",
  compact = false,
  onClick,
}) {
  const {
    startGoogleLogin,
    googleLoginBusy,
    googleLoginAvailable,
    rememberedGoogleEmail,
  } = useAuth();

  if (!googleLoginAvailable) return null;

  const label = rememberedGoogleEmail
    ? compact
      ? "Google"
      : `Continuar como ${rememberedGoogleEmail}`
    : compact
      ? "Google"
      : "Continuar com Google";

  const ariaLabel = rememberedGoogleEmail
    ? `Continuar com Google como ${rememberedGoogleEmail}`
    : "Continuar com Google";

  return (
    <Button
      type="button"
      variant="outline"
      size={size}
      disabled={googleLoginBusy}
      onClick={onClick ?? (() => void startGoogleLogin())}
      aria-label={ariaLabel}
      className={cn(
        "gap-2 border-[#dadce0] bg-white font-medium text-[#3c4043] shadow-sm",
        "hover:bg-[#f8f9fa] hover:text-[#3c4043] dark:border-[#5f6368] dark:bg-[#131314] dark:text-[#e8eaed] dark:hover:bg-[#292a2d]",
        className,
      )}
    >
      {googleLoginBusy ? (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
      ) : (
        <GoogleLogo className="h-4 w-4 shrink-0" />
      )}
      <span className={cn(compact && "hidden sm:inline")}>{label}</span>
    </Button>
  );
}
