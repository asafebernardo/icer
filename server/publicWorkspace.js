import { nowIso } from "./security.js";

const KEY = "public_workspace_v1";

const MAX_DISMISSED = 400;
const MAX_SUGESTAO_ITEM_LEN = 160;
const MAX_SUGESTAO_LIST = 80;
const MAX_AVATAR_URL_LEN = 2048;
const MAX_AVATAR_ENTRIES = 80;
const MAX_AGENDA_SIMPLE_LABEL = 48;

const DEFAULT_AGENDA_SIMPLE_GRID = {
  dia_column_label: "DIA",
  cultos_group_label: "CULTOS",
  manha_label: "MANHÃ",
  noite_label: "NOITE",
  reuniao_oracao_line1: "REUNIÃO",
  reuniao_oracao_line2: "ORAÇÃO",
  outras_line1: "OUTRAS",
  outras_line2: "REUNIÕES",
  culto_weekdays: [],
  oracao_weekdays: [],
};

function normWeekdayList(arr) {
  if (!Array.isArray(arr)) return [];
  const s = new Set();
  for (const x of arr) {
    const n = Number(x);
    if (Number.isInteger(n) && n >= 0 && n <= 6) s.add(n);
  }
  return [...s].sort((a, b) => a - b);
}

function sanitizeAgendaSimpleGrid(raw) {
  const base = { ...DEFAULT_AGENDA_SIMPLE_GRID };
  if (!raw || typeof raw !== "object") return base;
  const str = (v, fallback) => {
    const t = String(v ?? "")
      .trim()
      .slice(0, MAX_AGENDA_SIMPLE_LABEL);
    return t || fallback;
  };
  return {
    dia_column_label: str(raw.dia_column_label, base.dia_column_label),
    cultos_group_label: str(raw.cultos_group_label, base.cultos_group_label),
    manha_label: str(raw.manha_label, base.manha_label),
    noite_label: str(raw.noite_label, base.noite_label),
    reuniao_oracao_line1: str(raw.reuniao_oracao_line1, base.reuniao_oracao_line1),
    reuniao_oracao_line2: str(raw.reuniao_oracao_line2, base.reuniao_oracao_line2),
    outras_line1: str(raw.outras_line1, base.outras_line1),
    outras_line2: str(raw.outras_line2, base.outras_line2),
    culto_weekdays: normWeekdayList(raw.culto_weekdays),
    oracao_weekdays: normWeekdayList(raw.oracao_weekdays),
  };
}

function isSafePublicAssetUrl(u) {
  const s = String(u || "").trim();
  if (!s) return false;
  if (s.startsWith("/")) return true;
  if (s.startsWith("data:image/")) return true;
  try {
    const x = new URL(s);
    return x.protocol === "http:" || x.protocol === "https:";
  } catch {
    return false;
  }
}

/** Presets alinhados a `EVENT_CARD_COLOR_OPTIONS` no cliente. */
const TITULO_COR_BARRA_ALLOWED = new Set([
  "auto",
  "blue",
  "green",
  "purple",
  "pink",
  "orange",
  "yellow",
  "red",
  "indigo",
  "teal",
  "cyan",
  "slate",
]);

const MAX_BG_IMAGES_PER_TITLE = 8;

function sanitizeTituloImagensFundoMap(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  /** @type {Record<string, string[]>} */
  const out = {};
  for (const [tituloKey, val] of Object.entries(raw)) {
    const k = String(tituloKey ?? "").trim().slice(0, MAX_SUGESTAO_ITEM_LEN);
    if (!k) continue;
    /** @type {string[]} */
    const urls = [];
    if (Array.isArray(val)) {
      for (const u of val) {
        const s = String(u ?? "").trim().slice(0, MAX_AVATAR_URL_LEN);
        if (s && isSafePublicAssetUrl(s)) urls.push(s);
        if (urls.length >= MAX_BG_IMAGES_PER_TITLE) break;
      }
    } else if (typeof val === "string") {
      const s = val.trim().slice(0, MAX_AVATAR_URL_LEN);
      if (s && isSafePublicAssetUrl(s)) urls.push(s);
    }
    if (urls.length) out[k] = urls;
    if (Object.keys(out).length >= MAX_AVATAR_ENTRIES) break;
  }
  return out;
}

function sanitizeTituloCorBarraMap(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  /** @type {Record<string, string>} */
  const out = {};
  for (const [tituloKey, val] of Object.entries(raw)) {
    const k = String(tituloKey ?? "").trim().slice(0, MAX_SUGESTAO_ITEM_LEN);
    if (!k) continue;
    const preset = String(val ?? "").trim().toLowerCase();
    if (!TITULO_COR_BARRA_ALLOWED.has(preset)) continue;
    out[k] = preset;
    if (Object.keys(out).length >= MAX_SUGESTAO_LIST) break;
  }
  return out;
}

function sanitizeAvatarUrlMap(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  /** @type {Record<string, string>} */
  const out = {};
  for (const [name, url] of Object.entries(raw)) {
    const nk = String(name ?? "").trim().slice(0, MAX_SUGESTAO_ITEM_LEN);
    const u = String(url ?? "").trim().slice(0, MAX_AVATAR_URL_LEN);
    if (!nk || !u || !isSafePublicAssetUrl(u)) continue;
    out[nk] = u;
    if (Object.keys(out).length >= MAX_AVATAR_ENTRIES) break;
  }
  return out;
}

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
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const [k, v] of Object.entries(raw)) {
    const key = String(k || "").slice(0, 40);
    if (!key) continue;
    if (key === "preletor_avatars" || key === "pastor_avatars") {
      const av = sanitizeAvatarUrlMap(v);
      if (Object.keys(av).length) out[key] = av;
      continue;
    }
    if (key === "titulo_cor_barra") {
      const tc = sanitizeTituloCorBarraMap(v);
      if (Object.keys(tc).length) out[key] = tc;
      continue;
    }
    if (key === "titulo_imagens_fundo") {
      const ti = sanitizeTituloImagensFundoMap(v);
      if (Object.keys(ti).length) out[key] = ti;
      continue;
    }
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
    agenda_simple_grid: sanitizeAgendaSimpleGrid(v.agenda_simple_grid),
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
  if ("agenda_simple_grid" in patch) {
    next.agenda_simple_grid = sanitizeAgendaSimpleGrid(patch.agenda_simple_grid);
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
 * @param {Record<string, unknown>} agendaSimpleGrid
 */
export async function setAgendaSimpleGridEditor(db, agendaSimpleGrid) {
  const curRow = await db.collection("app_kv").findOne({ key: KEY });
  const cur =
    curRow?.value && typeof curRow.value === "object" ? { ...curRow.value } : {};
  const next = {
    ...cur,
    agenda_simple_grid: sanitizeAgendaSimpleGrid(agendaSimpleGrid),
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
