/** Variáveis de ambiente partilhadas (homologação, cookies, flags booleanas). */

export function envBoolTrue(name) {
  const v = process.env[name];
  if (v === undefined || v === null || String(v).trim() === "") return false;
  const s = String(v).trim().toLowerCase();
  return ["1", "true", "yes", "on"].includes(s);
}

/** Homologação / staging: políticas de login mais permissivas. */
export function isHomologEnvironment() {
  const homologEnvRaw = String(process.env.ICER_ENV || "").trim().toLowerCase();
  return (
    envBoolTrue("ICER_HOMOLOG") ||
    ["homolog", "homologacao", "homologação", "staging", "hml"].includes(homologEnvRaw)
  );
}

/**
 * Cookie `Secure` em produção. Em homologação com `ICER_PUBLIC_BASE_URL` em HTTP,
 * não exige HTTPS (evita sessão que «entra» mas `/api/auth/me` devolve 401).
 * Override explícito: `ICER_COOKIE_SECURE=true|false`.
 */
export function readCookieSecureFlag() {
  const raw = process.env.ICER_COOKIE_SECURE;
  if (raw !== undefined && raw !== null && String(raw).trim() !== "") {
    return envBoolTrue("ICER_COOKIE_SECURE");
  }
  if (process.env.NODE_ENV !== "production") return false;
  if (isHomologEnvironment()) {
    const base = String(process.env.ICER_PUBLIC_BASE_URL || "").trim().toLowerCase();
    if (base.startsWith("http://")) return false;
  }
  return true;
}

export function sessionCookieOptions(maxAgeSeconds) {
  const opts = {
    httpOnly: true,
    sameSite: "lax",
    secure: readCookieSecureFlag(),
    path: "/",
  };
  if (
    maxAgeSeconds != null &&
    Number.isFinite(Number(maxAgeSeconds)) &&
    Number(maxAgeSeconds) > 0
  ) {
    // Express/cookie `maxAge` é em milissegundos; a API do ICER recebe segundos.
    opts.maxAge = Math.floor(Number(maxAgeSeconds) * 1000);
  }
  return opts;
}
