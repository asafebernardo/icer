/**
 * Metadados locais de membros (último login) e permissões CRUD por menu.
 * Complementa dados da API quando necessário.
 */

import { isServerAuthEnabled } from "@/lib/serverAuth";

const META_KEY = "icer_user_meta";
const PERMS_KEY = "icer_member_permissions";

/** Menus do site com permissões granulares (criar / editar / deletar) */
export const SITE_MENUS = [
  { key: "home", label: "Início" },
  { key: "postagens", label: "Postagens" },
  { key: "recursos", label: "Recursos" },
  { key: "agenda", label: "Agenda" },
  { key: "eventos", label: "Eventos" },
  { key: "dashboard", label: "Minha área" },
  { key: "galeria", label: "Galeria" },
  { key: "materiais_tab", label: "Materiais" },
];

const DASHBOARD_MENUS_STORAGE_KEY = "icer_dashboard_site_menus";

/** Em modo servidor, espelho em memória (carregado a partir de `/api/public-workspace`). */
let serverPermissionsMirror = null;

/** Em modo servidor, lista de menus do painel (se existir no workspace). */
let serverDashboardMenusMirror = null;

/**
 * Chamado após `GET /api/public-workspace` para alinhar caches em memória.
 * @param {Record<string, unknown> | null | undefined} workspace
 */
export function hydrateMemberRegistryFromPublicWorkspace(workspace) {
  if (!isServerAuthEnabled() || !workspace || typeof workspace !== "object") {
    return;
  }
  if (Array.isArray(workspace.dashboard_site_menus)) {
    serverDashboardMenusMirror = workspace.dashboard_site_menus.map((m) => ({
      key: String(m.key || ""),
      label: String(m.label || ""),
    }));
  }
}

/** Lista usada na tabela de permissões (pode ser personalizada no Dashboard). */
export function getDashboardMenus() {
  if (isServerAuthEnabled()) {
    if (
      Array.isArray(serverDashboardMenusMirror) &&
      serverDashboardMenusMirror.length > 0
    ) {
      return serverDashboardMenusMirror.map((m) => ({ ...m }));
    }
    return SITE_MENUS.map((m) => ({ ...m }));
  }
  try {
    const raw = localStorage.getItem(DASHBOARD_MENUS_STORAGE_KEY);
    if (!raw) return SITE_MENUS.map((m) => ({ ...m }));
    const parsed = JSON.parse(raw);
    if (
      Array.isArray(parsed) &&
      parsed.length > 0 &&
      parsed.every(
        (m) =>
          m &&
          typeof m.key === "string" &&
          m.key.length > 0 &&
          typeof m.label === "string",
      )
    ) {
      return parsed.map((m) => ({ key: m.key, label: m.label }));
    }
  } catch {
    /* ignore */
  }
  return SITE_MENUS.map((m) => ({ ...m }));
}

export function setDashboardMenus(menus) {
  const list = Array.isArray(menus) ? menus : [];
  if (isServerAuthEnabled()) {
    serverDashboardMenusMirror = list.map((m) => ({
      key: String(m.key || ""),
      label: String(m.label || ""),
    }));
  } else {
    localStorage.setItem(DASHBOARD_MENUS_STORAGE_KEY, JSON.stringify(list));
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("icer-dashboard-menus"));
  }
}

export function resetDashboardMenusToDefault() {
  if (isServerAuthEnabled()) {
    serverDashboardMenusMirror = null;
  } else {
    localStorage.removeItem(DASHBOARD_MENUS_STORAGE_KEY);
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("icer-dashboard-menus"));
  }
}

export function permKeyForUser(user) {
  if (user == null) return "";
  if (user._permKey) return String(user._permKey);
  if (user.id != null && user.id !== "") return String(user.id);
  return String(user.email || "");
}

export function getUserMetaMap() {
  if (isServerAuthEnabled()) {
    return {};
  }
  try {
    return JSON.parse(localStorage.getItem(META_KEY) || "{}");
  } catch {
    return {};
  }
}

/** Regista último acesso (por id e/ou e-mail). */
export function recordMemberLogin(user) {
  if (!user) return;
  if (isServerAuthEnabled()) {
    return;
  }
  const map = getUserMetaMap();
  const now = new Date().toISOString();
  const keys = new Set();
  if (user.id != null && user.id !== "") keys.add(String(user.id));
  if (user.email) keys.add(String(user.email));
  keys.forEach((k) => {
    map[k] = { ...(map[k] || {}), lastLogin: now };
  });
  localStorage.setItem(META_KEY, JSON.stringify(map));
}

export function getMemberPermissions() {
  if (isServerAuthEnabled()) {
    return serverPermissionsMirror &&
      typeof serverPermissionsMirror === "object"
      ? serverPermissionsMirror
      : {};
  }
  try {
    return JSON.parse(localStorage.getItem(PERMS_KEY) || "{}");
  } catch {
    return {};
  }
}

export function setMemberPermissions(all) {
  const next = all && typeof all === "object" ? all : {};
  if (isServerAuthEnabled()) {
    serverPermissionsMirror = next;
  } else {
    localStorage.setItem(PERMS_KEY, JSON.stringify(next));
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("icer-member-permissions"));
  }
}

/**
 * Permissões por menu. Por omissão, utilizadores têm criar / editar / apagar
 * em todos os menus; só valores explicitamente guardados (ex.: false) alteram isso.
 */
export function getMenuPermBlock(perms, userKey, menuKey) {
  const defaults = { create: true, edit: true, delete: true };
  const m = perms[userKey]?.[menuKey];
  if (m == null || typeof m !== "object") {
    return { ...defaults };
  }
  return {
    create: m.create !== undefined ? !!m.create : defaults.create,
    edit: m.edit !== undefined ? !!m.edit : defaults.edit,
    delete: m.delete !== undefined ? !!m.delete : defaults.delete,
  };
}

/**
 * Quando o e-mail de um membro muda (conta local), migra chaves de permissões e meta.
 */
export function migrateMemberStorageForEmailChange(oldEmail, newEmail, userId) {
  const oe = String(oldEmail || "").toLowerCase().trim();
  const ne = String(newEmail || "").toLowerCase().trim();
  if (!oe || !ne || oe === ne) return;
  if (isServerAuthEnabled()) {
    return;
  }

  const perms = getMemberPermissions();
  if (perms[oe]) {
    const nextPerms = { ...perms };
    if (!nextPerms[ne]) {
      nextPerms[ne] = { ...perms[oe] };
    }
    delete nextPerms[oe];
    setMemberPermissions(nextPerms);
  }

  const map = getUserMetaMap();
  if (map[oe]) {
    const merged = { ...(map[ne] || {}), ...map[oe] };
    const nextMap = { ...map };
    delete nextMap[oe];
    nextMap[ne] = merged;
    if (userId != null && String(userId) !== "") {
      nextMap[String(userId)] = {
        ...(nextMap[String(userId)] || {}),
        ...merged,
      };
    }
    localStorage.setItem(META_KEY, JSON.stringify(nextMap));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("icer-member-permissions"));
    }
  }
}
