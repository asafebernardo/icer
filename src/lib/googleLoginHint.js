/** E-mail da última conta Google usada com sucesso (sobrevive ao logout do site). */
const STORAGE_KEY = "icer_google_login_hint";

export function getGoogleLoginHint() {
  if (typeof window === "undefined") return "";
  try {
    return String(localStorage.getItem(STORAGE_KEY) || "")
      .toLowerCase()
      .trim();
  } catch {
    return "";
  }
}

export function setGoogleLoginHint(email) {
  if (typeof window === "undefined") return;
  const hint = String(email || "").toLowerCase().trim();
  if (!hint || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(hint)) return;
  try {
    localStorage.setItem(STORAGE_KEY, hint);
  } catch {
    /* quota / modo privado */
  }
}

export function clearGoogleLoginHint() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Espelha o e-mail devolvido pelo servidor (`remembered_email`). */
export function syncGoogleLoginHintFromServer(email) {
  if (email) setGoogleLoginHint(email);
}

export async function forgetGoogleLoginHintOnServer() {
  clearGoogleLoginHint();
  try {
    await fetch("/api/auth/google-login/forget-hint", {
      method: "POST",
      credentials: "include",
    });
  } catch {
    /* cookie pode expirar sozinho */
  }
}

/**
 * @param {{ pickAccount?: boolean; noSilent?: boolean }} [opts]
 */
export function buildGoogleLoginStartUrl(opts = {}) {
  const params = new URLSearchParams();
  const hint = getGoogleLoginHint();
  if (opts.pickAccount) {
    params.set("pick_account", "1");
  } else if (hint) {
    params.set("login_hint", hint);
  }
  if (opts.noSilent) {
    params.set("no_silent", "1");
  }
  const q = params.toString();
  return q ? `/api/auth/google-login/start?${q}` : "/api/auth/google-login/start";
}
