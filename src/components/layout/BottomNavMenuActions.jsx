import { LogOut, Moon, Pencil, Sun } from "lucide-react";

import GoogleSignInButton from "@/components/auth/GoogleSignInButton";
import { useSyncedAuthUser } from "@/hooks/useSyncedAuthUser";
import {
  canUseEditMode,
  getUser,
  logout as authLogout,
} from "@/lib/auth";
import { useEditMode } from "@/lib/EditModeContext";
import { useTheme } from "@/lib/ThemeContext";
import { cn } from "@/lib/utils";

const actionRowClass =
  "flex min-h-[44px] w-full cursor-pointer items-center justify-between gap-3 rounded-xl border border-border/70 bg-muted/20 px-4 py-2.5 text-left text-[14px] font-medium text-foreground transition-colors hover:bg-muted/40 min-w-0";

function ToggleTrack({ active }) {
  return (
    <span
      aria-hidden
      className={cn(
        "relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors",
        active ? "bg-accent dark:bg-accent" : "bg-muted dark:bg-white/15",
      )}
    >
      <span
        className={cn(
          "inline-block h-3 w-3 transform rounded-full bg-background shadow transition-transform dark:bg-white dark:shadow-md",
          active ? "translate-x-3.5" : "translate-x-0.5",
        )}
      />
    </span>
  );
}

export default function BottomNavMenuActions({ onAction }) {
  const { theme, toggleTheme } = useTheme();
  const { enabled: editMode, toggle: toggleEditMode } = useEditMode();
  const sessionUser = useSyncedAuthUser() ?? getUser();
  const isLoggedIn = !!sessionUser;
  const showEditMode = canUseEditMode(sessionUser);
  const isDark = theme === "dark";

  const handleLogout = () => {
    onAction?.();
    authLogout();
  };

  return (
    <div className="space-y-2 p-3">
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={isDark ? "Activar tema claro" : "Activar tema escuro"}
        className={actionRowClass}
      >
        <span className="flex min-w-0 items-center gap-2">
          {isDark ? (
            <Sun className="h-4 w-4 shrink-0" aria-hidden />
          ) : (
            <Moon className="h-4 w-4 shrink-0" aria-hidden />
          )}
          <span className="truncate">
            {isDark ? "Tema claro" : "Tema escuro"}
          </span>
        </span>
        <ToggleTrack active={isDark} />
      </button>

      {showEditMode ? (
        <button
          type="button"
          onClick={toggleEditMode}
          aria-label={
            editMode ? "Desactivar modo de edição" : "Activar modo de edição"
          }
          aria-pressed={editMode}
          className={actionRowClass}
        >
          <span className="flex min-w-0 items-center gap-2">
            <Pencil className="h-4 w-4 shrink-0" aria-hidden />
            <span className="truncate">Modo de edição</span>
          </span>
          <ToggleTrack active={editMode} />
        </button>
      ) : null}

      {isLoggedIn ? (
        <button
          type="button"
          onClick={handleLogout}
          className={cn(
            actionRowClass,
            "border-destructive/30 text-destructive hover:bg-destructive/10",
          )}
        >
          <span className="flex min-w-0 items-center gap-2">
            <LogOut className="h-4 w-4 shrink-0" aria-hidden />
            <span className="truncate">Sair</span>
          </span>
        </button>
      ) : (
        <GoogleSignInButton
          className="w-full min-h-[44px] justify-center"
          size="default"
          onClick={onAction}
        />
      )}
    </div>
  );
}
