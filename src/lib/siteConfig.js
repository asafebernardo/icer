// Utilitário para salvar/carregar configurações visuais do site no localStorage
const KEY = "icer_site_config";

export function getSiteConfig() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}

export function setSiteConfig(updates) {
  const current = getSiteConfig();
  const next = { ...current, ...updates };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch (e) {
    const quota =
      e?.name === "QuotaExceededError" ||
      e?.code === 22 ||
      e?.code === "QuotaExceededError";
    if (quota) {
      throw new Error(
        "Armazenamento do navegador cheio (quota). Reduza imagens em hero, fundos ou cartões, ou limpe os dados deste site nas definições do navegador.",
      );
    }
    throw e;
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("icer-site-config", { detail: next }));
  }
}
