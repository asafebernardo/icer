/** Mantém /login acessível quando o utilizador abre o site por esse caminho. */
export const LOGIN_INTENT_KEY = "icer_login_intent";

/** Query: `/?icer_admin_login=1` abre a página de login (e-mail/palavra-passe no mobile). */
export const LOGIN_QUERY_FLAG = "icer_admin_login";

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
  if (p === "/login" || p === "/Login") return true;
  try {
    return (
      new URLSearchParams(window.location.search).get(LOGIN_QUERY_FLAG) === "1"
    );
  } catch {
    return false;
  }
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
