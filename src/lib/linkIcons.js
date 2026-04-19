/**
 * Favicon automático (vários fallbacks) e ícone manual em Links Úteis.
 */

export function getHostnameFromPageUrl(urlString) {
  if (!urlString || typeof urlString !== "string") return null;
  try {
    let u = urlString.trim();
    if (!u) return null;
    if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
    const parsed = new URL(u);
    return parsed.hostname || null;
  } catch {
    return null;
  }
}

/** Vários URLs a tentar em <img onError> (Google é bloqueado por muitos adblockers). */
export function faviconCandidateUrlsForHostname(hostname) {
  if (!hostname) return [];
  const h = hostname;
  return [
    `https://icons.duckduckgo.com/ip3/${h}.ico`,
    `https://www.google.com/s2/favicons?domain=${encodeURIComponent(h)}&sz=64`,
    `https://${h}/favicon.ico`,
  ];
}

/**
 * Lista de URLs de imagem a tentar em ordem: ícone manual; senão favicons do domínio.
 */
export function resolveLinkIconCandidates(link) {
  const custom =
    typeof link?.icone_url === "string" ? link.icone_url.trim() : "";
  if (custom) return [custom];
  const host = getHostnameFromPageUrl(link?.url);
  return faviconCandidateUrlsForHostname(host);
}
