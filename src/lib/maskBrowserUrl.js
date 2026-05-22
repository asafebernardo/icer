/** Rotas em que o path pode permanecer visível (acesso direto / convites). */
const UNMASKED_PATHS = new Set(["/login", "/Login", "/accept-invite"]);

export function shouldMaskBrowserUrl(pathname) {
  return !UNMASKED_PATHS.has(pathname);
}

/** URL exibida na barra de endereço (apenas origem + `/`). */
export function publicRootUrl() {
  if (typeof window === "undefined") return "/";
  return `${window.location.origin}/`;
}

/** Substitui o endereço visível por só o domínio (sem path nem query). */
export function maskBrowserUrl(pathname) {
  if (typeof window === "undefined") return;
  if (!shouldMaskBrowserUrl(pathname)) return;
  const target = publicRootUrl();
  if (window.location.href !== target) {
    window.history.replaceState(window.history.state, "", "/");
  }
}
