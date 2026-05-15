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
 * @param {Record<string, unknown>} defaults
 * @param {unknown} remote
 */
export function mergeRemoteAgendaSugestoes(defaults, remote) {
  const base =
    defaults && typeof defaults === "object"
      ? { ...defaults }
      : {};
  const ext = remote && typeof remote === "object" ? remote : {};
  const merged = { ...base, ...ext };
  const baseAv =
    base.preletor_avatars && typeof base.preletor_avatars === "object"
      ? base.preletor_avatars
      : {};
  const extAv =
    ext.preletor_avatars && typeof ext.preletor_avatars === "object"
      ? ext.preletor_avatars
      : {};
  merged.preletor_avatars = { ...baseAv, ...extAv };
  const basePastorAv =
    base.pastor_avatars && typeof base.pastor_avatars === "object"
      ? base.pastor_avatars
      : {};
  const extPastorAv =
    ext.pastor_avatars && typeof ext.pastor_avatars === "object"
      ? ext.pastor_avatars
      : {};
  merged.pastor_avatars = { ...basePastorAv, ...extPastorAv };
  const baseTituloCor =
    base.titulo_cor_barra && typeof base.titulo_cor_barra === "object"
      ? base.titulo_cor_barra
      : {};
  const extTituloCor =
    ext.titulo_cor_barra && typeof ext.titulo_cor_barra === "object"
      ? ext.titulo_cor_barra
      : {};
  merged.titulo_cor_barra = { ...baseTituloCor, ...extTituloCor };
  const baseTituloImg =
    base.titulo_imagens_fundo && typeof base.titulo_imagens_fundo === "object"
      ? base.titulo_imagens_fundo
      : {};
  const extTituloImg =
    ext.titulo_imagens_fundo && typeof ext.titulo_imagens_fundo === "object"
      ? ext.titulo_imagens_fundo
      : {};
  merged.titulo_imagens_fundo = { ...baseTituloImg, ...extTituloImg };
  for (const key of Object.keys(base)) {
    if (
      key === "preletor_avatars" ||
      key === "pastor_avatars" ||
      key === "titulo_cor_barra" ||
      key === "titulo_imagens_fundo"
    )
      continue;
    if (!Array.isArray(merged[key]) || merged[key].length === 0) {
      merged[key] = Array.isArray(base[key]) ? [...base[key]] : [];
    }
  }
  /* Arrays não vazios de `remote` mantêm a ordem definida no admin. */
  return merged;
}
