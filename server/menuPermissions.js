/**
 * Permissões por menu (criar/editar/apagar).
 * - Mapa legado em `app_kv.menu_permissions` (chave = id ou e-mail do utilizador).
 * - Grupos em `permission_groups` + campo `permission_group_id` no utilizador:
 *   quando definido, só as permissões do grupo contam (ignora o mapa legado para esse utilizador).
 */

const KEY = "menu_permissions";

const DEFAULT_BLOCK = { create: true, edit: true, delete: true };

/**
 * @param {import("mongodb").Db} db
 */
export async function getMenuPermissionsBlob(db) {
  const row = await db.collection("app_kv").findOne({ key: KEY });
  if (!row?.value) return {};
  try {
    const o = JSON.parse(row.value);
    return o && typeof o === "object" ? o : {};
  } catch {
    return {};
  }
}

/**
 * @param {import("mongodb").Db} db
 */
export async function setMenuPermissionsBlob(db, map) {
  const value = JSON.stringify(map && typeof map === "object" ? map : {});
  await db.collection("app_kv").updateOne(
    { key: KEY },
    { $set: { key: KEY, value } },
    { upsert: true },
  );
}

/**
 * Cache por pedido: evita N leituras Mongo em `effectiveMenuPermissions`.
 * @param {import("mongodb").Db} db
 * @param {{ id?: number, email?: string, role?: string }} user
 */
export async function buildPermissionCache(db, user) {
  if (!user || typeof user !== "object") {
    return {
      isAdmin: false,
      groupPerms: null,
      legacyMap: await getMenuPermissionsBlob(db),
    };
  }
  if (user.role === "admin") {
    return { isAdmin: true, groupPerms: null, legacyMap: null };
  }
  const legacyMap = await getMenuPermissionsBlob(db);
  let groupPerms = null;
  const row = await db.collection("users").findOne(
    { id: user.id },
    { projection: { permission_group_id: 1 } },
  );
  if (row?.permission_group_id != null) {
    const g = await db.collection("permission_groups").findOne(
      { id: row.permission_group_id },
      { projection: { permissions: 1 } },
    );
    if (g?.permissions && typeof g.permissions === "object") {
      groupPerms = g.permissions;
    }
  }
  return { isAdmin: false, groupPerms, legacyMap };
}

/**
 * @param {{ isAdmin: boolean, groupPerms: object|null, legacyMap: object|null }} cache
 * @param {{ id?: number, email?: string, role?: string }} user
 * @param {string} menuKey
 * @param {"create"|"edit"|"delete"} action
 */
function resolveMenuActionFromCache(cache, user, menuKey, action) {
  if (!user || typeof user !== "object") return false;
  if (cache.isAdmin) return true;
  if (action !== "create" && action !== "edit" && action !== "delete") {
    return false;
  }

  const fromBlock = (block) => {
    if (!block || typeof block !== "object") {
      return !!DEFAULT_BLOCK[action];
    }
    const v = block[action];
    if (v === false) return false;
    if (v === true) return true;
    return !!DEFAULT_BLOCK[action];
  };

  const fromGroupMenu = (mk) => {
    if (cache.groupPerms == null) return null;
    const block = cache.groupPerms[mk];
    if (block === undefined || block === null) {
      return !!DEFAULT_BLOCK[action];
    }
    return fromBlock(block);
  };

  const fromLegacyMenu = (mk) => {
    const map = cache.legacyMap || {};
    const idKey = user.id != null ? String(user.id) : "";
    const emailKey = String(user.email || "")
      .toLowerCase()
      .trim();
    const block =
      (idKey && map[idKey]?.[mk]) ||
      (emailKey && map[emailKey]?.[mk]) ||
      null;
    return fromBlock(block);
  };

  if (cache.groupPerms != null) {
    if (menuKey === "recursos") {
      const a = fromGroupMenu("recursos");
      if (a) return true;
      return !!fromGroupMenu("materiais_tab");
    }
    return !!fromGroupMenu(menuKey);
  }

  if (menuKey === "recursos") {
    const a = fromLegacyMenu("recursos");
    if (a) return true;
    return !!fromLegacyMenu("materiais_tab");
  }
  return !!fromLegacyMenu(menuKey);
}

/**
 * @param {import("mongodb").Db} db
 * @param {{ id?: number, email?: string, role?: string }} user
 * @param {string} menuKey
 * @param {"create"|"edit"|"delete"} action
 */
export async function menuActionAllowed(db, user, menuKey, action) {
  const cache = await buildPermissionCache(db, user);
  return resolveMenuActionFromCache(cache, user, menuKey, action);
}

/** Mapa menu → { create, edit, delete } para a sessão atual (UI). */
export async function effectiveMenuPermissions(db, user) {
  const keys = [
    "home",
    "postagens",
    "recursos",
    "agenda",
    "eventos",
    "dashboard",
    "galeria",
  ];
  const cache = await buildPermissionCache(db, user);
  const out = {};
  for (const k of keys) {
    out[k] = {
      create: resolveMenuActionFromCache(cache, user, k, "create"),
      edit: resolveMenuActionFromCache(cache, user, k, "edit"),
      delete: resolveMenuActionFromCache(cache, user, k, "delete"),
    };
  }
  return out;
}
