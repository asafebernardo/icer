import { createContext, useContext, useEffect } from "react";

import { useAuth } from "@/lib/AuthContext";
import { applySiteTheme } from "@/lib/siteTheme";

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const { user } = useAuth();

  useEffect(() => {
    document.documentElement.classList.add("dark");
    localStorage.setItem("church-theme", "dark");
    applySiteTheme();
  }, [user?.id]);

  useEffect(() => {
    const syncPalette = () => {
      applySiteTheme();
    };
    window.addEventListener("icer-user-color-palette", syncPalette);
    return () => window.removeEventListener("icer-user-color-palette", syncPalette);
  }, [user?.id]);

  return <ThemeContext.Provider value={{ theme: "dark" }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
