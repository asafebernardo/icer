import { createContext, useContext, useEffect, useState } from "react";

import { useAuth } from "@/lib/AuthContext";
import { applySiteColorPalette } from "@/lib/colorPalettes";
import { getUserColorPalette } from "@/lib/userColorPalette";

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const { user } = useAuth();
  const [theme, setTheme] = useState(() => {
    // Tema é sempre por navegador/usuário.
    return localStorage.getItem("church-theme") || "light";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("church-theme", theme);
    applySiteColorPalette(getUserColorPalette(user?.id));
  }, [theme, user?.id]);

  useEffect(() => {
    const syncPalette = () => {
      applySiteColorPalette(getUserColorPalette(user?.id));
    };
    window.addEventListener("icer-user-color-palette", syncPalette);
    return () => window.removeEventListener("icer-user-color-palette", syncPalette);
  }, [user?.id]);

  const toggle = () => setTheme((t) => (t === "light" ? "dark" : "light"));

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
