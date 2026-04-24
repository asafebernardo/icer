/**
 * Integridade opcional do objeto `user` em localStorage (FNV-1a + segredo em env).
 * Não substitui validação no servidor — apenas dificulta alteração casual do JSON.
 */

const STORAGE_KEY = "user";
const WRAPPER = 1;

function getSessionSecret() {
  return (import.meta.env.VITE_CLIENT_SESSION_SECRET || "").trim();
}

/** Hash determinístico (hex) — síncrono para compatível com getUser() síncrono. */
export function hashSessionPayload(payload, secret) {
  const s = String(secret) + "\0" + String(payload);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

function stableUserPayload(user) {
  const email = String(user?.email || "").toLowerCase().trim();
  const role = String(user?.role || "");
  const full_name = String(user?.full_name || "");
  const avatar_url = String(user?.avatar_url || "").trim();
  if (avatar_url) {
    return JSON.stringify({ email, role, full_name, avatar_url });
  }
  return JSON.stringify({ email, role, full_name });
}

export function persistSessionUser(user) {
  if (!user || typeof user !== "object") return;
  const secret = getSessionSecret();
  if (!secret) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    return;
  }
  const payload = { ...user };
  const sig = hashSessionPayload(stableUserPayload(payload), secret);
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      _v: WRAPPER,
      payload,
      sig,
    }),
  );
}

/**
 * Lê utilizador; se VITE_CLIENT_SESSION_SECRET estiver definido, rejeita dados legíveis sem assinatura ou com assinatura inválida.
 */
export function readSessionUser() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const secret = getSessionSecret();

    if (parsed && typeof parsed === "object" && parsed._v === WRAPPER && parsed.payload) {
      if (!secret) {
        return parsed.payload;
      }
      const expect = hashSessionPayload(stableUserPayload(parsed.payload), secret);
      if (expect !== parsed.sig) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }
      return parsed.payload;
    }

    if (secret) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function clearSessionUser() {
  localStorage.removeItem(STORAGE_KEY);
}
