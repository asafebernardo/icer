// Configurações visuais do site.
// IMPORTANTE: o objetivo é que sejam públicas (persistidas no servidor),
// com cache local apenas para inicialização mais rápida.
import { withCsrfHeaderAsync } from "@/lib/csrf";

const KEY = "icer_site_config";
const SERVER_CACHE_KEY = "icer_site_config_server_cache";

/** Ícone da aba quando não há logo personalizada (alinhado ao fallback da navbar). */
export const DEFAULT_SITE_FAVICON = "/favicon.svg";

/** Logo da navbar/rodapé quando `logoUrl` está vazio — ficheiro estático em `public/`. */
export const DEFAULT_SITE_LOGO_URL = "/logo-default.png";

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
  const href = raw || DEFAULT_SITE_LOGO_URL;
  const type = faviconMimeForUrl(href);

  let icon = document.getElementById(FAVICON_LINK_ID);
  if (!icon) {
    icon = /** @type {HTMLLinkElement} */ (document.createElement("link"));
    icon.id = FAVICON_LINK_ID;
    /** @type {HTMLLinkElement} */ (icon).rel = "icon";
    document.head.appendChild(icon);
  }
  /** @type {HTMLLinkElement} */ (icon).type = type;
  /** @type {HTMLLinkElement} */ (icon).href = href;

  let apple = document.getElementById(APPLE_TOUCH_ID);
  if (!apple) {
    apple = /** @type {HTMLLinkElement} */ (document.createElement("link"));
    apple.id = APPLE_TOUCH_ID;
    /** @type {HTMLLinkElement} */ (apple).rel = "apple-touch-icon";
    document.head.appendChild(apple);
  }
  /** @type {HTMLLinkElement} */ (apple).href = href;
}

export function getSiteConfig() {
  // Preferir cache do servidor (config pública), com fallback para o legado local.
  try {
    const cached = localStorage.getItem(SERVER_CACHE_KEY);
    if (cached) return JSON.parse(cached || "{}");
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}

export function setSiteConfig(updates) {
  const current = getSiteConfig();
  const next = { ...current, ...updates };
  try {
    // Mantém compatibilidade com leituras antigas.
    localStorage.setItem(KEY, JSON.stringify(next));
    // Cache “público” local (espelha o que vem do servidor).
    localStorage.setItem(SERVER_CACHE_KEY, JSON.stringify(next));
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

export async function refreshPublicSiteConfig() {
  const r = await fetch("/api/site-config", {
    method: "GET",
    // Evita ficar preso em caches intermediários.
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (!r.ok) throw new Error("Não foi possível carregar a configuração do site.");
  const cfg = (await r.json()) || {};
  try {
    localStorage.setItem(SERVER_CACHE_KEY, JSON.stringify(cfg));
    // mantém também o legado
    localStorage.setItem(KEY, JSON.stringify(cfg));
  } catch {
    // ignore
  }
  // Dispara atualização reativa e sincroniza branding.
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("icer-site-config", { detail: cfg }));
    syncDocumentBrandingFromSiteConfig(cfg);
  }
  return cfg;
}

export async function savePublicSiteConfigAdmin(updates) {
  const r = await fetch("/api/admin/site-config", {
    method: "PUT",
    credentials: "include",
    headers: await withCsrfHeaderAsync({
      "Content-Type": "application/json",
      Accept: "application/json",
    }),
    body: JSON.stringify(updates || {}),
  });
  const text = await r.text();
  let parsed = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }
  if (!r.ok) {
    const msg = parsed?.message || "Não foi possível salvar a configuração.";
    throw new Error(msg);
  }
  const cfg = parsed?.config && typeof parsed.config === "object" ? parsed.config : parsed;
  // Persistir localmente para refletir imediatamente.
  try {
    localStorage.setItem(SERVER_CACHE_KEY, JSON.stringify(cfg || {}));
    localStorage.setItem(KEY, JSON.stringify(cfg || {}));
  } catch {
    // ignore
  }
  setSiteConfig(cfg || {});
  return cfg || {};
}
