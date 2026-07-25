/** Pastel por aba: ícone no menu lateral / dropdown do admin. */
export const ADMIN_NAV_ITEM_ICON_TONE = {
  profile:
    "bg-sky-500/20 text-sky-800 shadow-sm shadow-sky-500/10 dark:bg-sky-500/30 dark:text-sky-50",
  site: "bg-emerald-500/20 text-emerald-900 shadow-sm shadow-emerald-500/10 dark:bg-emerald-500/30 dark:text-emerald-50",
  google:
    "bg-amber-500/25 text-amber-950 shadow-sm shadow-amber-500/15 dark:bg-amber-500/30 dark:text-amber-50",
  server:
    "bg-blue-500/20 text-blue-900 shadow-sm shadow-blue-500/10 dark:bg-blue-500/35 dark:text-blue-50",
  uploads:
    "bg-orange-500/22 text-orange-950 shadow-sm shadow-orange-500/10 dark:bg-orange-500/30 dark:text-orange-50",
  "cadastros-opcoes":
    "bg-orange-500/22 text-orange-950 shadow-sm shadow-orange-500/10 dark:bg-orange-500/30 dark:text-orange-50",
  "audit-log":
    "bg-slate-600/18 text-slate-800 shadow-sm dark:bg-slate-500/30 dark:text-slate-100",
  "pending-deletions":
    "bg-rose-500/18 text-rose-900 shadow-sm dark:bg-rose-500/30 dark:text-rose-50",
  "admin-users":
    "bg-violet-500/20 text-violet-900 shadow-sm shadow-violet-500/10 dark:bg-violet-500/30 dark:text-violet-50",
  "permission-groups":
    "bg-indigo-500/20 text-indigo-900 shadow-sm shadow-indigo-500/10 dark:bg-indigo-500/30 dark:text-indigo-50",
};

/** Marcador ao lado do título do grupo (Conta / Administração). */
export const ADMIN_NAV_GROUP_MARKER = {
  conta: "bg-sky-500 shadow-[0_0_0_3px] shadow-sky-500/25",
  administracao: "bg-indigo-500 shadow-[0_0_0_3px] shadow-indigo-500/25",
};

/** @param {string} tabId */
export function getAdminNavItemIconToneClass(tabId) {
  return (
    ADMIN_NAV_ITEM_ICON_TONE[tabId] ||
    "bg-muted text-muted-foreground shadow-inner dark:bg-muted/80"
  );
}

/** Itens extra do grupo Administração (fundidos na lista e ordenados por etiqueta). */
export const DEFAULT_EXTRA_ADMIN_NAV_ITEMS = [];

const ADMINISTRACAO_BASE_ITEMS = [
  { id: "admin-users", label: "Utilizadores", requiresServerAuth: true },
  { id: "permission-groups", label: "Grupos de permissão", requiresServerAuth: true },
  { id: "site", label: "Site", requiresServerAuth: true },
  {
    id: "google",
    label: "Google",
    requiresServerAuth: true,
  },
  { id: "server", label: "Servidor", requiresServerAuth: true },
  { id: "uploads", label: "Arquivos", requiresServerAuth: true },
  {
    id: "cadastros-opcoes",
    label: "Padrão",
    requiresServerAuth: true,
  },
  { id: "pending-deletions", label: "Eliminações", requiresServerAuth: true },
  { id: "audit-log", label: "Logs", requiresServerAuth: true },
];

/**
 * Grupos de navegação do painel admin (mesma ordem que o menu lateral).
 * @param {Array<{ id: string; label: string; requiresServerAuth?: boolean; comingSoon?: boolean; badge?: string }>} [extraAdminItems]
 */
export function getAdminNavGroups(extraAdminItems = DEFAULT_EXTRA_ADMIN_NAV_ITEMS) {
  const extra = (extraAdminItems || []).map((item) => ({
    id: item.id,
    label: item.label,
    requiresServerAuth: item.requiresServerAuth ?? false,
    ...(item.badge ? { badge: item.badge } : {}),
    ...(item.comingSoon ? { comingSoon: true } : {}),
  }));
  const fixedOrderIds = new Set(["admin-users", "permission-groups"]);
  const fixedHead = ADMINISTRACAO_BASE_ITEMS.filter((i) => fixedOrderIds.has(i.id));
  const restBase = ADMINISTRACAO_BASE_ITEMS.filter((i) => !fixedOrderIds.has(i.id));
  const administracaoItems = [
    ...fixedHead,
    ...[...restBase, ...extra].sort((a, b) =>
      a.label.localeCompare(b.label, "pt", { sensitivity: "base", numeric: true }),
    ),
  ];

  return [
    {
      id: "conta",
      label: "Conta",
      items: [{ id: "profile", label: "Minha conta" }],
    },
    {
      id: "administracao",
      label: "Administração",
      items: administracaoItems,
    },
  ];
}

/** IDs de abas selecionáveis para `?tab=` na rota /Admin (exclui itens `comingSoon`). */
export function getAdminTabIds(extraAdminItems = DEFAULT_EXTRA_ADMIN_NAV_ITEMS) {
  return new Set(
    getAdminNavGroups(extraAdminItems).flatMap((g) =>
      g.items.filter((i) => !i.comingSoon).map((i) => i.id),
    ),
  );
}

/** Abas de administração que exigem sessão no servidor (MongoDB). */
export function getLoginBlockedAdminNavItems(
  extraAdminItems = DEFAULT_EXTRA_ADMIN_NAV_ITEMS,
) {
  return getAdminNavGroups(extraAdminItems).flatMap((g) =>
    g.items.filter((item) => item.requiresServerAuth && !item.comingSoon),
  );
}

/**
 * @param {{
 *   isAdmin?: boolean;
 *   serverAuthEnabled?: boolean;
 *   authSource?: string | null;
 *   isHomolog?: boolean;
 *   isLoggedIn?: boolean;
 * }} p
 */
export function resolveAdminNavAccess(p = {}) {
  const isAdmin = p.isAdmin === true;
  const serverAuthEnabled = p.serverAuthEnabled === true;
  const authSource = p.authSource ?? null;
  const isHomolog = p.isHomolog === true;
  const isLoggedIn = p.isLoggedIn === true;
  const hasServerSession =
    isAdmin && serverAuthEnabled && authSource === "server";
  /** Homolog + admin autenticado: menus e painéis activos (dev/staging). */
  const homologAdminSession =
    isHomolog && isAdmin && isLoggedIn && serverAuthEnabled;
  return {
    isHomolog,
    hasServerSession,
    canUseAdminTabs: hasServerSession || homologAdminSession,
    canNavigateAdminTabs:
      isAdmin && (hasServerSession || isHomolog || isLoggedIn),
    showHomologLoginBlockedHints:
      isHomolog && isAdmin && isLoggedIn && !hasServerSession,
  };
}
