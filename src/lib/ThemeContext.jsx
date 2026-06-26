import { createContext, useCallback, useContext, useEffect, useState } from "react";

import { useAuth } from "@/lib/AuthContext";
import { applySiteColorPalette } from "@/lib/colorPalettes";
import {
  getActiveSiteTheme,
  initSiteTheme,
  resolveSiteTheme,
  setSiteTheme,
} from "@/lib/siteTheme";

/** @typedef {"light" | "dark"} SiteThemeMode */

const ThemeContext = createContext({
  /** @type {SiteThemeMode} */
  theme: "dark",
  /** @type {(theme: SiteThemeMode) => void} */
  setTheme: () => {},
  /** @type {() => void} */
  toggleTheme: () => {},
  isDark: false,
});

export function ThemeProvider({ children }) {
  const { user } = useAuth();
  const [theme, setThemeState] = useState(() =>
    typeof document !== "undefined" ? getActiveSiteTheme() : resolveSiteTheme(),
  );

  const setTheme = useCallback((next) => {
    const applied = setSiteTheme(next);
    setThemeState(applied);
    applySiteColorPalette();
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [setTheme, theme]);

  useEffect(() => {
    initSiteTheme();
    setThemeState(getActiveSiteTheme());
    applySiteColorPalette();
  }, [user?.id]);

  useEffect(() => {
    const onPalette = () => applySiteColorPalette();
    const onTheme = (e) => {
      const next = e?.detail?.theme;
      if (next === "light" || next === "dark") setThemeState(next);
    };
    window.addEventListener("icer-user-color-palette", onPalette);
    window.addEventListener("icer-theme-change", onTheme);
    return () => {
      window.removeEventListener("icer-user-color-palette", onPalette);
      window.removeEventListener("icer-theme-change", onTheme);
    };
  }, [user?.id]);

  return (
    <ThemeContext.Provider
      value={{ theme, setTheme, toggleTheme, isDark: theme === "dark" }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
