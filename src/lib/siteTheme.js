/**
 * Paletas institucionais ICER (HSL para Tailwind/shadcn).
 * Claro: fundo #F4F7FC · card #FFFFFF · Primary #3B82F6 · Accent #38BDF8
 * Escuro: Preto → Grafite (#0B0D0F / #171A1E) · Primary #426A8C
 */

export const THEME_STORAGE_KEY = "church-theme";

/** @typedef {"light" | "dark"} SiteThemeMode */

export const SITE_THEME_LIGHT = {
  "--background": "210 40% 99%",
  "--foreground": "222 47% 11%",
  "--card": "0 0% 100%",
  "--card-foreground": "222 47% 11%",
  "--popover": "0 0% 100%",
  "--popover-foreground": "222 47% 11%",
  "--primary": "217 91% 60%",
  "--primary-hover": "213 94% 55%",
  "--primary-foreground": "0 0% 100%",
  "--secondary": "210 40% 98%",
  "--secondary-foreground": "222 47% 11%",
  "--muted": "210 40% 96%",
  "--muted-foreground": "215 16% 38%",
  "--accent": "217 91% 60%",
  "--accent-foreground": "0 0% 100%",
  "--destructive": "0 72% 50%",
  "--destructive-foreground": "0 0% 100%",
  "--border": "214 32% 91%",
  "--input": "214 32% 94%",
  "--ring": "217 91% 60%",
  "--chart-1": "217 91% 60%",
  "--chart-2": "213 94% 55%",
  "--chart-3": "215 16% 38%",
  "--chart-4": "217 33% 45%",
  "--chart-5": "213 94% 55%",
  "--radius": "0.875rem",
  "--sidebar-background": "214 40% 98%",
  "--sidebar-foreground": "217 45% 14%",
  "--sidebar-primary": "217 91% 60%",
  "--sidebar-primary-foreground": "0 0% 100%",
  "--sidebar-accent": "214 32% 94%",
  "--sidebar-accent-foreground": "217 45% 14%",
  "--sidebar-border": "214 32% 88%",
  "--sidebar-ring": "199 89% 48%",
  "--brand-surface": "217 91% 60%",
  "--brand-surface-dark": "217 48% 22%",
  "--on-brand": "0 0% 100%",
  "--glow-accent": "217 91% 60%",
  "--glow-primary": "217 91% 60%",
  "--category-culto": "217 91% 55%",
  "--category-estudo": "199 89% 45%",
  "--category-jovens": "262 45% 52%",
  "--category-mulheres": "330 45% 52%",
  "--category-homens": "24 70% 50%",
  "--category-criancas": "40 80% 48%",
  "--category-especial": "0 65% 52%",
  "--category-conferencia": "239 40% 55%",
  "--period-morning-bg": "199 55% 94%",
  "--period-morning-border": "199 45% 82%",
  "--period-afternoon-bg": "217 45% 94%",
  "--period-afternoon-border": "217 35% 82%",
  "--period-night-bg": "217 40% 93%",
  "--period-night-border": "217 30% 80%",
  "--period-open-bg": "262 35% 94%",
  "--period-open-border": "262 28% 82%",
  "--success": "158 58% 36%",
  "--success-foreground": "0 0% 100%",
};

