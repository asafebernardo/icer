/** Rota do aplicativo. Não entra no menu de páginas do site. */
export const COLETANEA_PATH = "/louvor";

const ENTRY_KEY = "icer_coletanea_entry";

export function isColetaneaPath(pathname) {
  const path = String(pathname || "").split("?")[0];
  return path === COLETANEA_PATH || path.startsWith(`${COLETANEA_PATH}/`);
}

export function coletaneaOpenedFromSite() {
  try {
    return sessionStorage.getItem(ENTRY_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Abre o aplicativo a partir do menu do site.
 * A página inicial do site permanece no histórico do navegador.
 */
export function openColetaneaApp() {
  try {
    sessionStorage.setItem(ENTRY_KEY, "1");
  } catch {
    /* ignore */
  }
  window.location.assign(COLETANEA_PATH);
}
