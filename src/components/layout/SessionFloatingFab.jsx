import { Loader2, LogIn, LogOut } from "lucide-react";

import { SITE_LOGIN_BUTTON_CLASS } from "@/components/auth/GoogleSignInButton";
import {
  logout as authLogout,
  canUseEditMode,
  getUser,
  isServerAuthEnabled,
} from "@/lib/auth";
import { useAuth } from "@/lib/AuthContext";
import { useSyncedAuthUser } from "@/hooks/useSyncedAuthUser";
import {
  MOBILE_FAB_BUTTON_CLASS,
  MOBILE_FAB_RIGHT,
  getMobileSessionFabSlot,
  mobileFabBottomClass,
} from "@/lib/mobileFabLayout";
import { cn } from "@/lib/utils";

export default function SessionFloatingFab() {
  const { googleLoginAvailable, startGoogleLogin, googleLoginBusy } = useAuth();
  const sessionUser = useSyncedAuthUser() ?? getUser();
  const isLoggedIn = !!sessionUser;
  const showEditFab = canUseEditMode(sessionUser);
  const stackSlot = getMobileSessionFabSlot(showEditFab);
  const loginBlocked = !isServerAuthEnabled() || !googleLoginAvailable;
  const blockedTitle = !isServerAuthEnabled()
    ? "Autenticação do servidor desactivada"
    : "Login indisponível — integração não configurada";

  const handleLogout = () => {
    authLogout();
  };

  const handleLogin = () => {
    if (loginBlocked || googleLoginBusy) return;
    void startGoogleLogin();
  };

  return (
    <button
      type="button"
      onClick={isLoggedIn ? handleLogout : handleLogin}
      disabled={!isLoggedIn && (googleLoginBusy || loginBlocked)}
      aria-label={isLoggedIn ? "Sair da sessão" : "Entrar"}
      aria-disabled={!isLoggedIn && loginBlocked}
      title={isLoggedIn ? "Sair" : loginBlocked ? blockedTitle : "Entrar"}
      className={cn(
        "fixed z-40",
        MOBILE_FAB_BUTTON_CLASS,
        MOBILE_FAB_RIGHT,
        mobileFabBottomClass(stackSlot),
        isLoggedIn
          ? "border-destructive/30 bg-destructive/35 text-destructive-foreground"
          : cn(
              SITE_LOGIN_BUTTON_CLASS,
              "border-white/10 bg-background/35 text-foreground/80",
            ),
        !isLoggedIn &&
          loginBlocked &&
          "cursor-not-allowed opacity-50 hover:scale-100 active:scale-100",
      )}
    >
      {isLoggedIn ? (
        <LogOut className="h-5 w-5" aria-hidden />
      ) : googleLoginBusy ? (
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
      ) : (
        <LogIn className="h-5 w-5" aria-hidden />
      )}
    </button>
  );
}
