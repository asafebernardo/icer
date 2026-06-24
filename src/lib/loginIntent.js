/** Mantém /login acessível quando o utilizador abre o site por esse caminho. */
export const LOGIN_INTENT_KEY = "icer_login_intent";

export function setLoginIntent() {
  try {
    sessionStorage.setItem(LOGIN_INTENT_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function clearLoginIntent() {
  try {
    sessionStorage.removeItem(LOGIN_INTENT_KEY);
  } catch {
    /* ignore */
  }
}

export function hasLoginIntent() {
  try {
    return sessionStorage.getItem(LOGIN_INTENT_KEY) === "1";
  } catch {
    return false;
  }
}

function browserWantsLogin() {
  if (typeof window === "undefined") return false;
  const p = window.location.pathname;
  return p === "/login" || p === "/Login";
}

/** Chamado o mais cedo possível na carga da aplicação. */
export function captureLoginIntentFromBrowserUrl() {
  if (browserWantsLogin()) {
    setLoginIntent();
  }
}

export function isLoginPath(pathname) {
  return pathname === "/login" || pathname === "/Login";
}
