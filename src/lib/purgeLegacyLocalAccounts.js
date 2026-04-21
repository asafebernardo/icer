/**
 * Limpa contas antigas criadas só no navegador (antes do MongoDB).
 * Mantém (opcionalmente) o admin demo do .env.
 */

const LOCAL_ACCOUNTS_KEY = "icer_local_accounts";

function safeJsonParse(raw) {
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function purgeLegacyLocalAccounts({ keepEmails = [] } = {}) {
  if (typeof window === "undefined") return { removed: 0, kept: 0 };

  const keep = new Set(
    (Array.isArray(keepEmails) ? keepEmails : [])
      .map((e) => String(e || "").toLowerCase().trim())
      .filter(Boolean),
  );

  const raw = localStorage.getItem(LOCAL_ACCOUNTS_KEY);
  const list = safeJsonParse(raw);
  if (!Array.isArray(list) || list.length === 0) {
    // Também remove snapshot legado que às vezes existia.
    try {
      localStorage.removeItem("users");
    } catch {
      /* ignore */
    }
    return { removed: 0, kept: 0 };
  }

  const next = [];
  let kept = 0;
  let removed = 0;
  for (const acc of list) {
    const email = String(acc?.email || "").toLowerCase().trim();
    if (email && keep.has(email)) {
      next.push(acc);
      kept += 1;
    } else {
      removed += 1;
    }
  }

  try {
    if (next.length > 0) {
      localStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(next));
    } else {
      localStorage.removeItem(LOCAL_ACCOUNTS_KEY);
    }
    // Remove snapshot legado usado por versões antigas
    localStorage.removeItem("users");
  } catch {
    /* ignore */
  }

  return { removed, kept };
}

