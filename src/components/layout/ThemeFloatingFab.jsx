import { Moon, Sun } from "lucide-react";

import { useTheme } from "@/lib/ThemeContext";
import { MOBILE_FAB_BUTTON_CLASS } from "@/lib/mobileFabLayout";
import { cn } from "@/lib/utils";

/** Alternância de tema — mobile (navbar oculta abaixo de sm). */
export default function ThemeFloatingFab() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={theme === "dark" ? "Activar tema claro" : "Activar tema escuro"}
      title={theme === "dark" ? "Tema claro" : "Tema escuro"}
      className={cn(
        "fixed z-40 sm:hidden",
        MOBILE_FAB_BUTTON_CLASS,
        "left-[max(1rem,env(safe-area-inset-left,0px))]",
        "bottom-[calc(8.5rem+env(safe-area-inset-bottom,0px))]",
        "border-white/10 bg-background/35 text-foreground/80",
      )}
    >
      {theme === "dark" ? (
        <Sun className="h-5 w-5" aria-hidden />
      ) : (
        <Moon className="h-5 w-5" aria-hidden />
      )}
    </button>
  );
}
