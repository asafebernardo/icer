const CSRF_COOKIE = "icer_csrf";

function readCookie(name) {
  if (typeof document === "undefined") return "";
  const raw = document.cookie || "";
  const parts = raw.split(";").map((p) => p.trim());
  for (const p of parts) {
    if (!p) continue;
    const eq = p.indexOf("=");
    if (eq < 0) continue;
    const k = p.slice(0, eq);
    if (k !== name) continue;
    return decodeURIComponent(p.slice(eq + 1));
  }
  return "";
}

export function getCsrfToken() {
  return readCookie(CSRF_COOKIE);
}

export function withCsrfHeader(headers = {}) {
  const t = getCsrfToken();
  if (!t) return headers;
  return { ...headers, "X-CSRF-Token": t };
}

