import { isServerAuthEnabled } from "@/lib/serverAuth";
import { withCsrfHeaderAsync } from "@/lib/csrf";

export const PUBLIC_WORKSPACE_QUERY_KEY = ["public-workspace"];

export async function fetchPublicWorkspaceJson() {
  const r = await fetch("/api/public-workspace", {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (!r.ok) {
    const t = await r.text().catch(() => "");
    throw new Error(t || `HTTP ${r.status}`);
  }
  return r.json();
}

export async function postDismissDestaqueEvento(id) {
  const sid = String(id || "").trim();
  if (!/^\d+$/.test(sid)) return null;
  const r = await fetch("/api/public-workspace/dismiss-destaque", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ id: sid }),
  });
  if (!r.ok) {
    const t = await r.text().catch(() => "");
    throw new Error(t || `HTTP ${r.status}`);
  }
  return r.json();
}

export async function putAdminPublicWorkspace(patch) {
  const r = await fetch("/api/admin/public-workspace", {
    method: "PUT",
    credentials: "include",
    headers: await withCsrfHeaderAsync({
      "Content-Type": "application/json",
      Accept: "application/json",
    }),
    body: JSON.stringify(patch && typeof patch === "object" ? patch : {}),
  });
  if (!r.ok) {
    let msg = `HTTP ${r.status}`;
    try {
      const j = await r.json();
      if (j?.message) msg = String(j.message);
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  return r.json();
}

export async function putAgendaSugestoesRemote(agenda_sugestoes) {
  const r = await fetch("/api/public-workspace/agenda-sugestoes", {
    method: "PUT",
    credentials: "include",
    headers: await withCsrfHeaderAsync({
      "Content-Type": "application/json",
      Accept: "application/json",
    }),
    body: JSON.stringify({ agenda_sugestoes }),
  });
  if (!r.ok) {
    let msg = `HTTP ${r.status}`;
    try {
      const j = await r.json();
      if (j?.message) msg = String(j.message);
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  return r.json();
}

export function shouldUseRemotePublicWorkspace() {
  return isServerAuthEnabled();
}

/**
 * @param {Record<string, string[]>} defaults
 * @param {unknown} remote
 */
export function mergeRemoteAgendaSugestoes(defaults, remote) {
  const base =
    defaults && typeof defaults === "object"
      ? { ...defaults }
      : {};
  const ext = remote && typeof remote === "object" ? remote : {};
  const merged = { ...base, ...ext };
  for (const key of Object.keys(base)) {
    if (!Array.isArray(merged[key]) || merged[key].length === 0) {
      merged[key] = [...(base[key] || [])];
    }
  }
  return merged;
}
