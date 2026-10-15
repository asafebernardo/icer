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

function withTimeout(promise, ms, code) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(code)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function whenRecaptchaReady(grecaptcha) {
  return withTimeout(
    new Promise((resolve) => {
      grecaptcha.ready(() => resolve(grecaptcha));
    }),
    12000,
    "recaptcha_timeout",
  );
}

/**
 * @param {string} siteKey
 */
export function loadRecaptchaV3(siteKey) {
  if (typeof window === "undefined" || !siteKey) {
    return Promise.resolve(null);
  }
  if (window.grecaptcha?.execute) {
    return whenRecaptchaReady(window.grecaptcha);
  }
  if (!loadPromise) {
    loadPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        if (!window.grecaptcha) {
          loadPromise = null;
          reject(new Error("recaptcha_unavailable"));
          return;
        }
        whenRecaptchaReady(window.grecaptcha).then(resolve, (err) => {
          loadPromise = null;
          reject(err);
        });
      };
      script.onerror = () => {
        loadPromise = null;
        reject(new Error("recaptcha_load_failed"));
      };
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
  return withTimeout(
    grecaptcha.execute(cfg.site_key, { action }),
    12000,
    "recaptcha_timeout",
  );
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
  if (c === "recaptcha_load_failed" || c === "recaptcha_unavailable") {
    return "O reCAPTCHA não carregou. Permita scripts do Google e tente novamente.";
  }
  if (c === "recaptcha_timeout") {
    return "O reCAPTCHA demorou demais a responder. Recarregue a página e tente novamente.";
  }
  return "";
}
