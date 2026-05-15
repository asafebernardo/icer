/**
 * Permissões por menu (criar/editar/apagar), espelho do `memberRegistry` no browser.
 * Armazenadas em `app_kv.menu_permissions` como JSON: { [permKey]: { [menuKey]: { create, edit, delete } } }.
 */

const KEY = "menu_permissions";

const DEFAULT_BLOCK = { create: true, edit: true, delete: true };

export function getMenuPermissionsBlob(db) {
  const row = db.prepare(`SELECT value FROM app_kv WHERE key = ?`).get(KEY);
  if (!row?.value) return {};
  try {
    const o = JSON.parse(row.value);
    return o && typeof o === "object" ? o : {};
  } catch {
    return {};
  }
}

export function setMenuPermissionsBlob(db, map) {
  const value = JSON.stringify(map && typeof map === "object" ? map : {});
  db.prepare(
    `INSERT INTO app_kv (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
  ).run(KEY, value);
}

/**
 * @param {{ id?: number, email?: string, role?: string }} user
 * @param {"create"|"edit"|"delete"} action
 */
export function menuActionAllowed(db, user, menuKey, action) {
  if (!user || typeof user !== "object") return false;
  if (user.role === "admin") return true;
  if (action !== "create" && action !== "edit" && action !== "delete") {
    return false;
  }
  const map = getMenuPermissionsBlob(db);
  const idKey = user.id != null ? String(user.id) : "";
  const emailKey = String(user.email || "")
    .toLowerCase()
    .trim();
  const block =
    (idKey && map[idKey]?.[menuKey]) ||
    (emailKey && map[emailKey]?.[menuKey]) ||
    null;
  if (!block || typeof block !== "object") {
    return !!DEFAULT_BLOCK[action];
  }
  const v = block[action];
  if (v === false) return false;
  if (v === true) return true;
  return !!DEFAULT_BLOCK[action];
}

/** Mapa menu → { create, edit, delete } para a sessão atual (UI). */
export function effectiveMenuPermissions(db, user) {
  const keys = [
    "home",
    "postagens",
    "recursos",
    "agenda",
    "eventos",
    "dashboard",
    "galeria",
    "materiais_tab",
  ];
  const out = {};
  for (const k of keys) {
    out[k] = {
      create: menuActionAllowed(db, user, k, "create"),
      edit: menuActionAllowed(db, user, k, "edit"),
      delete: menuActionAllowed(db, user, k, "delete"),
    };
  }
  return out;
}
