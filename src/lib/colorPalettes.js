/** Paletas HSL (formato Tailwind/shadcn: "H S% L%" sem hsl()) */

/** Paleta base “Azul” — alinhada a `src/index.css` (institucional moderno). */
const AZUL_LIGHT = {
  "--background": "220 22% 97%",
  "--foreground": "222 47% 11%",
  "--card": "220 18% 99%",
  "--card-foreground": "222 47% 11%",
  "--popover": "220 18% 99%",
  "--popover-foreground": "222 47% 11%",
  "--primary": "224 47% 28%",
  "--primary-foreground": "0 0% 100%",
  "--secondary": "220 14% 94%",
  "--secondary-foreground": "222 47% 11%",
  "--muted": "220 14% 93%",
  "--muted-foreground": "220 12% 38%",
  "--accent": "199 89% 42%",
  "--accent-foreground": "0 0% 100%",
  "--destructive": "0 72% 42%",
  "--destructive-foreground": "0 0% 98%",
  "--border": "220 12% 86%",
  "--input": "220 12% 88%",
  "--ring": "199 89% 42%",
  "--chart-1": "199 89% 42%",
  "--chart-2": "224 47% 28%",
  "--chart-3": "220 12% 52%",
  "--chart-4": "220 10% 42%",
  "--chart-5": "199 70% 48%",
  "--sidebar-background": "220 20% 98%",
  "--sidebar-foreground": "222 47% 11%",
  "--sidebar-primary": "224 47% 28%",
  "--sidebar-primary-foreground": "0 0% 100%",
  "--sidebar-accent": "220 14% 94%",
  "--sidebar-accent-foreground": "222 47% 11%",
  "--sidebar-border": "220 12% 90%",
  "--sidebar-ring": "199 89% 42%",
  "--brand-surface": "224 47% 28%",
  "--brand-surface-dark": "222 45% 12%",
  "--on-brand": "0 0% 100%",
  "--category-culto": "224 47% 42%",
  "--category-estudo": "199 55% 38%",
  "--category-jovens": "262 42% 46%",
  "--category-mulheres": "330 48% 48%",
  "--category-homens": "24 75% 48%",
  "--category-criancas": "40 88% 48%",
  "--category-especial": "0 72% 48%",
  "--category-conferencia": "239 42% 50%",
  "--period-morning-bg": "199 38% 94%",
  "--period-morning-border": "199 38% 80%",
  "--period-afternoon-bg": "224 32% 94%",
  "--period-afternoon-border": "224 26% 80%",
  "--period-night-bg": "217 28% 93%",
  "--period-night-border": "217 22% 78%",
  "--period-open-bg": "262 28% 94%",
  "--period-open-border": "262 24% 80%",
  "--success": "158 58% 36%",
  "--success-foreground": "0 0% 100%",
};

const AZUL_DARK = {
  "--background": "222 47% 6%",
  "--foreground": "210 40% 98%",
  "--card": "222 40% 9%",
  "--card-foreground": "210 40% 98%",
  "--popover": "222 40% 9%",
  "--popover-foreground": "210 40% 98%",
  "--primary": "210 40% 96%",
  "--primary-foreground": "222 47% 11%",
  "--secondary": "217 33% 14%",
  "--secondary-foreground": "210 40% 96%",
  "--muted": "217 33% 14%",
  "--muted-foreground": "215 18% 82%",
  "--accent": "199 89% 48%",
  "--accent-foreground": "222 47% 8%",
  "--destructive": "0 65% 52%",
  "--destructive-foreground": "0 0% 100%",
  "--border": "217 33% 18%",
  "--input": "217 33% 18%",
  "--ring": "199 89% 48%",
  "--chart-1": "199 89% 48%",
  "--chart-2": "210 40% 88%",
  "--chart-3": "215 20% 55%",
  "--chart-4": "217 33% 40%",
  "--chart-5": "199 70% 58%",
  "--sidebar-background": "222 47% 7%",
  "--sidebar-foreground": "210 40% 96%",
  "--sidebar-primary": "199 89% 48%",
  "--sidebar-primary-foreground": "222 47% 8%",
  "--sidebar-accent": "217 33% 14%",
  "--sidebar-accent-foreground": "210 40% 96%",
  "--sidebar-border": "217 33% 18%",
  "--sidebar-ring": "199 89% 48%",
  "--brand-surface": "224 38% 22%",
  "--brand-surface-dark": "222 48% 8%",
  "--on-brand": "210 40% 98%",
  "--category-culto": "224 45% 58%",
  "--category-estudo": "199 50% 52%",
  "--category-jovens": "262 40% 62%",
  "--category-mulheres": "330 42% 62%",
  "--category-homens": "24 70% 58%",
  "--category-criancas": "40 75% 56%",
  "--category-especial": "0 62% 58%",
  "--category-conferencia": "239 38% 62%",
  "--period-morning-bg": "199 28% 16%",
  "--period-morning-border": "199 24% 28%",
  "--period-afternoon-bg": "224 26% 16%",
  "--period-afternoon-border": "224 22% 28%",
  "--period-night-bg": "217 28% 15%",
  "--period-night-border": "217 22% 26%",
  "--period-open-bg": "262 24% 16%",
  "--period-open-border": "262 22% 28%",
  "--success": "158 50% 42%",
  "--success-foreground": "0 0% 100%",
};

const NEUTRAL_SKIP = new Set([
  "0 0% 100%",
  "0 0% 98%",
  "0 0% 95%",
  "0 0% 92%",
]);

