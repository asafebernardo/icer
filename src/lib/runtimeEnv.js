/** Ambiente de runtime exposto pelo servidor (`GET /api/health`) + fallback do `.env` no Vite. */

let cache = null;
let inflight = null;

function readHomologFromVite() {
  const v = String(import.meta.env.VITE_ICER_HOMOLOG ?? "").trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes" || v === "on";
}

function normalizeRuntimeEnv(body = {}) {
  const fromApi = body?.is_homolog === true;
  return Object.freeze({
    isHomolog: fromApi || readHomologFromVite(),
    icerEnv: String(body?.icer_env || "").trim(),
  });
}

const EMPTY = normalizeRuntimeEnv({});

export async function fetchRuntimeEnv() {
  if (cache) return cache;
  if (!inflight) {
    inflight = fetch("/api/health", { credentials: "include", cache: "no-store" })
      .then(async (r) => (r.ok ? r.json() : {}))
      .then((body) => {
        cache = normalizeRuntimeEnv(body);
        return cache;
      })
      .catch(() => {
        cache = normalizeRuntimeEnv({});
        return cache;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

export function getRuntimeEnvSync() {
  return cache ?? EMPTY;
}

/** Força nova leitura (ex.: após reiniciar o servidor). */
export function invalidateRuntimeEnvCache() {
  cache = null;
  inflight = null;
}
