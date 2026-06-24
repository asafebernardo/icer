import { Loader2, LogOut } from "lucide-react";

import GoogleLogo from "@/components/auth/GoogleLogo";
import useSiteContactDetails from "@/hooks/useSiteContactDetails";
import { hasSiteContactDetails } from "@/lib/contactDetails";
import {
  logout as authLogout,
  isAdminUser,
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
  const contactDetails = useSiteContactDetails();
  const hasContactFab = hasSiteContactDetails(contactDetails);
  const isAdmin = isAdminUser(sessionUser);
  const stackSlot = getMobileSessionFabSlot({ hasContactFab, isAdmin });

  if (!isLoggedIn && (!isServerAuthEnabled() || !googleLoginAvailable)) {
    return null;
  }

  const handleLogout = () => {
    authLogout();
  };

  const handleGoogleLogin = () => {
    void startGoogleLogin();
  };

  return (
    <button
      type="button"
      onClick={isLoggedIn ? handleLogout : handleGoogleLogin}
      disabled={!isLoggedIn && googleLoginBusy}
      aria-label={isLoggedIn ? "Sair da sessão" : "Entrar com Google"}
      title={isLoggedIn ? "Sair" : "Entrar com Google"}
      className={cn(
        "fixed z-40",
        MOBILE_FAB_BUTTON_CLASS,
        MOBILE_FAB_RIGHT,
        mobileFabBottomClass(stackSlot),
        isLoggedIn
          ? "border-destructive/30 bg-destructive/35 text-destructive-foreground"
          : "border-[#dadce0]/50 bg-white/90 text-[#3c4043] dark:border-[#5f6368]/50 dark:bg-[#131314]/90 dark:text-[#e8eaed]",
      )}
    >
      {isLoggedIn ? (
        <LogOut className="h-5 w-5" aria-hidden />
      ) : googleLoginBusy ? (
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
      ) : (
        <GoogleLogo className="h-5 w-5 shrink-0" />
      )}
    </button>
  );
}
