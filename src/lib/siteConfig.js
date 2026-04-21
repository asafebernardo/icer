// Utilitário para salvar/carregar configurações visuais do site no localStorage
const KEY = "icer_site_config";

/** Ícone da aba quando não há logo personalizada (alinhado ao fallback da navbar). */
export const DEFAULT_SITE_FAVICON = "/favicon.svg";

const FAVICON_LINK_ID = "icer-site-favicon";
const APPLE_TOUCH_ID = "icer-site-apple-touch-icon";

function faviconMimeForUrl(url) {
  const u = (url || "").toLowerCase();
  if (u.startsWith("data:image/svg") || u.includes("svg+xml") || u.endsWith(".svg"))
    return "image/svg+xml";
  if (u.startsWith("data:image/webp") || u.endsWith(".webp")) return "image/webp";
  if (u.startsWith("data:image/jpeg") || u.endsWith(".jpg") || u.endsWith(".jpeg"))
    return "image/jpeg";
  return "image/png";
}

/**
 * Atualiza favicon e apple-touch-icon para a mesma URL da logo do site (navbar/rodapé).
 */
export function syncDocumentBrandingFromSiteConfig(config) {
  if (typeof document === "undefined") return;
  const raw =
    config && typeof config.logoUrl === "string" ? config.logoUrl.trim() : "";
  const href = raw || DEFAULT_SITE_FAVICON;
  const type = raw ? faviconMimeForUrl(raw) : "image/svg+xml";

  let icon = document.getElementById(FAVICON_LINK_ID);
  if (!icon) {
    icon = document.createElement("link");
    icon.id = FAVICON_LINK_ID;
    icon.rel = "icon";
    document.head.appendChild(icon);
  }
  icon.type = type;
  icon.href = href;

  let apple = document.getElementById(APPLE_TOUCH_ID);
  if (!apple) {
    apple = document.createElement("link");
    apple.id = APPLE_TOUCH_ID;
    apple.rel = "apple-touch-icon";
    document.head.appendChild(apple);
  }
  apple.href = href;
}

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
    syncDocumentBrandingFromSiteConfig(next);
  }
}
