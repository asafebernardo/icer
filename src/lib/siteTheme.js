/**
 * Paletas institucionais ICER (HSL para Tailwind/shadcn).
 * Claro: fundo #F4F7FC · card #FFFFFF · Primary #3B82F6 · Accent #38BDF8
 * Escuro: fundo #08111F · card #101B2D · mesmos acentos
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

export const SITE_THEME_DARK = {
  "--background": "222 71% 4%",
  "--foreground": "210 40% 96%",
  "--card": "222 47% 7%",
  "--card-foreground": "210 40% 96%",
  "--popover": "222 47% 8%",
  "--popover-foreground": "210 40% 96%",
  "--primary": "217 91% 60%",
  "--primary-hover": "213 94% 68%",
  "--primary-foreground": "0 0% 100%",
  "--secondary": "222 40% 10%",
  "--secondary-foreground": "210 32% 90%",
  "--muted": "222 38% 11%",
  "--muted-foreground": "215 20% 68%",
  "--accent": "213 94% 68%",
  "--accent-foreground": "222 71% 4%",
  "--destructive": "0 62% 58%",
  "--destructive-foreground": "0 0% 100%",
  "--border": "217 33% 17%",
  "--input": "217 33% 14%",
  "--ring": "198 93% 60%",
  "--chart-1": "198 93% 60%",
  "--chart-2": "217 91% 60%",
  "--chart-3": "214 18% 68%",
  "--chart-4": "217 33% 40%",
  "--chart-5": "213 94% 68%",
  "--radius": "0.75rem",
  "--sidebar-background": "217 59% 7%",
  "--sidebar-foreground": "214 32% 91%",
  "--sidebar-primary": "217 91% 60%",
  "--sidebar-primary-foreground": "0 0% 100%",
  "--sidebar-accent": "217 45% 10%",
  "--sidebar-accent-foreground": "214 32% 91%",
  "--sidebar-border": "217 33% 17%",
  "--sidebar-ring": "198 93% 60%",
  "--brand-surface": "217 91% 60%",
  "--brand-surface-dark": "222 47% 8%",
  "--on-brand": "210 40% 98%",
  "--glow-accent": "213 94% 68%",
  "--glow-primary": "217 91% 60%",
  "--category-culto": "217 91% 60%",
  "--category-estudo": "198 93% 60%",
  "--category-jovens": "262 38% 64%",
  "--category-mulheres": "330 40% 64%",
  "--category-homens": "24 65% 58%",
  "--category-criancas": "40 70% 56%",
  "--category-especial": "0 58% 60%",
  "--category-conferencia": "239 36% 64%",
  "--period-morning-bg": "198 40% 14%",
  "--period-morning-border": "198 35% 22%",
  "--period-afternoon-bg": "217 40% 14%",
  "--period-afternoon-border": "217 33% 22%",
  "--period-night-bg": "217 38% 13%",
  "--period-night-border": "217 33% 20%",
  "--period-open-bg": "262 30% 14%",
  "--period-open-border": "262 26% 22%",
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
