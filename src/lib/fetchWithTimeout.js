/** Timeout padrão para pedidos críticos de arranque (ms). */
export const DEFAULT_FETCH_TIMEOUT_MS = 12_000;

/**
 * `fetch` com abort automático — evita página presa quando a API está offline.
 * @param {string | URL | Request} input
 * @param {RequestInit} [init]
 * @param {number} [timeoutMs]
 */
export async function fetchWithTimeout(
  input,
  init = {},
  timeoutMs = DEFAULT_FETCH_TIMEOUT_MS,
) {
  const ms =
    Number.isFinite(timeoutMs) && timeoutMs > 0
      ? timeoutMs
      : DEFAULT_FETCH_TIMEOUT_MS;
  const controller = new AbortController();
  const outerSignal = init.signal;
  const onOuterAbort = () => controller.abort(outerSignal?.reason);
  if (outerSignal) {
    if (outerSignal.aborted) {
      controller.abort(outerSignal.reason);
    } else {
      outerSignal.addEventListener("abort", onOuterAbort, { once: true });
    }
  }
  const timer = window.setTimeout(() => controller.abort(new Error("fetch_timeout")), ms);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timer);
    if (outerSignal) outerSignal.removeEventListener("abort", onOuterAbort);
  }
}
