/**
 * Paleta institucional fixa do site (hex → HSL para Tailwind/shadcn).
 * Fundo #08111F · Card #101B2D · Primary #3B82F6 · Hover #60A5FA
 * Accent #38BDF8 · Texto #E2E8F0 · Borda #1E293B
 */
export const SITE_THEME = {
  "--background": "217 59% 8%",
  "--foreground": "214 32% 91%",
  "--card": "217 48% 12%",
  "--card-foreground": "214 32% 91%",
  "--popover": "217 48% 12%",
  "--popover-foreground": "214 32% 91%",
  "--primary": "217 91% 60%",
  "--primary-hover": "213 94% 68%",
  "--primary-foreground": "0 0% 100%",
  "--secondary": "217 45% 10%",
  "--secondary-foreground": "214 32% 91%",
  "--muted": "217 40% 10%",
  "--muted-foreground": "214 18% 68%",
  "--accent": "198 93% 60%",
  "--accent-foreground": "217 59% 8%",
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
  "--brand-surface-dark": "217 48% 12%",
  "--on-brand": "214 32% 91%",
  "--glow-accent": "198 93% 60%",
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

/** Aplica a paleta institucional no `:root`. */
export function applySiteTheme(root = document.documentElement) {
  for (const [prop, value] of Object.entries(SITE_THEME)) {
    root.style.setProperty(prop, value);
  }
}
