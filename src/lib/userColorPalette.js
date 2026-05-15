import { DEFAULT_PALETTE_ID, PALETTE_IDS } from "@/lib/colorPalettes";

function storageKey(userId) {
  if (userId != null && String(userId).trim() !== "") {
    return `icer_user_color_palette_u_${String(userId)}`;
  }
  return "icer_user_color_palette_anon";
}

/**
 * Paleta de cor da interface escolhida pelo utilizador (localStorage, por conta).
 * Não faz parte da configuração pública do site.
 * @param {string|number|null|undefined} userId
 */
export function getUserColorPalette(userId) {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (raw && PALETTE_IDS.includes(raw)) return raw;
  } catch {
    /* ignore */
  }
  return DEFAULT_PALETTE_ID;
}

/**
 * @param {string|number|null|undefined} userId
 * @param {string} paletteId
 */
export function setUserColorPalette(userId, paletteId) {
  if (!PALETTE_IDS.includes(paletteId)) return;
  try {
    localStorage.setItem(storageKey(userId), paletteId);
  } catch {
    /* ignore */
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("icer-user-color-palette", { detail: { paletteId, userId } }),
    );
  }
}
