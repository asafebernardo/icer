/** Acções reCAPTCHA v3 — devem coincidir com `server/recaptcha.js`. */
export const RECAPTCHA_ACTIONS = {
  SITE_ACCESS: "site_access",
  LOGIN: "login",
  GOOGLE_LOGIN: "google_login",
};

/** @typedef {{ enabled?: boolean; site_key?: string | null; version?: "v3" | "v2" | null; enforced?: boolean }} RecaptchaPublicConfig */

let cachedConfig = /** @type {RecaptchaPublicConfig | null} */ (null);
let loadPromise = null;

export function getRecaptchaConfig() {
  return cachedConfig || { enabled: false, site_key: null, version: null, enforced: false };
}

export function isRecaptchaEnabled() {
  const { enabled, site_key: siteKey } = getRecaptchaConfig();
  return Boolean(enabled && siteKey);
}

import { fetchWithTimeout } from "@/lib/fetchWithTimeout";

export async function refreshRecaptchaConfig() {
  try {
    const r = await fetchWithTimeout("/api/recaptcha/config", {
      method: "GET",
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!r.ok) {
      cachedConfig = { enabled: false, site_key: null, version: null, enforced: false };
      return cachedConfig;
    }
    cachedConfig = (await r.json()) || { enabled: false };
    return cachedConfig;
  } catch {
    cachedConfig = { enabled: false, site_key: null, version: null, enforced: false };
    return cachedConfig;
  }
}

/**
 * @param {string} siteKey
 */
export function loadRecaptchaV3(siteKey) {
  if (typeof window === "undefined" || !siteKey) {
    return Promise.resolve(null);
  }
  if (window.grecaptcha?.execute) {
    return new Promise((resolve) => {
      window.grecaptcha.ready(() => resolve(window.grecaptcha));
    });
  }
  if (!loadPromise) {
    loadPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        if (!window.grecaptcha) {
          reject(new Error("recaptcha_unavailable"));
          return;
        }
        window.grecaptcha.ready(() => resolve(window.grecaptcha));
      };
      script.onerror = () => reject(new Error("recaptcha_load_failed"));
      document.head.appendChild(script);
    });
  }
  return loadPromise;
}

/**
 * @param {string} [action="submit"]
 * @returns {Promise<string | null>}
 */
export async function executeRecaptcha(action = "submit") {
  const cfg = getRecaptchaConfig();
  if (!cfg.enabled || !cfg.site_key || cfg.version === "v2") return null;
  const grecaptcha = await loadRecaptchaV3(cfg.site_key);
  if (!grecaptcha?.execute) return null;
  return grecaptcha.execute(cfg.site_key, { action });
}

export function recaptchaErrorMessagePt(code) {
  const c = String(code || "");
  if (c === "recaptcha_required" || c === "recaptcha_invalid") {
    return "Verificação de segurança falhou. Recarregue a página e tente novamente.";
  }
  if (c === "recaptcha_low_score") {
    return "Não foi possível confirmar que é humano. Tente novamente.";
  }
  if (c === "recaptcha_unreachable" || c === "recaptcha_not_configured") {
    return "Serviço de verificação indisponível. Tente mais tarde.";
  }
  return "";
}