function rehueValue(str, newHue, key) {
  const t = str.trim();
  if (key.includes("destructive")) return t;
  if (NEUTRAL_SKIP.has(t)) return t;
  const p = t.split(/\s+/);
  if (p.length < 3) return t;
  const h = parseFloat(p[0]);
  if (Number.isNaN(h)) return t;
  if (h === 0 && p[1] !== "0%") return t;
  return `${newHue} ${p[1]} ${p[2]}`;
}

function shiftPalette(lightBase, darkBase, hue) {
  const outL = {};
  const outD = {};
  for (const k of Object.keys(lightBase)) {
    outL[k] = rehueValue(lightBase[k], hue, k);
    outD[k] = rehueValue(darkBase[k], hue, k);
  }
  return { light: outL, dark: outD };
}

const PALETTES = {
  azul: { light: AZUL_LIGHT, dark: AZUL_DARK },
  cinza: {
    light: {
      "--background": "0 0% 98%",
      "--foreground": "240 6% 10%",
      "--card": "0 0% 100%",
      "--card-foreground": "240 6% 10%",
      "--popover": "0 0% 100%",
      "--popover-foreground": "240 6% 10%",
      "--primary": "240 6% 18%",
      "--primary-foreground": "0 0% 98%",
      "--secondary": "240 5% 92%",
      "--secondary-foreground": "240 6% 10%",
      "--muted": "240 5% 94%",
      "--muted-foreground": "240 4% 38%",
      "--accent": "240 5% 34%",
      "--accent-foreground": "0 0% 98%",
      "--destructive": "0 72% 42%",
      "--destructive-foreground": "0 0% 98%",
      "--border": "240 6% 88%",
      "--input": "240 6% 88%",
      "--ring": "240 5% 34%",
      "--chart-1": "240 5% 34%",
      "--chart-2": "240 6% 18%",
      "--chart-3": "240 4% 55%",
      "--chart-4": "240 4% 46%",
      "--chart-5": "240 5% 50%",
      "--sidebar-background": "0 0% 98%",
      "--sidebar-foreground": "240 5.3% 26.1%",
      "--sidebar-primary": "240 5.9% 10%",
      "--sidebar-primary-foreground": "0 0% 98%",
      "--sidebar-accent": "240 4.8% 95.9%",
      "--sidebar-accent-foreground": "240 5.9% 10%",
      "--sidebar-border": "220 13% 91%",
      "--sidebar-ring": "240 5% 34%",
    },
    dark: {
      "--background": "240 6% 9%",
      "--foreground": "0 0% 97%",
      "--card": "240 5% 13%",
      "--card-foreground": "0 0% 97%",
      "--popover": "240 5% 13%",
      "--popover-foreground": "0 0% 97%",
      "--primary": "0 0% 92%",
      "--primary-foreground": "240 6% 10%",
      "--secondary": "240 4% 18%",
      "--secondary-foreground": "0 0% 96%",
      "--muted": "240 4% 18%",
      "--muted-foreground": "240 5% 78%",
      "--accent": "240 5% 42%",
      "--accent-foreground": "0 0% 98%",
      "--destructive": "0 65% 52%",
      "--destructive-foreground": "0 0% 100%",
      "--border": "240 4% 26%",
      "--input": "240 4% 26%",
      "--ring": "240 5% 58%",
      "--chart-1": "240 5% 58%",
      "--chart-2": "0 0% 72%",
      "--chart-3": "240 4% 45%",
      "--chart-4": "240 5% 65%",
      "--chart-5": "240 5% 55%",
      "--sidebar-background": "240 5.9% 11%",
      "--sidebar-foreground": "240 4.8% 96%",
      "--sidebar-primary": "0 0% 94%",
      "--sidebar-primary-foreground": "240 6% 10%",
      "--sidebar-accent": "240 3.7% 17%",
      "--sidebar-accent-foreground": "240 4.8% 96%",
      "--sidebar-border": "240 3.7% 22%",
      "--sidebar-ring": "240 5% 58%",
    },
  },
  esmeralda: shiftPalette(AZUL_LIGHT, AZUL_DARK, 158),
  violeta: shiftPalette(AZUL_LIGHT, AZUL_DARK, 262),
  teal: shiftPalette(AZUL_LIGHT, AZUL_DARK, 174),
  ambar: shiftPalette(AZUL_LIGHT, AZUL_DARK, 38),
  rosa: shiftPalette(AZUL_LIGHT, AZUL_DARK, 346),
  ciano: shiftPalette(AZUL_LIGHT, AZUL_DARK, 193),
};

export const PALETTE_IDS = Object.keys(PALETTES);

export const PALETTE_OPTIONS = [
  { id: "azul", label: "Azul institucional", preview: "from-primary to-accent" },
  { id: "cinza", label: "Cinza neutro", preview: "from-zinc-500 to-zinc-800" },
  { id: "esmeralda", label: "Esmeralda", preview: "from-emerald-500 to-emerald-800" },
  { id: "violeta", label: "Violeta", preview: "from-violet-500 to-violet-800" },
  { id: "teal", label: "Teal", preview: "from-teal-500 to-teal-800" },
  { id: "ambar", label: "Âmbar", preview: "from-amber-500 to-amber-800" },
  { id: "rosa", label: "Rosa", preview: "from-rose-500 to-rose-800" },
  { id: "ciano", label: "Ciano", preview: "from-cyan-500 to-cyan-800" },
];

/**
 * Aplica variáveis CSS da paleta no documento (respeita .dark).
 * @param {string} paletteId
 */
export function applySiteColorPalette(paletteId) {
  const root = document.documentElement;
  const set = PALETTES[paletteId] || PALETTES.azul;
  const vars = root.classList.contains("dark") ? set.dark : set.light;
  for (const [prop, value] of Object.entries(vars)) {
    root.style.setProperty(prop, value);
  }
}