/** Dark — Preto → Grafite */
export const SITE_THEME_DARK = {
  "--background": "210 15% 5%", // #0B0D0F
  "--foreground": "210 40% 96%", // #F1F5F9
  "--card": "214 13% 10%", // #171A1E
  "--card-foreground": "210 40% 96%",
  "--popover": "214 13% 10%",
  "--popover-foreground": "210 40% 96%",
  "--primary": "208 36% 40%", // #426A8C
  "--primary-hover": "205 39% 31%", // #31556F
  "--primary-foreground": "210 40% 96%",
  "--secondary": "214 13% 10%",
  "--secondary-foreground": "210 40% 96%",
  "--muted": "214 13% 10%",
  "--muted-foreground": "215 18% 71%", // #A8B3C2
  "--accent": "208 41% 64%", // #7FA6C9
  "--accent-foreground": "210 15% 5%",
  "--destructive": "0 62% 58%",
  "--destructive-foreground": "0 0% 100%",
  "--border": "213 12% 18%", // #292E34
  "--input": "213 12% 18%",
  "--ring": "208 41% 64%",
  "--chart-1": "208 41% 64%",
  "--chart-2": "208 36% 40%",
  "--chart-3": "215 18% 71%",
  "--chart-4": "205 39% 31%",
  "--chart-5": "208 41% 64%",
  "--radius": "0.75rem",
  "--sidebar-background": "210 15% 5%",
  "--sidebar-foreground": "210 40% 96%",
  "--sidebar-primary": "208 36% 40%",
  "--sidebar-primary-foreground": "210 40% 96%",
  "--sidebar-accent": "214 13% 10%",
  "--sidebar-accent-foreground": "210 40% 96%",
  "--sidebar-border": "213 12% 18%",
  "--sidebar-ring": "208 41% 64%",
  "--brand-surface": "208 36% 40%",
  "--brand-surface-dark": "214 13% 10%",
  "--on-brand": "210 40% 96%",
  "--glow-accent": "208 41% 64%",
  "--glow-primary": "208 36% 40%",
  "--category-culto": "208 41% 64%",
  "--category-estudo": "208 36% 40%",
  "--category-jovens": "262 38% 64%",
  "--category-mulheres": "330 40% 64%",
  "--category-homens": "24 65% 58%",
  "--category-criancas": "40 70% 56%",
  "--category-especial": "0 58% 60%",
  "--category-conferencia": "239 36% 64%",
  "--period-morning-bg": "214 13% 10%",
  "--period-morning-border": "213 12% 18%",
  "--period-afternoon-bg": "214 13% 10%",
  "--period-afternoon-border": "213 12% 18%",
  "--period-night-bg": "210 15% 5%",
  "--period-night-border": "213 12% 18%",
  "--period-open-bg": "214 13% 10%",
  "--period-open-border": "213 12% 18%",
  "--success": "158 48% 44%",
  "--success-foreground": "0 0% 100%",
};

/** @deprecated Use SITE_THEME_DARK — mantido para imports legados. */
export const SITE_THEME = SITE_THEME_DARK;

/** @returns {SiteThemeMode | null} */
export function readStoredSiteTheme() {
  try {
    const t = localStorage.getItem(THEME_STORAGE_KEY);
    if (t === "light" || t === "dark") return t;
  } catch {
    /* ignore */
  }
  return null;
}

/** @returns {SiteThemeMode} */
export function resolveSiteTheme() {
  return readStoredSiteTheme() ?? "dark";
}

/**
 * @param {HTMLElement} [root]
 * @param {SiteThemeMode} [theme]
 */
export function applySiteTheme(root = document.documentElement, theme = resolveSiteTheme()) {
  const tokens = theme === "dark" ? SITE_THEME_DARK : SITE_THEME_LIGHT;
  for (const [prop, value] of Object.entries(tokens)) {
    root.style.setProperty(prop, value);
  }
}

/** Aplica classe `dark` + variáveis antes do primeiro paint. */
export function initSiteTheme() {
  if (typeof document === "undefined") return "light";
  const theme = resolveSiteTheme();
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  applySiteTheme(root, theme);
  return theme;
}

/**
 * @param {SiteThemeMode} theme
 * @returns {SiteThemeMode}
 */
export function setSiteTheme(theme) {
  const next = theme === "dark" ? "dark" : "light";
  try {
    localStorage.setItem(THEME_STORAGE_KEY, next);
  } catch {
    /* ignore */
  }
  if (typeof document !== "undefined") {
    document.documentElement.classList.toggle("dark", next === "dark");
    applySiteTheme(document.documentElement, next);
    window.dispatchEvent(
      new CustomEvent("icer-theme-change", { detail: { theme: next } }),
    );
  }
  return next;
}

/** @returns {SiteThemeMode} */
export function getActiveSiteTheme() {
  if (typeof document === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}
