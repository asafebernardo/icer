/** Paletas HSL (formato Tailwind/shadcn: "H S% L%" sem hsl()) */

const AZUL_LIGHT = {
  "--background": "210 40% 98%",
  "--foreground": "222 47% 11%",
  "--card": "0 0% 100%",
  "--card-foreground": "222 47% 11%",
  "--popover": "0 0% 100%",
  "--popover-foreground": "222 47% 11%",
  "--primary": "221 83% 30%",
  "--primary-foreground": "0 0% 100%",
  "--secondary": "210 40% 93%",
  "--secondary-foreground": "222 47% 11%",
  "--muted": "210 40% 94%",
  "--muted-foreground": "215 16% 47%",
  "--accent": "210 100% 45%",
  "--accent-foreground": "0 0% 100%",
  "--destructive": "0 72% 42%",
  "--destructive-foreground": "0 0% 98%",
  "--border": "214 32% 85%",
  "--input": "214 32% 85%",
  "--ring": "210 100% 45%",
  "--chart-1": "210 100% 45%",
  "--chart-2": "221 83% 30%",
  "--chart-3": "210 40% 60%",
  "--chart-4": "215 16% 47%",
  "--chart-5": "210 100% 65%",
  "--sidebar-background": "0 0% 98%",
  "--sidebar-foreground": "240 5.3% 26.1%",
  "--sidebar-primary": "240 5.9% 10%",
  "--sidebar-primary-foreground": "0 0% 98%",
  "--sidebar-accent": "240 4.8% 95.9%",
  "--sidebar-accent-foreground": "240 5.9% 10%",
  "--sidebar-border": "220 13% 91%",
  "--sidebar-ring": "217.2 91.2% 59.8%",
};

/** Tema escuro da paleta "Azul": contraste reforçado (texto secundário, bordas, foco). */
const AZUL_DARK = {
  "--background": "0 0% 8%",
  "--foreground": "0 0% 98%",
  "--card": "0 0% 12%",
  "--card-foreground": "0 0% 98%",
  "--popover": "0 0% 12%",
  "--popover-foreground": "0 0% 98%",
  "--primary": "0 0% 22%",
  "--primary-foreground": "0 0% 98%",
  "--secondary": "0 0% 17%",
  "--secondary-foreground": "0 0% 96%",
  "--muted": "0 0% 17%",
  "--muted-foreground": "0 0% 72%",
  "--accent": "0 0% 34%",
  "--accent-foreground": "0 0% 98%",
  "--destructive": "0 65% 52%",
  "--destructive-foreground": "0 0% 100%",
  "--border": "0 0% 26%",
  "--input": "0 0% 26%",
  "--ring": "213 90% 62%",
  "--chart-1": "213 90% 62%",
  "--chart-2": "0 0% 70%",
  "--chart-3": "0 0% 45%",
  "--chart-4": "0 0% 62%",
  "--chart-5": "0 0% 55%",
  "--sidebar-background": "0 0% 10%",
  "--sidebar-foreground": "0 0% 96%",
  "--sidebar-primary": "0 0% 94%",
  "--sidebar-primary-foreground": "0 0% 9%",
  "--sidebar-accent": "0 0% 16%",
  "--sidebar-accent-foreground": "0 0% 96%",
  "--sidebar-border": "0 0% 22%",
  "--sidebar-ring": "213 90% 62%",
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
      "--muted-foreground": "240 4% 46%",
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
      "--muted-foreground": "240 5% 70%",
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
  { id: "azul", label: "Azul clássico", preview: "from-blue-600 to-blue-800" },
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
