/**
 * Compatibilidade legada — a paleta de interface segue `siteTheme.js`.
 */

import { applySiteTheme, getActiveSiteTheme } from "@/lib/siteTheme";

export const DEFAULT_PALETTE_ID = "original";

export const PALETTE_IDS = ["original"];

export const PALETTE_OPTIONS = [{ id: "original", label: "Original" }];

/**
 * @param {string} [_paletteId]
 */
export function applySiteColorPalette(_paletteId) {
  if (typeof document === "undefined") return;
  applySiteTheme(document.documentElement, getActiveSiteTheme());
}
