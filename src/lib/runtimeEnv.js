/** Ambiente de runtime exposto pelo servidor (`GET /api/health`) + fallback do `.env` no Vite. */

import { fetchWithTimeout } from "@/lib/fetchWithTimeout";

let cache = null;
let inflight = null;

function readHomologFromVite() {
  const v = String(import.meta.env.VITE_ICER_HOMOLOG ?? "").trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes" || v === "on";
}

function normalizeRuntimeEnv(body = {}, { useViteFallback = false } = {}) {
  const hasApiHomologFlag =
    body && typeof body === "object" && Object.prototype.hasOwnProperty.call(body, "is_homolog");
  return Object.freeze({
    isHomolog: hasApiHomologFlag
      ? body.is_homolog === true
      : useViteFallback && readHomologFromVite(),
    icerEnv: String(body?.icer_env || "").trim(),
  });
}

const EMPTY = normalizeRuntimeEnv({});

export async function fetchRuntimeEnv() {
  if (cache) return cache;
  if (!inflight) {
    inflight = fetchWithTimeout("/api/health", { credentials: "include", cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) return { body: {}, useViteFallback: true };
        const body = await r.json();
        return { body, useViteFallback: false };
      })
      .then(({ body, useViteFallback }) => {
        cache = normalizeRuntimeEnv(body, { useViteFallback });
        return cache;
      })
      .catch(() => {
        cache = normalizeRuntimeEnv({}, { useViteFallback: true });
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
