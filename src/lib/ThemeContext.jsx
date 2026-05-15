import { createContext, useContext, useEffect, useState } from "react";

import { getSiteConfig } from "@/lib/siteConfig";
import { applySiteColorPalette } from "@/lib/colorPalettes";

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
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
    applySiteColorPalette(getSiteConfig().colorPalette || "azul");
  }, [theme]);

  useEffect(() => {
    const syncPalette = () => {
      applySiteColorPalette(getSiteConfig().colorPalette || "azul");
    };
    window.addEventListener("icer-site-config", syncPalette);
    return () => window.removeEventListener("icer-site-config", syncPalette);
  }, []);

  const toggle = () => setTheme((t) => (t === "light" ? "dark" : "light"));

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
