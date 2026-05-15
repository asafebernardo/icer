/** Slug reservado para o grupo predefinido «Admin» (seed no arranque). */
export const BUILTIN_ADMIN_GROUP_SLUG = "icer-builtin-admin";

/**
 * Mapa completo de menus → { create, edit, delete } com tudo permitido.
 * Alinhar com `menuPermissions` / UI de grupos.
 */
export function defaultGroupPermissionsMap() {
  const menus = [
    "home",
    "postagens",
    "recursos",
    "materiais_tab",
    "agenda",
    "eventos",
    "dashboard",
    "galeria",
  ];
  /** @type {Record<string, { create: boolean; edit: boolean; delete: boolean }>} */
  const o = {};
  for (const k of menus) {
    o[k] = { create: true, edit: true, delete: true };
  }
  return o;
}
