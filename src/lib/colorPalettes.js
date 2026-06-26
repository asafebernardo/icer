/** Paletas HSL monocromáticas (formato Tailwind/shadcn: "H S% L%" sem hsl()). */

import { applySiteTheme, getActiveSiteTheme } from "@/lib/siteTheme";

/** Base institucional — só usada para derivar variantes com baixa saturação. */
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

/** Reduz saturação para manter tudo monocromático (exceto erros semânticos). */
function capSaturation(triple, maxS) {
  const t = triple.trim();
  const p = t.split(/\s+/);
  if (p.length < 3) return t;
  const s = parseFloat(p[1]);
  if (Number.isNaN(s)) return t;
  if (s <= maxS) return t;
  return `${p[0]} ${maxS}% ${p[2]}`;
}

function applyMonoCaps(lightObj, darkObj, maxS) {
  const light = {};
  const dark = {};
  for (const k of Object.keys(lightObj)) {
    if (k.includes("destructive")) {
      light[k] = lightObj[k];
      dark[k] = darkObj[k];
      continue;
    }
    let cap = maxS;
    if (k.includes("success")) cap = Math.min(maxS + 5, 22);
    else if (k.includes("category")) cap = Math.min(maxS + 3, 18);
    light[k] = capSaturation(lightObj[k], cap);
    dark[k] = capSaturation(darkObj[k], cap);
  }
  return { light, dark };
}

function monoVariant(hue, maxS) {
  const shifted = shiftPalette(AZUL_LIGHT, AZUL_DARK, hue);
  return applyMonoCaps(shifted.light, shifted.dark, maxS);
}

const PALETTES = {
  neve: monoVariant(218, 11),
  ardosia: monoVariant(215, 11),
  pedra: monoVariant(30, 9),
  grafite: monoVariant(240, 8),
};

export const DEFAULT_PALETTE_ID = "neve";

export const PALETTE_IDS = Object.keys(PALETTES);

export const PALETTE_OPTIONS = [
  { id: "neve", label: "Neve (frio)", preview: "from-slate-200 to-slate-500" },
  { id: "ardosia", label: "Ardósia", preview: "from-slate-300 to-slate-600" },
  { id: "pedra", label: "Pedra (quente)", preview: "from-stone-200 to-stone-500" },
  { id: "grafite", label: "Grafite", preview: "from-zinc-400 to-zinc-800" },
];

/**
 * Aplica variáveis CSS da paleta no documento.
 * @param {string} [_paletteId] — ignorado; paleta fixa em `siteTheme.js`.
 */
export function applySiteColorPalette(_paletteId) {
  applySiteTheme(document.documentElement, getActiveSiteTheme());
}
