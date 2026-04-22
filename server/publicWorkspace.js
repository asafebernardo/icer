import { nowIso } from "./security.js";

const KEY = "public_workspace_v1";

const MAX_DISMISSED = 400;
const MAX_SUGESTAO_ITEM_LEN = 160;
const MAX_SUGESTAO_LIST = 80;

function sanitizeDismissedIds(arr) {
  if (!Array.isArray(arr)) return [];
  const out = [];
  const seen = new Set();
  for (const x of arr) {
    const s = String(x || "").trim();
    if (!/^\d{1,18}$/.test(s)) continue;
    if (seen.has(s)) continue;
    seen.add(s);
    out.push(s);
    if (out.length >= MAX_DISMISSED) break;
  }
  return out;
}

function sanitizeAgendaSugestoes(raw) {
  if (!raw || typeof raw !== "object") return null;
  /** @type {Record<string, string[]>} */
  const out = {};
  for (const [k, v] of Object.entries(raw)) {
    const key = String(k || "").slice(0, 40);
    if (!key) continue;
    if (!Array.isArray(v)) continue;
    const list = [];
    for (const item of v) {
      const s = String(item ?? "").trim().slice(0, MAX_SUGESTAO_ITEM_LEN);
      if (!s) continue;
      list.push(s);
      if (list.length >= MAX_SUGESTAO_LIST) break;
    }
    if (list.length) out[key] = list;
  }
  return Object.keys(out).length ? out : null;
}

function sanitizeMemberMenuPalettes(raw) {
  if (!raw || typeof raw !== "object") return {};
  /** @type {Record<string, boolean>} */
  const out = {};
  for (const [k, v] of Object.entries(raw)) {
    const key = String(k || "").slice(0, 64);
    if (!key) continue;
    out[key] = !!v;
  }
  return out;
}

function sanitizeDashboardMenus(raw) {
  if (!Array.isArray(raw)) return null;
  const out = [];
  for (const m of raw) {
    if (!m || typeof m !== "object") continue;
    const key = String(m.key || "").trim().slice(0, 64);
    const label = String(m.label || "").trim().slice(0, 120);
    if (!key || !label) continue;
    out.push({ key, label });
    if (out.length > 40) break;
  }
  return out.length ? out : null;
}

/**
 * @param {import("mongodb").Db} db
 */
export async function getPublicWorkspace(db) {
  const row = await db.collection("app_kv").findOne({ key: KEY });
  const v = row?.value && typeof row.value === "object" ? row.value : {};
  return {
    agenda_sugestoes: sanitizeAgendaSugestoes(v.agenda_sugestoes),
    dashboard_site_menus: sanitizeDashboardMenus(v.dashboard_site_menus),
    member_menu_palettes: sanitizeMemberMenuPalettes(v.member_menu_palettes),
    evento_destaque_dismissed_ids: sanitizeDismissedIds(v.evento_destaque_dismissed_ids),
    updated_at: row?.updated_at || null,
  };
}

/**
 * @param {import("mongodb").Db} db
 * @param {Record<string, unknown>} patch
 */
export async function mergePublicWorkspaceAdmin(db, patch) {
  const curRow = await db.collection("app_kv").findOne({ key: KEY });
  const cur =
    curRow?.value && typeof curRow.value === "object" ? { ...curRow.value } : {};
  const next = { ...cur };
  if ("agenda_sugestoes" in patch) {
    next.agenda_sugestoes = sanitizeAgendaSugestoes(patch.agenda_sugestoes);
  }
  if ("dashboard_site_menus" in patch) {
    next.dashboard_site_menus = sanitizeDashboardMenus(patch.dashboard_site_menus);
  }
  if ("member_menu_palettes" in patch) {
    next.member_menu_palettes = sanitizeMemberMenuPalettes(patch.member_menu_palettes);
  }
  if ("evento_destaque_dismissed_ids" in patch) {
    next.evento_destaque_dismissed_ids = sanitizeDismissedIds(
      patch.evento_destaque_dismissed_ids,
    );
  }
  const now = nowIso();
  await db.collection("app_kv").updateOne(
    { key: KEY },
    { $set: { key: KEY, value: next, updated_at: now } },
    { upsert: true },
  );
  return getPublicWorkspace(db);
}

/**
 * @param {import("mongodb").Db} db
 * @param {Record<string, unknown>} agendaSugestoes
 */
export async function setAgendaSugestoesEditor(db, agendaSugestoes) {
  const curRow = await db.collection("app_kv").findOne({ key: KEY });
  const cur =
    curRow?.value && typeof curRow.value === "object" ? { ...curRow.value } : {};
  const next = {
    ...cur,
    agenda_sugestoes: sanitizeAgendaSugestoes(agendaSugestoes),
  };
  const now = nowIso();
  await db.collection("app_kv").updateOne(
    { key: KEY },
    { $set: { key: KEY, value: next, updated_at: now } },
    { upsert: true },
  );
  return getPublicWorkspace(db);
}

/**
 * @param {import("mongodb").Db} db
 * @param {string} id
 */
export async function appendDismissedDestaque(db, id) {
  const sid = String(id || "").trim();
  if (!/^\d{1,18}$/.test(sid)) return getPublicWorkspace(db);
  const cur = await getPublicWorkspace(db);
  const ids = new Set(cur.evento_destaque_dismissed_ids);
  ids.add(sid);
  const merged = sanitizeDismissedIds([...ids]);
  const curRow = await db.collection("app_kv").findOne({ key: KEY });
  const base =
    curRow?.value && typeof curRow.value === "object" ? { ...curRow.value } : {};
  const now = nowIso();
  await db.collection("app_kv").updateOne(
    { key: KEY },
    {
      $set: {
        key: KEY,
        value: { ...base, evento_destaque_dismissed_ids: merged },
        updated_at: now,
      },
    },
    { upsert: true },
  );
  return getPublicWorkspace(db);
}
